import React, { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native'
import type { Status } from '../hooks/useDevices'

type Props = {
  status: Status | null
  publishCommand: (cmd: string, extra?: Record<string, unknown>) => void
  isAdmin: boolean
}

export default function ManualControls({ status, publishCommand, isAdmin }: Props) {
  const manual = status?.mode === 'MANUAL'
  const isFault = status?.state === 'FAULT'
  const actuatorsBusy = !!status?.pump || !!status?.valve
  const [nameInput, setNameInput] = useState('')

  const handleOtaUpdate = () => {
    Alert.alert(
      'Update firmware?',
      `The board (currently v${status?.fw_version ?? '?'}) will download the latest release and reboot — ` +
        'it will be offline for up to a minute.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', style: 'destructive', onPress: () => publishCommand('OTA_UPDATE') },
      ]
    )
  }

  const handleRename = () => {
    const name = nameInput.trim()
    if (!name) return
    publishCommand('SET_NAME', { name })
    setNameInput('')
  }

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

      <View style={styles.otaSection}>
        <Text style={styles.hint}>Rename board{status?.device_name ? ` (current: ${status.device_name})` : ''}</Text>
        <View style={styles.renameRow}>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="e.g. Mark I"
            placeholderTextColor="#475569"
            style={styles.renameInput}
          />
          <TouchableOpacity onPress={handleRename} style={styles.renameBtn}>
            <Text style={styles.renameBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.otaSection}>
          <TouchableOpacity
            disabled={actuatorsBusy}
            onPress={handleOtaUpdate}
            style={[styles.otaBtn, actuatorsBusy && styles.otaBtnDisabled]}
          >
            <Text style={[styles.otaBtnText, actuatorsBusy && styles.otaBtnTextDisabled]}>
              Update Firmware{status?.fw_version ? ` (current: v${status.fw_version})` : ''}
            </Text>
          </TouchableOpacity>
          {actuatorsBusy && (
            <Text style={styles.hint}>Stop the pump/valve first — the board can't safety-check itself while downloading.</Text>
          )}
        </View>
      )}
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
  otaSection: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, gap: 8 },
  otaBtn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  otaBtnDisabled: { backgroundColor: '#1e293b' },
  otaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  otaBtnTextDisabled: { color: '#475569' },
  renameRow: { flexDirection: 'row', gap: 8 },
  renameInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f1f5f9',
    fontSize: 13,
  },
  renameBtn: { backgroundColor: '#0891b2', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  renameBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
})
