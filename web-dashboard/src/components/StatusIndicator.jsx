export default function StatusIndicator({
  label,
  active,
  activeText,
  inactiveText,
  activeColor = 'bg-cyan-400',
  inactiveColor = 'bg-slate-600',
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span className={`h-2.5 w-2.5 rounded-full ${active ? activeColor : inactiveColor}`} />
        {active ? activeText : inactiveText}
      </span>
    </div>
  )
}
