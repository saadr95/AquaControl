import { readFileSync } from 'fs'
import mqtt from 'mqtt'
import admin from 'firebase-admin'

const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883'
// Wildcard (+) matches any board's device ID, so one relay covers the
// whole fleet — aquacontrol/<device_id>/alerts for every board at once.
const TOPIC_ALERTS = process.env.MQTT_TOPIC_ALERTS || 'aquacontrol/+/alerts'
const FCM_TOPIC = process.env.FCM_TOPIC || 'aquacontrol_alerts'
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const client = mqtt.connect(MQTT_URL, {
  clientId: 'aquacontrol_relay_' + Math.random().toString(16).slice(2),
  reconnectPeriod: 5000,
})

client.on('connect', () => {
  console.log('[relay] MQTT connected — subscribing to', TOPIC_ALERTS)
  client.subscribe(TOPIC_ALERTS)
})

client.on('reconnect', () => console.log('[relay] MQTT reconnecting...'))
client.on('close', () => console.log('[relay] MQTT connection closed'))
client.on('error', (err) => console.error('[relay] MQTT error:', err.message))

client.on('message', async (topic, payload) => {
  let data
  try {
    data = JSON.parse(payload.toString())
  } catch {
    console.warn('[relay] Ignoring non-JSON alert payload:', payload.toString())
    return
  }

  const boardLabel = data.device_name || data.device_id || ''
  const body = typeof data.message === 'string' ? data.message : JSON.stringify(data)
  const title = boardLabel ? `AquaControl — ${boardLabel}` : 'AquaControl'

  const message = {
    topic: FCM_TOPIC,
    notification: {
      title,
      body,
    },
    data: {
      device_id: String(data.device_id || ''),
      timestamp: String(data.timestamp || Math.floor(Date.now() / 1000)),
    },
    android: {
      priority: 'high',
      notification: { channelId: 'aquacontrol-alerts' },
    },
  }

  try {
    const id = await admin.messaging().send(message)
    console.log('[relay] Push sent:', id, '—', body)
  } catch (err) {
    console.error('[relay] FCM send failed:', err.message)
  }
})

process.on('SIGINT', () => {
  client.end()
  process.exit(0)
})
