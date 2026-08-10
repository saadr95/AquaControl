import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Status } from '../hooks/useMqtt'

type Props = {
  deviceIds: string[]
  statuses: Record<string, Status>
  selectedDeviceId: string | null
  onSelect: (id: string) => void
}

export default function DeviceSelector({ deviceIds, statuses, selectedDeviceId, onSelect }: Props) {
  if (deviceIds.length <= 1) return null // nothing to pick between with 0-1 boards

  return (
    <View style={styles.row}>
      {deviceIds.map((id) => {
        const name = statuses[id]?.device_name || id
        const active = id === selectedDeviceId
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onSelect(id)}
            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
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
