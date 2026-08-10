import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Status } from '../hooks/useMqtt'

// Shown when the board loses grid power mid-fill and needs permission to
// keep running on solar — replaces the old Telegram Yes/No reply flow.
// Auto-cancels on the firmware side after 5 minutes if left unanswered.
export default function PermissionPrompt({
  status,
  publishCommand,
}: {
  status: Status | null
  publishCommand: (cmd: string) => void
}) {
  if (!status?.waiting_permission) return null

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Permission Needed</Text>
      <Text style={styles.action}>{status.pending_action || 'The board is waiting for a decision.'}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.yesBtn} onPress={() => publishCommand('YES')}>
          <Text style={styles.btnText}>Yes, allow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.noBtn} onPress={() => publishCommand('NO')}>
          <Text style={styles.btnText}>No, cancel</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Auto-cancels in 5 minutes if unanswered.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: 16,
  },
  heading: { color: '#fbbf24', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  action: { color: '#fef3c7', fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  yesBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  noBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  hint: { color: 'rgba(254,243,199,0.7)', fontSize: 10, marginTop: 8 },
})
