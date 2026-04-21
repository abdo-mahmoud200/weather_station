import { BatteryCharging, MapPin, Thermometer, Wind } from 'lucide-react'
import Badge, { stateToneMap } from '../common/Badge'
import LiveDot from '../common/LiveDot'
import { degreesToCompass, formatMetric, isAnomalous, timeAgo } from '../../utils/formatters'

export default function StationCard({ station, onClick }) {
  const tone = stateToneMap[station.state] || 'neutral'
  const isOffline = !station.online || station.state === 'Shutdown'
  const anomalousTemp = isAnomalous('airTemperature', station.metrics.airTemperature.current)

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex w-full flex-col overflow-hidden rounded-xl border bg-bg-surface text-start transition-all focus-ring',
        isOffline
          ? 'border-accent-danger/20 hover:border-accent-danger/40'
          : station.hasWarning
            ? 'border-accent-warning/20 hover:border-accent-warning/40'
            : 'border-bg-border hover:border-bg-hover',
      ].join(' ')}
    >
      <span
        className={[
          'absolute left-0 top-0 h-full w-0.5',
          isOffline
            ? 'bg-accent-danger'
            : station.hasWarning
              ? 'bg-accent-warning'
              : station.state === 'Powersave'
                ? 'bg-accent-info'
                : 'bg-brand-400',
        ].join(' ')}
      />

      <div className="flex items-start justify-between p-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-muted">
              {station.id}
            </span>
            {!isOffline && <LiveDot tone={station.hasWarning ? 'warning' : 'success'} size="sm" />}
          </div>
          <h3 className="mt-0.5 truncate font-display text-sm font-semibold text-text-primary group-hover:text-brand-300">
            {station.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
            <MapPin size={11} /> {station.region}
          </p>
        </div>
        <Badge tone={tone} size="xs" dot>
          {station.state}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <MiniStat
          icon={Thermometer}
          label="Air"
          value={formatMetric(
            station.metrics.airTemperature.current,
            station.metrics.airTemperature.unit,
            1,
          )}
          tone={anomalousTemp ? 'danger' : 'default'}
        />
        <MiniStat
          icon={Wind}
          label="Wind"
          value={`${formatMetric(station.metrics.windSpeed.current, 'm/s', 1)} | ${degreesToCompass(
            station.metrics.windDirection.current,
          )}`}
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-bg-border bg-bg-base/40 px-4 py-2 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <BatteryCharging size={12} />
          <span className="metric-value">{station.battery}%</span>
        </span>
        <span className="metric-value">updated {timeAgo(station.lastSync)}</span>
      </div>
    </button>
  )
}

function MiniStat({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-bg-border bg-bg-elevated/50 px-2 py-1.5">
      <Icon size={14} className={tone === 'danger' ? 'text-accent-danger' : 'text-text-muted'} />
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
        <div
          className={`metric-value truncate text-xs ${
            tone === 'danger' ? 'text-accent-danger' : 'text-text-primary'
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
