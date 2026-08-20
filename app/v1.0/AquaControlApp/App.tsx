import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from './src/hooks/useAuth'
import { useDevices } from './src/hooks/useDevices'
import Login from './src/components/Login'
import ClaimDevice from './src/components/ClaimDevice'
import TankGauge from './src/components/TankGauge'
import StatusIndicator from './src/components/StatusIndicator'
import ManualControls from './src/components/ManualControls'
import AlertLog from './src/components/AlertLog'
import HistoryChart from './src/components/HistoryChart'
import FlowStats from './src/components/FlowStats'
import DeviceSelector from './src/components/DeviceSelector'
import PermissionPrompt from './src/components/PermissionPrompt'
import { UNDER_LOW_PCT, ROOF_LOW_PCT, UNDER_TANK_CAPACITY_L } from './src/config'
import { setupNotifications, subscribeToDeviceAlerts, unsubscribeFromDeviceAlerts } from './src/notifications'

function Dashboard({ user, role, signOut }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; role: string | null; signOut: () => void }) {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    status,
    alerts,
    history,
    publishCommand,
    claimDevice,
    claimError,
  } = useDevices(user, role as 'customer' | 'admin' | null)
  const isAdmin = role === 'admin'
  const [, forceTick] = useState(0)
  const [showClaim, setShowClaim] = useState(false)
  const subscribedTopic = useRef<string | null>(null)

  useEffect(() => {
    setupNotifications().catch((e) => console.warn('[notifications] setup failed', e))
  }, [])

  // Re-subscribe FCM to whichever device is currently selected, so alerts
  // only push for a device this account actually owns/is viewing.
  useEffect(() => {
    if (subscribedTopic.current) {
      unsubscribeFromDeviceAlerts(subscribedTopic.current).catch(() => {})
    }
    if (selectedDeviceId) {
      subscribeToDeviceAlerts(selectedDeviceId).catch((e) => console.warn('[notifications] subscribe failed', e))
      subscribedTopic.current = selectedDeviceId
    } else {
      subscribedTopic.current = null
    }
  }, [selectedDeviceId])

  // Re-render every second so the "updated Xs ago" text stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const underFaulted = status?.underground_pct === -1
  const roofFaulted = status?.roof_pct === -1
  const selected = devices.find((d) => d.id === selectedDeviceId)
  const deviceLabel = isAdmin && selected?.internalLabel ? selected.internalLabel : status?.device_name || selected?.customerName

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              AquaControl{deviceLabel ? ` · ${deviceLabel}` : ''}
              {isAdmin ? ' · ADMIN' : ''}
            </Text>
            <Text style={styles.subtitle}>
              {status
                ? `State: ${status.state} · Mode: ${status.mode}`
                : devices.length === 0
                  ? 'No devices yet'
                  : 'Waiting for data…'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectorRow}>
          <DeviceSelector devices={devices} selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} isAdmin={isAdmin} />
          {!isAdmin && (
            <TouchableOpacity onPress={() => setShowClaim((v) => !v)}>
              <Text style={styles.addDeviceLink}>{showClaim ? 'Cancel' : '+ Add device'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {(devices.length === 0 || showClaim) && !isAdmin && (
          <ClaimDevice claimDevice={claimDevice} claimError={claimError} />
        )}

        {devices.length > 0 && (
          <>
            <View style={styles.gaugeRow}>
              <TankGauge label="Underground" pct={status?.underground_pct} lowPct={UNDER_LOW_PCT} faulted={underFaulted} />
              <TankGauge label="Roof" pct={status?.roof_pct} lowPct={ROOF_LOW_PCT} faulted={roofFaulted} />
            </View>

            <View style={styles.statusGrid}>
              <StatusIndicator
                label="Grid Power"
                active={!!status?.grid}
                activeText="Present"
                inactiveText="Absent"
                activeColor="#10b981"
                inactiveColor="#ef4444"
                caption={status?.ac_variation != null ? `sensor variation: ${status.ac_variation}` : undefined}
              />
              <StatusIndicator label="Pump" active={!!status?.pump} activeText="Running" inactiveText="Stopped" />
              <StatusIndicator label="Valve" active={!!status?.valve} activeText="Open" inactiveText="Closed" />
              <StatusIndicator label="Flow" active={!!status?.flow} activeText="Detected" inactiveText="None" />
            </View>

            <PermissionPrompt status={status} publishCommand={publishCommand} />
            <FlowStats status={status} capacityL={UNDER_TANK_CAPACITY_L} />
            <ManualControls status={status} publishCommand={publishCommand} isAdmin={isAdmin} />
            <HistoryChart history={history} />
            <AlertLog alerts={alerts} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  const { user, role, loading, signIn, signUp, signOut, authError } = useAuth()

  return (
    <SafeAreaProvider>
      {loading ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#22d3ee" />
        </View>
      ) : !user ? (
        <Login signIn={signIn} signUp={signUp} authError={authError} />
      ) : (
        <Dashboard user={user} role={role} signOut={signOut} />
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  loadingScreen: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  title: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  signOutBtn: { backgroundColor: '#1e293b', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  signOutText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  addDeviceLink: { color: '#22d3ee', fontSize: 12, fontWeight: '600' },
  gaugeRow: { flexDirection: 'row', gap: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
})
