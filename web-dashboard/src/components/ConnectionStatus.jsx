export default function ConnectionStatus({ connected }) {
  return (
    <span
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-red-400'}`} />
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  )
}
