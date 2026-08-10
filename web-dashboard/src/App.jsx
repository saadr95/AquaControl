import { useEffect, useState } from 'react'
import { useMqtt } from './hooks/useMqtt'
import TankGauge from './components/TankGauge'
import StatusIndicator from './components/StatusIndicator'
import ManualControls from './components/ManualControls'
import AlertLog from './components/AlertLog'
import HistoryChart from './components/HistoryChart'
import ConnectionStatus from './components/ConnectionStatus'
import FlowStats from './components/FlowStats'
import DeviceSelector from './components/DeviceSelector'
import PermissionPrompt from './components/PermissionPrompt'
import { UNDER_LOW_PCT, ROOF_LOW_PCT, UNDER_TANK_CAPACITY_L } from './config'

function secondsAgo(ts) {
  if (!ts) return null
  return Math.max(0, Math.round((Date.now() - ts) / 1000))
}

export default function App() {
  const {
    connected,
    deviceIds,
    statuses,
    selectedDeviceId,
    setSelectedDeviceId,
    status,
    lastStatusAt,
    alerts,
    history,
    publishCommand,
  } = useMqtt()

  // Re-render every second so the "last update Xs ago" text stays live.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const underFaulted = status?.underground_pct === -1
  const roofFaulted = status?.roof_pct === -1
  const staleness = secondsAgo(lastStatusAt)
  const stale = staleness != null && staleness > 15
  const deviceName = status?.device_name || selectedDeviceId

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-4xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                AquaControl{deviceName ? <span className="text-slate-400"> · {deviceName}</span> : null}
              </h1>
              <p className="text-xs text-slate-500">
                {status ? (
                  <>
                    State: <span className="text-slate-300">{status.state}</span> · Mode:{' '}
                    <span className="text-slate-300">{status.mode}</span>
                    {staleness != null && (
                      <span className={stale ? 'text-amber-400' : ''}> · updated {staleness}s ago</span>
                    )}
                  </>
                ) : deviceIds.length === 0 ? (
                  'Waiting for a device…'
                ) : (
                  'Waiting for data…'
                )}
              </p>
            </div>
            <ConnectionStatus connected={connected} />
          </div>
          <DeviceSelector
            deviceIds={deviceIds}
            statuses={statuses}
            selectedDeviceId={selectedDeviceId}
            onSelect={setSelectedDeviceId}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <section className="grid grid-cols-2 gap-4">
          <TankGauge label="Underground" pct={status?.underground_pct} lowPct={UNDER_LOW_PCT} faulted={underFaulted} />
          <TankGauge label="Roof" pct={status?.roof_pct} lowPct={ROOF_LOW_PCT} faulted={roofFaulted} />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusIndicator
            label="Grid Power"
            active={!!status?.grid}
            activeText="Present"
            inactiveText="Absent"
            activeColor="bg-emerald-500"
            inactiveColor="bg-red-500"
            caption={status?.ac_variation != null ? `sensor variation: ${status.ac_variation}` : undefined}
          />
          <StatusIndicator label="Pump" active={!!status?.pump} activeText="Running" inactiveText="Stopped" />
          <StatusIndicator label="Valve" active={!!status?.valve} activeText="Open" inactiveText="Closed" />
          <StatusIndicator label="Flow" active={!!status?.flow} activeText="Detected" inactiveText="None" />
        </section>

        <PermissionPrompt status={status} publishCommand={publishCommand} />
        <FlowStats status={status} capacityL={UNDER_TANK_CAPACITY_L} />
        <ManualControls status={status} publishCommand={publishCommand} />
        <HistoryChart history={history} />
        <AlertLog alerts={alerts} />
      </main>
    </div>
  )
}
