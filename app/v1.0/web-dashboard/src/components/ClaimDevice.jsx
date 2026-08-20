import { useState } from 'react'

export default function ClaimDevice({ claimDevice, claimError }) {
  const [deviceId, setDeviceId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await claimDevice(deviceId)
    setSubmitting(false)
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Add a device</h2>
      <p className="text-xs text-slate-500">
        Enter the device ID printed on your unit (or shown on its display at boot) to link it to your account.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="e.g. DCE8B5DF948C"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-600"
        />
        <button
          type="submit"
          disabled={submitting || !deviceId.trim()}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {claimError && <p className="text-xs text-red-400">{claimError}</p>}
    </div>
  )
}
