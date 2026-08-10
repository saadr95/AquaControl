import { useCallback, useEffect, useRef, useState } from 'react'
import mqtt from 'mqtt'
import {
  MQTT_URL,
  TOPIC_STATUS_WILDCARD,
  TOPIC_ALERTS_WILDCARD,
  topicCommands,
  HISTORY_KEY,
  ALERTS_KEY,
  LAST_STATUS_KEY,
  SELECTED_DEVICE_KEY,
  HISTORY_WINDOW_MS,
  MAX_ALERTS,
  MIN_VALID_EPOCH_S,
} from '../config'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — drop silently, not critical
  }
}

// Firmware sends unix seconds once NTP has synced; before that (or if the
// field is missing) fall back to the browser's own clock.
function resolveTimestampMs(epochSeconds) {
  if (typeof epochSeconds === 'number' && epochSeconds > MIN_VALID_EPOCH_S) {
    return epochSeconds * 1000
  }
  return Date.now()
}

// Topics look like "aquacontrol/<device_id>/status" — pull the id out.
function deviceIdFromTopic(topic) {
  const parts = topic.split('/')
  return parts.length >= 3 ? parts[1] : null
}

export function useMqtt() {
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)

  // Keyed by device id, so any number of boards can be tracked at once.
  const [statuses, setStatuses] = useState(() => loadJSON(LAST_STATUS_KEY, {}))
  const [lastSeenAt, setLastSeenAt] = useState({})
  const [alertsByDevice, setAlertsByDevice] = useState(() => loadJSON(ALERTS_KEY, {}))
  const [historyByDevice, setHistoryByDevice] = useState(() => loadJSON(HISTORY_KEY, {}))
  const [selectedDeviceId, setSelectedDeviceIdState] = useState(
    () => localStorage.getItem(SELECTED_DEVICE_KEY) || null
  )

  const setSelectedDeviceId = useCallback((id) => {
    setSelectedDeviceIdState(id)
    localStorage.setItem(SELECTED_DEVICE_KEY, id)
  }, [])

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: 'aquacontrol_web_' + Math.random().toString(16).slice(2, 10),
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    })
    clientRef.current = client

    client.on('connect', () => {
      setConnected(true)
      client.subscribe([TOPIC_STATUS_WILDCARD, TOPIC_ALERTS_WILDCARD])
    })
    client.on('reconnect', () => setConnected(false))
    client.on('close', () => setConnected(false))
    client.on('offline', () => setConnected(false))
    client.on('error', () => setConnected(false))

    client.on('message', (topic, payload) => {
      const deviceId = deviceIdFromTopic(topic)
      if (!deviceId) return

      let data
      try {
        data = JSON.parse(payload.toString())
      } catch {
        return
      }

      if (topic.endsWith('/status')) {
        setStatuses((prev) => {
          const next = { ...prev, [deviceId]: data }
          saveJSON(LAST_STATUS_KEY, next)
          return next
        })
        setLastSeenAt((prev) => ({ ...prev, [deviceId]: Date.now() }))

        // Auto-select the first device seen if nothing's picked yet.
        setSelectedDeviceIdState((current) => {
          if (current) return current
          localStorage.setItem(SELECTED_DEVICE_KEY, deviceId)
          return deviceId
        })

        const ts = resolveTimestampMs(data.timestamp)
        setHistoryByDevice((prev) => {
          const list = prev[deviceId] || []
          const nextList = [...list, { t: ts, u: data.underground_pct, r: data.roof_pct }]
          const cutoff = Date.now() - HISTORY_WINDOW_MS
          const pruned = nextList.filter((p) => p.t >= cutoff)
          const next = { ...prev, [deviceId]: pruned }
          saveJSON(HISTORY_KEY, next)
          return next
        })
      }

      if (topic.endsWith('/alerts')) {
        const entry = {
          message: typeof data.message === 'string' ? data.message : JSON.stringify(data),
          timestamp: resolveTimestampMs(data.timestamp),
        }
        setAlertsByDevice((prev) => {
          const list = prev[deviceId] || []
          const nextList = [entry, ...list].slice(0, MAX_ALERTS)
          const next = { ...prev, [deviceId]: nextList }
          saveJSON(ALERTS_KEY, next)
          return next
        })
      }
    })

    return () => {
      client.end(true)
    }
  }, [])

  const publishCommand = useCallback(
    (cmd) => {
      const client = clientRef.current
      if (!client || !client.connected || !selectedDeviceId) return
      client.publish(topicCommands(selectedDeviceId), JSON.stringify({ cmd }))
    },
    [selectedDeviceId]
  )

  const deviceIds = Object.keys(statuses)

  return {
    connected,
    deviceIds,
    statuses,
    selectedDeviceId,
    setSelectedDeviceId,
    status: selectedDeviceId ? statuses[selectedDeviceId] ?? null : null,
    lastStatusAt: selectedDeviceId ? lastSeenAt[selectedDeviceId] ?? null : null,
    alerts: selectedDeviceId ? alertsByDevice[selectedDeviceId] ?? [] : [],
    history: selectedDeviceId ? historyByDevice[selectedDeviceId] ?? [] : [],
    publishCommand,
  }
}
