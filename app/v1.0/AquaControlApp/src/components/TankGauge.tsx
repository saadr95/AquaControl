import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

type Props = {
  label: string
  pct: number | null | undefined
  lowPct?: number
  faulted?: boolean
}

export default function TankGauge({ label, pct, lowPct = 20, faulted = false }: Props) {
  const clamped = faulted || pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  const color = faulted ? '#f87171' : clamped <= lowPct ? '#f87171' : clamped < 60 ? '#fbbf24' : '#22d3ee'

  return (
    <View style={styles.card}>
      <View style={styles.gaugeWrap}>
        <Svg width={128} height={128} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={radius} stroke="#1e293b" strokeWidth={10} fill="none" />
          {!faulted && (
            <Circle
              cx={60}
              cy={60}
              r={radius}
              stroke={color}
              strokeWidth={10}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation={-90}
              origin="60, 60"
            />
          )}
        </Svg>
        <View style={styles.gaugeLabel}>
          <Text style={faulted ? styles.errText : styles.pctText}>
            {faulted ? 'ERR' : pct == null ? '--' : `${clamped}%`}
          </Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(15,23,42,0.6)',
    padding: 16,
  },
  gaugeWrap: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  gaugeLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pctText: { color: '#f1f5f9', fontSize: 24, fontWeight: '700' },
  errText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
})
