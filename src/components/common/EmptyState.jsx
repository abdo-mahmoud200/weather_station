export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-bg-border bg-bg-surface/40 px-6 py-10 text-center ${className}`}
    >
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-bg-border bg-bg-elevated text-text-muted">
          <Icon size={22} strokeWidth={1.75} />
        </span>
      )}
      <div>
        <h4 className="font-display text-sm font-semibold text-text-primary">{title}</h4>
        {description && (
          <p className="mt-1 max-w-md text-xs text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
