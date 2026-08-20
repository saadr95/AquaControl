import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { Alert } from '../hooks/useDevices'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AlertLog({ alerts }: { alerts: Alert[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Recent Alerts</Text>
      {alerts.length === 0 ? (
        <Text style={styles.empty}>No alerts yet.</Text>
      ) : (
        alerts.map((a, i) => (
          <View key={`${a.timestamp}-${i}`} style={[styles.row, i === alerts.length - 1 && styles.rowLast]}>
            <Text style={styles.message}>{a.message}</Text>
            <Text style={styles.time}>{formatTime(a.timestamp)}</Text>
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', backgroundColor: 'rgba(15,23,42,0.6)', padding: 16 },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  empty: { color: '#64748b', fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
    marginBottom: 8,
  },
  rowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  message: { color: '#e2e8f0', fontSize: 13, flex: 1 },
  time: { color: '#64748b', fontSize: 11 },
})
