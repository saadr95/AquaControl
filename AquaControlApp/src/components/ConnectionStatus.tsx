import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: connected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
      <View style={[styles.dot, { backgroundColor: connected ? '#34d399' : '#f87171' }]} />
      <Text style={[styles.text, { color: connected ? '#34d399' : '#f87171' }]}>
        {connected ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '700' },
})
