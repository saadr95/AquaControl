import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { Status } from '../hooks/useMqtt'

function formatDuration(minutes: number) {
  if (!isFinite(minutes) || minutes < 0) return '—'
  const totalMin = Math.round(minutes)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function FlowStats({ status, capacityL }: { status: Status | null; capacityL: number }) {
  const rate = status?.flow_rate_lpm ?? 0
  const pct = status?.underground_pct
  const flowing = rate > 0.2

  let etaText = '—'
  if (pct != null && pct >= 100) {
    etaText = 'Full'
  } else if (flowing && pct != null && pct >= 0) {
    const remainingL = capacityL * ((100 - pct) / 100)
    etaText = formatDuration(remainingL / rate)
  } else if (!flowing) {
    etaText = 'No flow'
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Supply Flow (Underground)</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.value}>
            {rate.toFixed(1)} <Text style={styles.unit}>L/min</Text>
          </Text>
          <Text style={styles.label}>Current rate</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.value}>{etaText}</Text>
          <Text style={styles.label}>Est. time to full</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Capacity is a rough estimate ({capacityL.toLocaleString()} L) — refine for an accurate ETA.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', backgroundColor: 'rgba(15,23,42,0.6)', padding: 16 },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 24 },
  col: { flex: 1 },
  value: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  unit: { color: '#64748b', fontSize: 13, fontWeight: '400' },
  label: { color: '#64748b', fontSize: 11, marginTop: 2 },
  hint: { color: '#475569', fontSize: 10, marginTop: 10 },
})
