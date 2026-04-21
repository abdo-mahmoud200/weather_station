export default function LiveDot({ tone = 'success', size = 'md', className = '' }) {
  const colors = {
    success: 'bg-brand-400',
    warning: 'bg-accent-warning',
    danger: 'bg-accent-danger',
    info: 'bg-accent-info',
    purple: 'bg-accent-purple',
    orange: 'bg-accent-orange',
    muted: 'bg-text-muted',
  }
  const sizes = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-2.5 w-2.5' }
  return (
    <span className={`relative inline-flex ${sizes[size]} ${className}`}>
      <span
        className={`absolute inline-flex h-full w-full animate-pulse-dot rounded-full ${colors[tone]} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full ${sizes[size]} ${colors[tone]}`} />
    </span>
  )
}
