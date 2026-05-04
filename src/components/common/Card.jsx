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
    <div className={`flex flex-col items-stretch gap-3 border-b border-bg-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-text-secondary">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="break-words text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="min-w-0 sm:shrink-0">{action}</div>}
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
