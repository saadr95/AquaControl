function btnClass(enabled) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    enabled
      ? 'bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700'
      : 'cursor-not-allowed bg-slate-800 text-slate-600'
  }`
}

export default function ManualControls({ status, publishCommand, isAdmin }) {
  const manual = status?.mode === 'MANUAL'
  const isFault = status?.state === 'FAULT'
  const actuatorsBusy = !!status?.pump || !!status?.valve

  const handleOtaUpdate = () => {
    const ok = window.confirm(
      `Update firmware now? The board (currently v${status?.fw_version ?? '?'}) will download the latest ` +
        'release and reboot — it will be offline for up to a minute.'
    )
    if (ok) publishCommand('OTA_UPDATE')
  }

  const handleRename = () => {
    const name = window.prompt('New name for this board:', status?.device_name || '')
    if (name && name.trim()) publishCommand('SET_NAME', { name: name.trim() })
  }

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

      <div className="border-t border-slate-800 pt-3">
        <button
          onClick={handleRename}
          className="mb-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          Rename Board{status?.device_name ? ` (current: ${status.device_name})` : ''}
        </button>
        {isAdmin && (
          <>
            <button
              disabled={actuatorsBusy}
              onClick={handleOtaUpdate}
              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
                actuatorsBusy
                  ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              Update Firmware{status?.fw_version ? ` (current: v${status.fw_version})` : ''}
            </button>
            {actuatorsBusy && (
              <p className="mt-1 text-xs text-slate-500">Stop the pump/valve first — the board can't safety-check itself while downloading.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
