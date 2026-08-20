function formatDuration(minutes) {
  if (!isFinite(minutes) || minutes < 0) return '—'
  const totalMin = Math.round(minutes)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function FlowStats({ status, capacityL }) {
  const rate = status?.flow_rate_lpm ?? 0
  const pct = status?.underground_pct
  const flowing = rate > 0.2

  let etaText = '—'
  if (pct != null && pct >= 100) {
    etaText = 'Full'
  } else if (flowing && pct != null && pct >= 0) {
    const remainingL = capacityL * ((100 - pct) / 100)
    etaText = formatDuration(remainingL / rate)
  } else if (!flowing) {
    etaText = 'No flow'
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Supply Flow (Underground)</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-100">
            {rate.toFixed(1)} <span className="text-sm font-normal text-slate-500">L/min</span>
          </div>
          <div className="text-xs text-slate-500">Current rate</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-100">{etaText}</div>
          <div className="text-xs text-slate-500">Est. time to full</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-600">
        Capacity is a rough estimate ({capacityL.toLocaleString()} L) — refine for an accurate ETA.
      </p>
    </div>
  )
}
