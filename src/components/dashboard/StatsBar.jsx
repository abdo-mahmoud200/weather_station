import { CheckCircle2, AlertTriangle, XCircle, BatteryLow, Thermometer } from 'lucide-react'

/**
 * Top-of-dashboard stats row. Each tile color-codes a status bucket.
 */
export default function StatsBar({ stats, loading }) {
  const tiles = [
    {
      key: 'online',
      label: 'Stations Online',
      value: stats.online,
      icon: CheckCircle2,
      tone: 'success',
    },
    {
      key: 'warnings',
      label: 'With Warnings',
      value: stats.warnings,
      icon: AlertTriangle,
      tone: 'warning',
    },
    {
      key: 'offline',
      label: 'Offline',
      value: stats.offline,
      icon: XCircle,
      tone: 'danger',
    },
    {
      key: 'powersave',
      label: 'Powersave Mode',
      value: stats.powersave,
      icon: BatteryLow,
      tone: 'info',
    },
    {
      key: 'avgAirTemperature',
      label: 'Average Air Temp',
      value:
        typeof stats.avgAirTemperature === 'number'
          ? stats.avgAirTemperature.toFixed(1)
          : '--',
      unit: 'deg C',
      icon: Thermometer,
      tone: 'info',
    },
  ]

  const toneStyles = {
    success: {
      ring: 'ring-brand-400/20',
      bg: 'from-brand-500/15 to-transparent',
      icon: 'text-brand-300 bg-brand-500/10 border-brand-400/30',
      value: 'text-brand-300',
    },
    warning: {
      ring: 'ring-accent-warning/20',
      bg: 'from-accent-warning/15 to-transparent',
      icon: 'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
      value: 'text-accent-warning',
    },
    danger: {
      ring: 'ring-accent-danger/20',
      bg: 'from-accent-danger/15 to-transparent',
      icon: 'text-accent-danger bg-accent-danger/10 border-accent-danger/30',
      value: 'text-accent-danger',
    },
    info: {
      ring: 'ring-accent-info/20',
      bg: 'from-accent-info/15 to-transparent',
      icon: 'text-accent-info bg-accent-info/10 border-accent-info/30',
      value: 'text-accent-info',
    },
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {tiles.map((t) => {
        const s = toneStyles[t.tone]
        const Icon = t.icon
        return (
          <div
            key={t.key}
            className={`relative overflow-hidden rounded-xl border border-bg-border bg-bg-surface p-4 ring-1 ${s.ring}`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.bg} opacity-70`} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {t.label}
                </div>
                <div className={`metric-value mt-2 flex items-end gap-1.5 ${s.value}`}>
                  {loading ? (
                    <span className="skeleton inline-block h-7 w-16 align-middle" />
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{t.value}</span>
                      {t.unit && (
                        <span className="pb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                          {t.unit}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${s.icon}`}
              >
                <Icon size={16} strokeWidth={2.25} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
