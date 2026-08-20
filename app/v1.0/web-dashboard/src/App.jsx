import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDevices } from './hooks/useDevices'
import Login from './components/Login'
import ClaimDevice from './components/ClaimDevice'
import TankGauge from './components/TankGauge'
import StatusIndicator from './components/StatusIndicator'
import ManualControls from './components/ManualControls'
import AlertLog from './components/AlertLog'
import HistoryChart from './components/HistoryChart'
import FlowStats from './components/FlowStats'
import DeviceSelector from './components/DeviceSelector'
import PermissionPrompt from './components/PermissionPrompt'
import { UNDER_LOW_PCT, ROOF_LOW_PCT, UNDER_TANK_CAPACITY_L } from './config'

export default function App() {
  const { user, role, loading, signIn, signUp, signOut, authError } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Loading…</div>
  }
  if (!user) {
    return <Login signIn={signIn} signUp={signUp} authError={authError} />
  }
  return <Dashboard user={user} role={role} signOut={signOut} />
}

function Dashboard({ user, role, signOut }) {
  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    status,
    alerts,
    history,
    publishCommand,
    claimDevice,
    claimError,
  } = useDevices(user, role)
  const isAdmin = role === 'admin'
  const [showClaim, setShowClaim] = useState(false)

  const underFaulted = status?.underground_pct === -1
  const roofFaulted = status?.roof_pct === -1
  const selected = devices.find((d) => d.id === selectedDeviceId)
  const deviceLabel = isAdmin && selected?.internalLabel ? selected.internalLabel : status?.device_name || selected?.customerName

  return (
    <div className="min-h-screen bg-slate-950 pb-10 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-4xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                AquaControl{deviceLabel ? <span className="text-slate-400"> · {deviceLabel}</span> : null}
                {isAdmin && <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">ADMIN</span>}
              </h1>
              <p className="text-xs text-slate-500">
                {status ? (
                  <>
                    State: <span className="text-slate-300">{status.state}</span> · Mode:{' '}
                    <span className="text-slate-300">{status.mode}</span>
                  </>
                ) : devices.length === 0 ? (
                  'No devices yet'
                ) : (
                  'Waiting for data…'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">{user.email}</span>
              <button
                onClick={signOut}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <DeviceSelector devices={devices} selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} isAdmin={isAdmin} />
            {!isAdmin && (
              <button onClick={() => setShowClaim((v) => !v)} className="shrink-0 text-xs text-cyan-400 hover:text-cyan-300">
                {showClaim ? 'Cancel' : '+ Add device'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {(devices.length === 0 || showClaim) && !isAdmin && (
          <ClaimDevice claimDevice={claimDevice} claimError={claimError} />
        )}

        {devices.length > 0 && (
          <>
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
            <ManualControls status={status} publishCommand={publishCommand} isAdmin={isAdmin} />
            <HistoryChart history={history} />
            <AlertLog alerts={alerts} />
          </>
        )}
      </main>
    </div>
  )
}
