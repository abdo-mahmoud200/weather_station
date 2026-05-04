import { Gauge, Wind, Thermometer, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import Badge from '../common/Badge'
import { formatMetric, timeAgo } from '../../utils/formatters'

const INSTRUMENT_META = {
  groundThermometer: { icon: Thermometer, label: 'Ground Thermometer' },
  anemometer: { icon: Wind, label: 'Anemometer' },
  barometer: { icon: Gauge, label: 'Barometer' },
}

const STATUS_META = {
  OK: { tone: 'success', icon: CheckCircle2 },
  Warning: { tone: 'warning', icon: AlertTriangle },
  Failed: { tone: 'danger', icon: XCircle },
}

export default function InstrumentsPanel({ instruments, lastSync }) {
  const keys = Object.keys(instruments || {})
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-text-primary">
            Instruments Health
          </h3>
          <p className="text-xs text-text-muted">Last polled {timeAgo(lastSync)}</p>
        </div>
      </div>
      <div className="divide-y divide-bg-border">
        {keys.map((k) => {
          const inst = instruments[k]
          const meta = INSTRUMENT_META[k] || { icon: Gauge, label: inst.name }
          const stat = STATUS_META[inst.status] || STATUS_META.OK
          const Icon = meta.icon
          return (
            <div key={k} className="flex flex-col gap-3 px-4 py-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                    inst.status === 'OK'
                      ? 'border-brand-400/25 bg-brand-500/10 text-brand-300'
                      : inst.status === 'Warning'
                        ? 'border-accent-warning/25 bg-accent-warningSoft text-accent-warning'
                        : 'border-accent-danger/25 bg-accent-dangerSoft text-accent-danger'
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">{meta.label}</div>
                  <div className="metric-value text-xs text-text-muted">
                    Last reading: {formatMetric(inst.lastReading, inst.unit, 1)}
                  </div>
                </div>
              </div>
              <Badge tone={stat.tone} icon={stat.icon} size="sm">
                {inst.status}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
