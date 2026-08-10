// Shown when the board loses grid power mid-fill and needs permission to
// keep running on solar — replaces the old Telegram Yes/No reply flow.
// Auto-cancels on the firmware side after 5 minutes if left unanswered.
export default function PermissionPrompt({ status, publishCommand }) {
  if (!status?.waiting_permission) return null

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-400">Permission Needed</h2>
      <p className="mb-3 text-sm text-amber-100">{status.pending_action || 'The board is waiting for a decision.'}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => publishCommand('YES')}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Yes, allow
        </button>
        <button
          onClick={() => publishCommand('NO')}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          No, cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-200/70">Auto-cancels in 5 minutes if unanswered.</p>
    </div>
  )
}
