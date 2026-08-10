import { useCallback, useEffect, useRef, useState } from 'react'
import mqtt, { MqttClient } from 'mqtt'
import AsyncStorage from '@react-native-async-storage/async-storage'
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

export type Status = {
  device_id: string
  device_name: string
  fw_version: string
  underground_pct: number
  roof_pct: number
  grid: boolean
  ac_variation: number
  pump: boolean
  valve: boolean
  flow: boolean
  flow_rate_lpm: number
  waiting_permission: boolean
  pending_action: string
  mode: 'AUTO' | 'MANUAL'
  state: string
  timestamp: number
}

export type Alert = { message: string; timestamp: number }
export type HistoryPoint = { t: number; u: number; r: number }

type ByDevice<T> = Record<string, T>

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {})
}

// Firmware sends unix seconds once NTP has synced; before that (or if the
// field is missing) fall back to the device's own clock.
function resolveTimestampMs(epochSeconds?: number) {
  if (typeof epochSeconds === 'number' && epochSeconds > MIN_VALID_EPOCH_S) {
    return epochSeconds * 1000
  }
  return Date.now()
}

// Topics look like "aquacontrol/<device_id>/status" — pull the id out.
function deviceIdFromTopic(topic: string): string | null {
  const parts = topic.split('/')
  return parts.length >= 3 ? parts[1] : null
}

export function useMqtt() {
  const clientRef = useRef<MqttClient | null>(null)
  const [connected, setConnected] = useState(false)

  const [statuses, setStatuses] = useState<ByDevice<Status>>({})
  const [lastSeenAt, setLastSeenAt] = useState<ByDevice<number>>({})
  const [alertsByDevice, setAlertsByDevice] = useState<ByDevice<Alert[]>>({})
  const [historyByDevice, setHistoryByDevice] = useState<ByDevice<HistoryPoint[]>>({})
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(null)

  const [hydrated, setHydrated] = useState(false)
  const [connectSeq, setConnectSeq] = useState(0) // bump to force a fresh connection

  const setSelectedDeviceId = useCallback((id: string) => {
    setSelectedDeviceIdState(id)
    saveJSON(SELECTED_DEVICE_KEY, id)
  }, [])

  // Load cached state before the socket connects, so the UI shows "last
  // known" data immediately — including fully offline on cold start.
  useEffect(() => {
    ;(async () => {
      const [cachedStatuses, cachedAlerts, cachedHistory, cachedSelected] = await Promise.all([
        loadJSON<ByDevice<Status>>(LAST_STATUS_KEY, {}),
        loadJSON<ByDevice<Alert[]>>(ALERTS_KEY, {}),
        loadJSON<ByDevice<HistoryPoint[]>>(HISTORY_KEY, {}),
        loadJSON<string | null>(SELECTED_DEVICE_KEY, null),
      ])
      setStatuses(cachedStatuses)
      setAlertsByDevice(cachedAlerts)
      setHistoryByDevice(cachedHistory)
      setSelectedDeviceIdState(cachedSelected)
      setHydrated(true)
    })()
  }, [])

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: 'aquacontrol_app_' + Math.random().toString(16).slice(2, 10),
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

      let data: Record<string, unknown>
      try {
        data = JSON.parse(payload.toString())
      } catch {
        return
      }

      if (topic.endsWith('/status')) {
        const s = data as unknown as Status
        setStatuses((prev) => {
          const next = { ...prev, [deviceId]: s }
          saveJSON(LAST_STATUS_KEY, next)
          return next
        })
        setLastSeenAt((prev) => ({ ...prev, [deviceId]: Date.now() }))

        // Auto-select the first device seen if nothing's picked yet.
        setSelectedDeviceIdState((current) => {
          if (current) return current
          saveJSON(SELECTED_DEVICE_KEY, deviceId)
          return deviceId
        })

        const ts = resolveTimestampMs(s.timestamp)
        setHistoryByDevice((prev) => {
          const list = prev[deviceId] || []
          const nextList = [...list, { t: ts, u: s.underground_pct, r: s.roof_pct }]
          const cutoff = Date.now() - HISTORY_WINDOW_MS
          const pruned = nextList.filter((p) => p.t >= cutoff)
          const next = { ...prev, [deviceId]: pruned }
          saveJSON(HISTORY_KEY, next)
          return next
        })
      }

      if (topic.endsWith('/alerts')) {
        const entry: Alert = {
          message: typeof data.message === 'string' ? (data.message as string) : JSON.stringify(data),
          timestamp: resolveTimestampMs(data.timestamp as number | undefined),
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
  }, [connectSeq])

  const publishCommand = useCallback(
    (cmd: string) => {
      const client = clientRef.current
      if (!client || !client.connected || !selectedDeviceId) return
      client.publish(topicCommands(selectedDeviceId), JSON.stringify({ cmd }))
    },
    [selectedDeviceId]
  )

  // Tears down and re-establishes the connection — used by pull-to-refresh.
  const reconnect = useCallback(() => {
    setConnectSeq((n) => n + 1)
  }, [])

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
    reconnect,
    hydrated,
  }
}
