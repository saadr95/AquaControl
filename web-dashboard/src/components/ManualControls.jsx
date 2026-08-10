function btnClass(enabled) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    enabled
      ? 'bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700'
      : 'cursor-not-allowed bg-slate-800 text-slate-600'
  }`
}

export default function ManualControls({ status, publishCommand }) {
  const manual = status?.mode === 'MANUAL'
  const isFault = status?.state === 'FAULT'

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Manual Controls</h2>
        <button
          onClick={() => publishCommand(manual ? 'MODE_AUTO' : 'MODE_MANUAL')}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          Switch to {manual ? 'AUTO' : 'MANUAL'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button disabled={!manual} onClick={() => publishCommand('PUMP_ON')} className={btnClass(manual)}>
          Pump ON
        </button>
        <button disabled={!manual} onClick={() => publishCommand('PUMP_OFF')} className={btnClass(manual)}>
          Pump OFF
        </button>
        <button disabled={!manual} onClick={() => publishCommand('VALVE_OPEN')} className={btnClass(manual)}>
          Valve OPEN
        </button>
        <button disabled={!manual} onClick={() => publishCommand('VALVE_CLOSE')} className={btnClass(manual)}>
          Valve CLOSE
        </button>
      </div>

      <button
        onClick={() => publishCommand('RESET_FAULT')}
        className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
          isFault
            ? 'animate-pulse bg-red-600 text-white hover:bg-red-500'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        Reset Fault
      </button>

      {!manual && (
        <p className="text-xs text-slate-500">Switch to MANUAL mode to enable pump and valve controls.</p>
      )}
    </div>
  )
}
