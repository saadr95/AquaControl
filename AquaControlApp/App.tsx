import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, StatusBar, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useMqtt } from './src/hooks/useMqtt'
import TankGauge from './src/components/TankGauge'
import StatusIndicator from './src/components/StatusIndicator'
import ManualControls from './src/components/ManualControls'
import AlertLog from './src/components/AlertLog'
import HistoryChart from './src/components/HistoryChart'
import ConnectionStatus from './src/components/ConnectionStatus'
import FlowStats from './src/components/FlowStats'
import DeviceSelector from './src/components/DeviceSelector'
import PermissionPrompt from './src/components/PermissionPrompt'
import { UNDER_LOW_PCT, ROOF_LOW_PCT, UNDER_TANK_CAPACITY_L } from './src/config'
import { setupNotifications } from './src/notifications'

function secondsAgo(ts: number | null) {
  if (!ts) return null
  return Math.max(0, Math.round((Date.now() - ts) / 1000))
}

function Dashboard() {
  const {
    connected,
    deviceIds,
    statuses,
    selectedDeviceId,
    setSelectedDeviceId,
    status,
    lastStatusAt,
    alerts,
    history,
    publishCommand,
    reconnect,
    hydrated,
  } = useMqtt()
  const [, forceTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setupNotifications().catch((e) => console.warn('[notifications] setup failed', e))
  }, [])

  // Re-render every second so the "updated Xs ago" text stays live.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    reconnect()
    setTimeout(() => setRefreshing(false), 1200)
  }, [reconnect])

  const underFaulted = status?.underground_pct === -1
  const roofFaulted = status?.roof_pct === -1
  const staleness = secondsAgo(lastStatusAt)
  const deviceName = status?.device_name || selectedDeviceId

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>AquaControl{deviceName ? ` · ${deviceName}` : ''}</Text>
            <Text style={styles.subtitle}>
              {status
                ? `State: ${status.state} · Mode: ${status.mode}${staleness != null ? ` · updated ${staleness}s ago` : ''}`
                : hydrated
                  ? deviceIds.length === 0
                    ? 'Waiting for a device…'
                    : 'Waiting for data…'
                  : 'Loading…'}
            </Text>
          </View>
          <ConnectionStatus connected={connected} />
        </View>

        <DeviceSelector
          deviceIds={deviceIds}
          statuses={statuses}
          selectedDeviceId={selectedDeviceId}
          onSelect={setSelectedDeviceId}
        />

        {!connected && status && (
          <Text style={styles.offlineHint}>
            Offline — showing last known state{lastStatusAt ? ` from ${new Date(lastStatusAt).toLocaleString()}` : ''}.
          </Text>
        )}

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
          />
          <StatusIndicator label="Pump" active={!!status?.pump} activeText="Running" inactiveText="Stopped" />
          <StatusIndicator label="Valve" active={!!status?.valve} activeText="Open" inactiveText="Closed" />
          <StatusIndicator label="Flow" active={!!status?.flow} activeText="Detected" inactiveText="None" />
        </View>

        <PermissionPrompt status={status} publishCommand={publishCommand} />
        <FlowStats status={status} capacityL={UNDER_TANK_CAPACITY_L} />
        <ManualControls status={status} publishCommand={publishCommand} />
        <HistoryChart history={history} />
        <AlertLog alerts={alerts} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Dashboard />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  title: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  offlineHint: { color: '#fbbf24', fontSize: 12 },
  gaugeRow: { flexDirection: 'row', gap: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
})
