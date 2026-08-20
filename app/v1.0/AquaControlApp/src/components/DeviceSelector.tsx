import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { DeviceDoc } from '../hooks/useDevices'

type Props = {
  devices: DeviceDoc[]
  selectedDeviceId: string | null
  onSelect: (id: string) => void
  isAdmin: boolean
}

export default function DeviceSelector({ devices, selectedDeviceId, onSelect, isAdmin }: Props) {
  if (devices.length <= 1) return null // nothing to pick between with 0-1 devices

  return (
    <View style={styles.row}>
      {devices.map((d) => {
        const label = isAdmin && d.internalLabel ? d.internalLabel : d.customerName || d.id
        const active = d.id === selectedDeviceId
        return (
          <TouchableOpacity
            key={d.id}
            onPress={() => onSelect(d.id)}
            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#0891b2' },
  chipInactive: { backgroundColor: '#1e293b' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#cbd5e1' },
  chipTextActive: { color: '#fff' },
})
