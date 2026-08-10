import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Props = {
  label: string
  active: boolean
  activeText: string
  inactiveText: string
  activeColor?: string
  inactiveColor?: string
  caption?: string
}

export default function StatusIndicator({
  label,
  active,
  activeText,
  inactiveText,
  activeColor = '#22d3ee',
  inactiveColor = '#475569',
  caption,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <View style={[styles.dot, { backgroundColor: active ? activeColor : inactiveColor }]} />
          <Text style={styles.value}>{active ? activeText : inactiveText}</Text>
        </View>
      </View>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#94a3b8', fontSize: 13 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  value: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  caption: { color: '#475569', fontSize: 10, marginTop: 4, textAlign: 'right' },
})
