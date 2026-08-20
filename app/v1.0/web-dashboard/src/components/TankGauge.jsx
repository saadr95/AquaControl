export default function TankGauge({ label, pct, lowPct = 20, faulted = false }) {
  const clamped = faulted || pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  const ringColor = faulted
    ? 'stroke-red-500'
    : clamped <= lowPct
      ? 'stroke-red-400'
      : clamped < 60
        ? 'stroke-amber-400'
        : 'stroke-cyan-400'

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} strokeWidth="10" fill="none" className="stroke-slate-800" />
          {!faulted && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${ringColor} transition-[stroke-dashoffset] duration-700 ease-out`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {faulted ? (
            <span className="text-sm font-semibold text-red-400">ERR</span>
          ) : (
            <span className="text-2xl font-bold text-slate-100">{pct == null ? '--' : `${clamped}%`}</span>
          )}
        </div>
      </div>
      <span className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  )
}
