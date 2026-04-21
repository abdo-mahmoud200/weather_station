export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  tone = 'brand',
  showValue = true,
  className = '',
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = {
    brand: 'bg-brand-400',
    info: 'bg-accent-info',
    warning: 'bg-accent-warning',
    danger: 'bg-accent-danger',
  }
  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && (
            <span className="metric-value text-text-primary">{pct.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={`h-full rounded-full ${colors[tone]} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
