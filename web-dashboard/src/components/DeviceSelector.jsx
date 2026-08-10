export default function DeviceSelector({ deviceIds, statuses, selectedDeviceId, onSelect }) {
  if (deviceIds.length <= 1) return null // nothing to pick between with 0-1 boards

  return (
    <div className="flex flex-wrap gap-2">
      {deviceIds.map((id) => {
        const name = statuses[id]?.device_name || id
        const active = id === selectedDeviceId
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}
