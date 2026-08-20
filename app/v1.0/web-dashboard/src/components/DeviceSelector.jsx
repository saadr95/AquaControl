export default function DeviceSelector({ devices, selectedDeviceId, onSelect, isAdmin }) {
  if (devices.length <= 1) return null // nothing to pick between with 0-1 devices

  return (
    <div className="flex flex-wrap gap-2">
      {devices.map((d) => {
        const label = isAdmin && d.internalLabel ? d.internalLabel : d.customerName || d.id
        const active = d.id === selectedDeviceId
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
