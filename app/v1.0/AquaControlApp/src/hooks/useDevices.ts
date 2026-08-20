import { useCallback, useEffect, useState } from 'react'
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'
import type { FirebaseAuthTypes } from '@react-native-firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SELECTED_DEVICE_KEY, MAX_ALERTS, HISTORY_WINDOW_MS } from '../config'
import type { Role } from './useAuth'

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

export type DeviceDoc = {
  id: string
  ownerUid: string | null
  claimed: boolean
  internalLabel?: string
  customerName?: string
  status?: Status
}

// Firestore replaces MQTT as far as the app is concerned — this hook is the
// direct successor to the old useMqtt.ts. All actual MQTT traffic now goes
// through the bridge service (mqtt-fcm-relay), which is the only thing with
// real broker credentials.
export function useDevices(user: FirebaseAuthTypes.User | null, role: Role | null) {
  const [devices, setDevices] = useState<DeviceDoc[]>([])
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [claimError, setClaimError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // Restore the last-selected device id from disk before the first snapshot lands.
  useEffect(() => {
    AsyncStorage.getItem(SELECTED_DEVICE_KEY).then((id) => {
      setSelectedDeviceIdState(id)
      setHydrated(true)
    })
  }, [])

  const setSelectedDeviceId = useCallback((id: string) => {
    setSelectedDeviceIdState(id)
    AsyncStorage.setItem(SELECTED_DEVICE_KEY, id).catch(() => {})
  }, [])

  // ── Device list — all devices for admins, only owned ones for customers ──
  useEffect(() => {
    if (!user || !hydrated) return
    const base = firestore().collection('devices')
    const query = role === 'admin' ? base : base.where('ownerUid', '==', user.uid)

    return query.onSnapshot((snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as DeviceDoc[]
      setDevices(list)
      setSelectedDeviceIdState((current) => {
        if (current && list.some((d) => d.id === current)) return current
        const first = list[0]?.id || null
        if (first) AsyncStorage.setItem(SELECTED_DEVICE_KEY, first).catch(() => {})
        return first
      })
    })
  }, [user, role, hydrated])

  // ── Alerts for the selected device only (avoid a listener per device) ──
  useEffect(() => {
    if (!selectedDeviceId) {
      setAlerts([])
      return
    }
    return firestore()
      .collection('devices')
      .doc(selectedDeviceId)
      .collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(MAX_ALERTS)
      .onSnapshot((snapshot) => {
        setAlerts(
          snapshot.docs.map((d) => {
            const data = d.data() as { message: string; timestamp?: FirebaseFirestoreTypes.Timestamp }
            return { message: data.message, timestamp: data.timestamp?.toMillis?.() ?? Date.now() }
          })
        )
      })
  }, [selectedDeviceId])

  // ── Tank history for the selected device only ──
  useEffect(() => {
    if (!selectedDeviceId) {
      setHistory([])
      return
    }
    const cutoff = firestore.Timestamp.fromMillis(Date.now() - HISTORY_WINDOW_MS)
    return firestore()
      .collection('devices')
      .doc(selectedDeviceId)
      .collection('history')
      .orderBy('t', 'asc')
      .where('t', '>=', cutoff)
      .onSnapshot((snapshot) => {
        setHistory(
          snapshot.docs.map((d) => {
            const data = d.data() as { t?: FirebaseFirestoreTypes.Timestamp; u: number; r: number }
            return { t: data.t?.toMillis?.() ?? Date.now(), u: data.u, r: data.r }
          })
        )
      })
  }, [selectedDeviceId])

  const publishCommand = useCallback(
    async (cmd: string, extra: Record<string, unknown> = {}) => {
      if (!selectedDeviceId) return
      await firestore()
        .collection('devices')
        .doc(selectedDeviceId)
        .collection('pending_commands')
        .add({ cmd, ...extra, createdAt: firestore.FieldValue.serverTimestamp() })
    },
    [selectedDeviceId]
  )

  const claimDevice = useCallback(
    async (deviceId: string) => {
      setClaimError('')
      const trimmed = deviceId.trim()
      if (!user || !trimmed) return
      try {
        await firestore().collection('devices').doc(trimmed).update({
          ownerUid: user.uid,
          claimed: true,
          claimedAt: firestore.FieldValue.serverTimestamp(),
        })
        setSelectedDeviceId(trimmed)
      } catch {
        setClaimError("Could not claim that device — check the ID and make sure it isn't already claimed.")
      }
    },
    [user, setSelectedDeviceId]
  )

  const selected = devices.find((d) => d.id === selectedDeviceId) || null

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice: selected,
    status: selected?.status || null,
    alerts,
    history,
    publishCommand,
    claimDevice,
    claimError,
    hydrated,
  }
}
