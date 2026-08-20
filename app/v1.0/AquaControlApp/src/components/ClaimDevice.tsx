import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'

type Props = { claimDevice: (deviceId: string) => Promise<void>; claimError: string }

export default function ClaimDevice({ claimDevice, claimError }: Props) {
  const [deviceId, setDeviceId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!deviceId.trim()) return
    setSubmitting(true)
    await claimDevice(deviceId)
    setSubmitting(false)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Add a device</Text>
      <Text style={styles.body}>
        Enter the device ID printed on your unit (or shown on its display at boot) to link it to your account.
      </Text>
      <View style={styles.row}>
        <TextInput
          value={deviceId}
          onChangeText={setDeviceId}
          placeholder="e.g. DCE8B5DF948C"
          placeholderTextColor="#64748b"
          autoCapitalize="characters"
          style={styles.input}
        />
        <TouchableOpacity
          disabled={submitting || !deviceId.trim()}
          onPress={handleSubmit}
          style={[styles.addBtn, (submitting || !deviceId.trim()) && styles.addBtnDisabled]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      {!!claimError && <Text style={styles.error}>{claimError}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(15,23,42,0.6)',
    padding: 16,
  },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f1f5f9',
    fontSize: 13,
  },
  addBtn: { backgroundColor: '#0891b2', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#1e293b' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  error: { color: '#f87171', fontSize: 12 },
})
