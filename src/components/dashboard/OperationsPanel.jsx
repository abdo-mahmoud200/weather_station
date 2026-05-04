import { Activity, AlertTriangle, CloudSun, Gauge, Radio, ShieldCheck, Wind } from 'lucide-react'
import Badge from '../common/Badge'
import LiveDot from '../common/LiveDot'
import { useSocketConnection } from '../../hooks/useSocket'
import { formatMetric } from '../../utils/formatters'

export default function OperationsPanel({ summary, stations = [] }) {
  const socket = useSocketConnection()
  const hottest = summary?.maxTemp
  const coldest = summary?.minTemp
  const khamaseenStations = summary?.khamaseenStations || []
  // Backend simulator tick is 5 minutes; flag stations as stale only after
  // they miss two cycles plus a small grace window.
  const STALE_AFTER_MS = 11 * 60 * 1000
  const staleStations = stations.filter((station) => {
    const ageMs = Date.now() - new Date(station.lastSync).getTime()
    return Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS
  })

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="card p-4">
        <PanelTitle icon={Radio} title="Live Link" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiveDot tone={socket.connected ? 'success' : 'warning'} size="lg" />
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {socket.connected ? 'Socket connected' : 'REST fallback active'}
              </div>
              <div className="text-xs text-text-muted">
                {socket.connected ? 'Realtime station events are streaming.' : 'Auto-refresh keeps the dashboard current.'}
              </div>
            </div>
          </div>
          <Badge tone={socket.connected ? 'success' : 'warning'} size="xs">
            {socket.status}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <SmallStat label="Collecting" value={summary?.collecting ?? 0} />
          <SmallStat label="Transmitting" value={summary?.transmitting ?? 0} />
          <SmallStat label="Powersave" value={summary?.powersave ?? stations.filter((s) => s.state === 'Powersave').length} />
        </div>
      </div>

      <div className="card p-4">
        <PanelTitle icon={Wind} title="Khamaseen Watch" />
        <div className="mt-4">
          {khamaseenStations.length === 0 ? (
            <div className="rounded-md border border-bg-border bg-bg-elevated/40 px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <ShieldCheck size={15} className="text-brand-300" />
                No active dust wind event
              </div>
              <p className="mt-1 text-xs text-text-muted">Western and Eastern Desert stations remain under normal wind profile.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {khamaseenStations.map((event) => (
                <li key={event.stationId} className="rounded-md border border-accent-warning/30 bg-accent-warningSoft px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary">{event.stationId}</span>
                    <Badge tone="warning" size="xs">
                      {event.remainingTicks} ticks
                    </Badge>
                  </div>
                  <div className="mt-1 truncate text-xs text-text-muted">{event.stationName} | {event.region}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <PanelTitle icon={Gauge} title="Network Extremes" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ExtremeStat icon={CloudSun} label="Max temp" item={hottest} />
          <ExtremeStat icon={CloudSun} label="Min temp" item={coldest} />
        </div>
        <div className="mt-3 rounded-md border border-bg-border bg-bg-elevated/40 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <AlertTriangle size={12} />
              Stale links
            </span>
            <span className="metric-value text-sm font-semibold text-text-primary">{staleStations.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-elevated text-text-secondary">
          <Icon size={15} />
        </span>
        <h3 className="font-display text-sm font-semibold text-text-primary">{title}</h3>
      </div>
    </div>
  )
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-md border border-bg-border bg-bg-elevated/40 px-2 py-2">
      <div className="metric-value text-lg font-bold text-text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  )
}

function ExtremeStat({ icon: Icon, label, item }) {
  return (
    <div className="rounded-md border border-bg-border bg-bg-elevated/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-muted">
        <Icon size={12} />
        {label}
      </div>
      <div className="metric-value mt-1 text-lg font-semibold text-text-primary">
        {formatMetric(item?.value, 'deg C', 1)}
      </div>
      <div className="truncate text-[11px] text-text-muted">{item?.stationName || '--'}</div>
    </div>
  )
}
