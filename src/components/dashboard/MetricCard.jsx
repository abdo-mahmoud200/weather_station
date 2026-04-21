import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatMetric, isAnomalous, timeAgo } from '../../utils/formatters'

/**
 * Compact metric tile used on dashboard and detail views.
 */
export default function MetricCard({
  label,
  value,
  unit,
  min,
  max,
  avg,
  icon: Icon,
  trend,
  metricKey,
  digits = 1,
  footer,
  updatedAt,
  className = '',
}) {
  const anomaly = isAnomalous(metricKey, value)
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null
  const trendTone =
    trend === 'up' ? 'text-brand-300' : trend === 'down' ? 'text-accent-info' : 'text-text-muted'

  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-elevated text-text-secondary">
              <Icon size={14} strokeWidth={2} />
            </span>
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {label}
          </span>
        </div>
        {TrendIcon && (
          <span className={`flex items-center gap-0.5 ${trendTone}`}>
            <TrendIcon size={14} strokeWidth={2.5} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`metric-value text-2xl font-bold ${
            anomaly ? 'text-accent-danger' : 'text-text-primary'
          }`}
        >
          {value === null || value === undefined || Number.isNaN(Number(value))
            ? '--'
            : Number(value).toFixed(digits)}
        </span>
        {unit && <span className="text-sm font-medium text-text-muted">{unit}</span>}
      </div>

      {(min !== undefined || max !== undefined || avg !== undefined) && (
        <div className="mt-3 grid grid-cols-3 divide-x divide-bg-border rounded-md border border-bg-border bg-bg-elevated/40">
          <Stat label="Min" value={formatMetric(min, unit, digits)} />
          <Stat label="Avg" value={formatMetric(avg, unit, digits)} />
          <Stat label="Max" value={formatMetric(max, unit, digits)} />
        </div>
      )}

      {(footer || updatedAt) && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
          <span>{footer}</span>
          {updatedAt && <span className="font-mono">updated {timeAgo(updatedAt)}</span>}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="px-2 py-2 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="metric-value text-xs text-text-primary">{value}</div>
    </div>
  )
}
