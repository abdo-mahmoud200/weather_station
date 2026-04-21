export default function Card({
  as: AsComponent = 'div',
  interactive = false,
  className = '',
  children,
  ...props
}) {
  const cls = [
    'card',
    interactive && 'card-hover cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <AsComponent className={cls} {...props}>
      {children}
    </AsComponent>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 border-b border-bg-border px-4 py-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-elevated text-text-secondary">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="truncate text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function CardFooter({ className = '', children }) {
  return (
    <div className={`border-t border-bg-border px-4 py-3 text-xs text-text-muted ${className}`}>
      {children}
    </div>
  )
}
