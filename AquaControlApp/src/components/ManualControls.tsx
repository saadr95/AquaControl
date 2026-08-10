import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Status } from '../hooks/useMqtt'

type Props = { status: Status | null; publishCommand: (cmd: string) => void }

export default function ManualControls({ status, publishCommand }: Props) {
  const manual = status?.mode === 'MANUAL'
  const isFault = status?.state === 'FAULT'

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Manual Controls</Text>
        <TouchableOpacity style={styles.modeBtn} onPress={() => publishCommand(manual ? 'MODE_AUTO' : 'MODE_MANUAL')}>
          <Text style={styles.modeBtnText}>Switch to {manual ? 'AUTO' : 'MANUAL'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <ControlButton label="Pump ON" enabled={manual} onPress={() => publishCommand('PUMP_ON')} />
        <ControlButton label="Pump OFF" enabled={manual} onPress={() => publishCommand('PUMP_OFF')} />
        <ControlButton label="Valve OPEN" enabled={manual} onPress={() => publishCommand('VALVE_OPEN')} />
        <ControlButton label="Valve CLOSE" enabled={manual} onPress={() => publishCommand('VALVE_CLOSE')} />
      </View>

      <TouchableOpacity
        style={[styles.resetBtn, isFault && styles.resetBtnFault]}
        onPress={() => publishCommand('RESET_FAULT')}
      >
        <Text style={styles.resetBtnText}>Reset Fault</Text>
      </TouchableOpacity>

      {!manual && <Text style={styles.hint}>Switch to MANUAL mode to enable pump and valve controls.</Text>}
    </View>
  )
}

function ControlButton({ label, enabled, onPress }: { label: string; enabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      disabled={!enabled}
      onPress={onPress}
      style={[styles.ctrlBtn, enabled ? styles.ctrlBtnOn : styles.ctrlBtnOff]}
    >
      <Text style={[styles.ctrlBtnText, !enabled && styles.ctrlBtnTextOff]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', backgroundColor: 'rgba(15,23,42,0.6)', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  modeBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  modeBtnText: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ctrlBtn: { flexBasis: '47%', flexGrow: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  ctrlBtnOn: { backgroundColor: '#0891b2' },
  ctrlBtnOff: { backgroundColor: '#1e293b' },
  ctrlBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ctrlBtnTextOff: { color: '#475569' },
  resetBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  resetBtnFault: { backgroundColor: '#dc2626' },
  resetBtnText: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },
  hint: { color: '#64748b', fontSize: 11 },
})
