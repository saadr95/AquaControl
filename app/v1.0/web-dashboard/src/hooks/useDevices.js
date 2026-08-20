import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { SELECTED_DEVICE_KEY, MAX_ALERTS, HISTORY_WINDOW_MS } from '../config'

// Firestore replaces MQTT as far as the frontend is concerned — this hook
// is the direct successor to the old useMqtt.js. All actual MQTT traffic
// now goes through the bridge service (mqtt-fcm-relay), which is the only
// thing with real broker credentials.
export function useDevices(user, role) {
  const [devices, setDevices] = useState([]) // [{id, ...doc}]
  const [selectedDeviceId, setSelectedDeviceIdState] = useState(
    () => localStorage.getItem(SELECTED_DEVICE_KEY) || null
  )
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [claimError, setClaimError] = useState('')

  const setSelectedDeviceId = useCallback((id) => {
    setSelectedDeviceIdState(id)
    localStorage.setItem(SELECTED_DEVICE_KEY, id)
  }, [])

  // ── Device list — all devices for admins, only owned ones for customers ──
  useEffect(() => {
    if (!user) return
    const devicesRef = collection(db, 'devices')
    const q = role === 'admin' ? query(devicesRef) : query(devicesRef, where('ownerUid', '==', user.uid))

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setDevices(list)
      setSelectedDeviceIdState((current) => {
        if (current && list.some((d) => d.id === current)) return current
        const first = list[0]?.id || null
        if (first) localStorage.setItem(SELECTED_DEVICE_KEY, first)
        return first
      })
    })
  }, [user, role])

  // ── Alerts for the selected device only (avoid a listener per device) ──
  useEffect(() => {
    if (!selectedDeviceId) {
      setAlerts([])
      return
    }
    const q = query(
      collection(db, 'devices', selectedDeviceId, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(MAX_ALERTS)
    )
    return onSnapshot(q, (snapshot) => {
      setAlerts(
        snapshot.docs.map((d) => ({
          message: d.data().message,
          timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
        }))
      )
    })
  }, [selectedDeviceId])

  // ── Tank history for the selected device only ──
  useEffect(() => {
    if (!selectedDeviceId) {
      setHistory([])
      return
    }
    const cutoff = new Date(Date.now() - HISTORY_WINDOW_MS)
    const q = query(collection(db, 'devices', selectedDeviceId, 'history'), orderBy('t', 'asc'), where('t', '>=', cutoff))
    return onSnapshot(q, (snapshot) => {
      setHistory(
        snapshot.docs.map((d) => ({
          t: d.data().t?.toMillis?.() ?? Date.now(),
          u: d.data().u,
          r: d.data().r,
        }))
      )
    })
  }, [selectedDeviceId])

  const publishCommand = useCallback(
    async (cmd, extra = {}) => {
      if (!selectedDeviceId) return
      await addDoc(collection(db, 'devices', selectedDeviceId, 'pending_commands'), {
        cmd,
        ...extra,
        createdAt: serverTimestamp(),
      })
    },
    [selectedDeviceId]
  )

  const claimDevice = useCallback(
    async (deviceId) => {
      setClaimError('')
      if (!user || !deviceId.trim()) return
      try {
        await updateDoc(doc(db, 'devices', deviceId.trim()), {
          ownerUid: user.uid,
          claimed: true,
          claimedAt: serverTimestamp(),
        })
        setSelectedDeviceId(deviceId.trim())
      } catch {
        setClaimError('Could not claim that device — check the ID and make sure it isn\'t already claimed.')
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
  }
}
