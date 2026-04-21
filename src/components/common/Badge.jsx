const tones = {
  neutral: 'bg-bg-elevated text-text-secondary border-bg-border',
  success: 'bg-accent-successSoft text-brand-300 border-brand-400/30',
  warning: 'bg-accent-warningSoft text-accent-warning border-accent-warning/30',
  danger: 'bg-accent-dangerSoft text-accent-danger border-accent-danger/30',
  info: 'bg-accent-infoSoft text-accent-info border-accent-info/30',
  purple: 'bg-accent-purpleSoft text-accent-purple border-accent-purple/30',
  orange: 'bg-accent-orangeSoft text-accent-orange border-accent-orange/30',
}

const sizes = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
}

export default function Badge({
  tone = 'neutral',
  size = 'sm',
  dot = false,
  icon: Icon,
  className = '',
  children,
}) {
  const cls = [
    'inline-flex items-center gap-1.5 rounded-md border font-medium uppercase tracking-wide',
    tones[tone],
    sizes[size],
    className,
  ].join(' ')

  const dotColors = {
    neutral: 'bg-text-muted',
    success: 'bg-brand-400',
    warning: 'bg-accent-warning',
    danger: 'bg-accent-danger',
    info: 'bg-accent-info',
    purple: 'bg-accent-purple',
    orange: 'bg-accent-orange',
  }

  return (
    <span className={cls}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />}
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

/**
 * Derive badge tone from a station state / severity string.
 */
export const stateToneMap = {
  Running: 'success',
  Collecting: 'info',
  Summarizing: 'info',
  Transmitting: 'info',
  Powersave: 'info',
  Testing: 'purple',
  Configuring: 'orange',
  Controlled: 'purple',
  Shutdown: 'danger',
  Offline: 'danger',
  Warning: 'warning',
  OK: 'success',
  Failed: 'danger',
  new: 'danger',
  acknowledged: 'warning',
  resolved: 'success',
  info: 'info',
  warning: 'warning',
  critical: 'danger',
}
