import 'dotenv/config'
import { readFileSync } from 'fs'
import mqtt from 'mqtt'
import admin from 'firebase-admin'

// ═══════════════════════════════════════════════════════════════════
// AquaControl bridge — the one trusted service that talks to MQTT.
//
// Three jobs:
//   1. Mirror status/alerts from MQTT into Firestore (throttled — see
//      below — so Firestore write volume doesn't scale with MQTT's 5s
//      publish rate as the fleet grows).
//   2. Relay commands the other way: watches every device's
//      pending_commands subcollection, forwards new ones to MQTT.
//   3. Push a notification (via FCM) for each alert, scoped to a
//      per-device topic so a customer's phone only ever gets pushes for
//      devices they actually own.
//
// Firestore access rules (firestore/firestore.rules) don't apply here —
// the Admin SDK bypasses them by design, since this is the trusted writer.
// ═══════════════════════════════════════════════════════════════════

const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883'
const MQTT_USERNAME = process.env.MQTT_USERNAME || ''
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || ''
const TOPIC_STATUS = 'aquacontrol/+/status'
const TOPIC_ALERTS = 'aquacontrol/+/alerts'
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'

// How often a given device's status is actually committed to Firestore,
// regardless of how often it arrives over MQTT (every 5s per the
// firmware). At 2 devices every 5s that's ~34k writes/day just for
// status — already over Firestore's free-tier 20k/day budget. This caps
// it independent of fleet size.
const STATUS_FLUSH_MS = 15000
// Tank-level history points, for the 24h chart — doesn't need anywhere
// near 5s resolution, and at 5s intervals it would be the single biggest
// source of write volume by far as the fleet grows.
const HISTORY_INTERVAL_MS = 5 * 60 * 1000

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const client = mqtt.connect(MQTT_URL, {
  clientId: 'aquacontrol_bridge_' + Math.random().toString(16).slice(2),
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  reconnectPeriod: 5000,
})

client.on('connect', () => {
  console.log('[bridge] MQTT connected — subscribing to status + alerts')
  client.subscribe([TOPIC_STATUS, TOPIC_ALERTS])
})
client.on('reconnect', () => console.log('[bridge] MQTT reconnecting...'))
client.on('close', () => console.log('[bridge] MQTT connection closed'))
client.on('error', (err) => console.error('[bridge] MQTT error:', err.message))

function deviceIdFromTopic(topic) {
  const parts = topic.split('/')
  return parts.length >= 3 ? parts[1] : null
}

// ── Status: buffer in memory, flush on a timer (per device) ─────────
const pendingStatus = new Map() // deviceId -> latest status object
const lastFlushAt = new Map() // deviceId -> ms timestamp
const lastHistoryAt = new Map() // deviceId -> ms timestamp

async function ensureDeviceDoc(deviceId, status) {
  const ref = db.collection('devices').doc(deviceId)
  const snap = await ref.get()
  if (snap.exists) return ref

  console.log('[bridge] New device seen, auto-registering:', deviceId)
  await ref.set({
    ownerUid: null,
    claimed: false,
    claimedAt: null,
    internalLabel: '',
    customerName: status.device_name || `Board-${deviceId}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  return ref
}

async function flushStatus(deviceId) {
  const status = pendingStatus.get(deviceId)
  if (!status) return
  pendingStatus.delete(deviceId)
  lastFlushAt.set(deviceId, Date.now())

  const ref = await ensureDeviceDoc(deviceId, status)
  await ref.update({
    status,
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  const now = Date.now()
  const lastHist = lastHistoryAt.get(deviceId) || 0
  if (now - lastHist >= HISTORY_INTERVAL_MS) {
    lastHistoryAt.set(deviceId, now)
    await ref.collection('history').add({
      t: admin.firestore.FieldValue.serverTimestamp(),
      u: status.underground_pct,
      r: status.roof_pct,
    })
  }
}

setInterval(() => {
  for (const deviceId of pendingStatus.keys()) {
    const last = lastFlushAt.get(deviceId) || 0
    if (Date.now() - last >= STATUS_FLUSH_MS) flushStatus(deviceId).catch((e) => console.error('[bridge] status flush failed:', deviceId, e.message))
  }
}, 2000)

// ── Alerts: write immediately (low volume, event-driven) + push ─────
async function handleAlert(deviceId, data) {
  const ref = await ensureDeviceDoc(deviceId, data)
  await ref.collection('alerts').add({
    message: typeof data.message === 'string' ? data.message : JSON.stringify(data),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })

  const boardLabel = data.device_name || deviceId
  const body = typeof data.message === 'string' ? data.message : JSON.stringify(data)

  // Per-device FCM topic — only phones that have this specific device
  // claimed subscribe to it (see AquaControlApp/src/notifications.ts),
  // so a push about one customer's board never reaches another's phone.
  const message = {
    topic: `aquacontrol_alerts_${deviceId}`,
    notification: { title: `AquaControl — ${boardLabel}`, body },
    data: { device_id: deviceId, timestamp: String(data.timestamp || Math.floor(Date.now() / 1000)) },
    android: { priority: 'high', notification: { channelId: 'aquacontrol-alerts' } },
  }

  try {
    const id = await admin.messaging().send(message)
    console.log('[bridge] Push sent:', id, '—', body)
  } catch (err) {
    // "not found" here just means nobody's subscribed to this device's
    // topic yet (unclaimed, or claimed but app hasn't opened) — not an error.
    if (err.code !== 'messaging/registration-token-not-registered') {
      console.error('[bridge] FCM send failed:', err.message)
    }
  }
}

client.on('message', (topic, payload) => {
  const deviceId = deviceIdFromTopic(topic)
  if (!deviceId) return

  let data
  try {
    data = JSON.parse(payload.toString())
  } catch {
    console.warn('[bridge] Ignoring non-JSON payload on', topic)
    return
  }

  if (topic.endsWith('/status')) {
    pendingStatus.set(deviceId, data)
  } else if (topic.endsWith('/alerts')) {
    handleAlert(deviceId, data).catch((e) => console.error('[bridge] alert handling failed:', deviceId, e.message))
  }
})

// ── Commands: relay pending_commands (any device) back to MQTT ──────
db.collectionGroup('pending_commands').onSnapshot(
  (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') continue
      const doc = change.doc
      const deviceId = doc.ref.parent.parent.id
      const cmd = doc.data()

      console.log('[bridge] Relaying command to', deviceId, ':', JSON.stringify(cmd))
      client.publish(`aquacontrol/${deviceId}/commands`, JSON.stringify(cmd))
      doc.ref.delete().catch((e) => console.error('[bridge] failed to clean up command doc:', e.message))
    }
  },
  (err) => console.error('[bridge] pending_commands listener error:', err.message)
)

process.on('SIGINT', () => {
  client.end()
  process.exit(0)
})
