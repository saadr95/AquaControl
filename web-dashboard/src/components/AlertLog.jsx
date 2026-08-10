function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AlertLog({ alerts }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Alerts</h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500">No alerts yet.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {alerts.map((a, i) => (
            <li
              key={`${a.timestamp}-${i}`}
              className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="text-slate-200">{a.message}</span>
              <span className="shrink-0 text-xs text-slate-500">{formatTime(a.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
