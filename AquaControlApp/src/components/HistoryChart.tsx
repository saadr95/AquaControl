import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import type { HistoryPoint } from '../hooks/useMqtt'

export default function HistoryChart({ history }: { history: HistoryPoint[] }) {
  const screenWidth = Dimensions.get('window').width - 64

  if (history.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Tank Levels — Last 24h</Text>
        <Text style={styles.empty}>Not enough data yet — check back once the device has been publishing a while.</Text>
      </View>
    )
  }

  // Downsample so chart-kit isn't rendering thousands of points on a phone screen
  const maxPoints = 48
  const step = Math.max(1, Math.floor(history.length / maxPoints))
  const sampled = history.filter((_, i) => i % step === 0)
  const labelEvery = Math.max(1, Math.ceil(sampled.length / 6))

  const labels = sampled.map((p, i) =>
    i % labelEvery === 0 ? new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  )

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Tank Levels — Last 24h</Text>
      <View style={styles.legendRow}>
        <LegendDot color="#22d3ee" label="Underground" />
        <LegendDot color="#a78bfa" label="Roof" />
      </View>
      <LineChart
        data={{
          labels,
          datasets: [
            { data: sampled.map((p) => p.u), color: () => '#22d3ee', strokeWidth: 2 },
            { data: sampled.map((p) => p.r), color: () => '#a78bfa', strokeWidth: 2 },
          ],
        }}
        width={screenWidth}
        height={200}
        fromZero
        segments={4}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: '#0f172a',
          backgroundGradientTo: '#0f172a',
          decimalPlaces: 0,
          color: () => '#64748b',
          labelColor: () => '#64748b',
          propsForDots: { r: '0' },
          propsForBackgroundLines: { stroke: '#1e293b' },
        }}
        withShadow={false}
        withInnerLines
        withOuterLines={false}
        bezier
        style={styles.chart}
      />
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', backgroundColor: 'rgba(15,23,42,0.6)', padding: 16 },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  empty: { color: '#64748b', fontSize: 13 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#94a3b8', fontSize: 11 },
  chart: { borderRadius: 12, marginLeft: -16 },
})
