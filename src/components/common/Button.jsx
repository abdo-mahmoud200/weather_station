import { forwardRef } from 'react'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-ring disabled:cursor-not-allowed disabled:opacity-50 select-none'

const sizes = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
  xl: 'h-11 px-5 text-base',
}

const variants = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset]',
  secondary:
    'bg-bg-elevated text-text-primary border border-bg-border hover:bg-bg-hover hover:border-bg-hover',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  danger:
    'bg-accent-danger text-white hover:bg-accent-danger/90 active:bg-accent-danger/80',
  warning:
    'bg-accent-warning text-black hover:bg-accent-warning/90 active:bg-accent-warning/80',
  info: 'bg-accent-info text-white hover:bg-accent-info/90',
  success: 'bg-brand-500 text-white hover:bg-brand-400',
  purple: 'bg-accent-purple text-black hover:bg-accent-purple/90',
  orange: 'bg-accent-orange text-white hover:bg-accent-orange/90',
  outline:
    'border border-bg-border text-text-primary hover:bg-bg-elevated hover:border-bg-hover',
}

const Button = forwardRef(function Button(
  {
    as: AsComponent = 'button',
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    className = '',
    children,
    ...props
  },
  ref,
) {
  const cls = [base, sizes[size], variants[variant], className].join(' ')
  return (
    <AsComponent ref={ref} className={cls} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : Icon ? (
        <Icon size={16} strokeWidth={2.25} />
      ) : null}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight size={16} strokeWidth={2.25} />}
    </AsComponent>
  )
})

export default Button
