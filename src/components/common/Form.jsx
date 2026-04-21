import { Search } from 'lucide-react'

export function Input({
  icon: Icon,
  className = '',
  wrapperClassName = '',
  type = 'text',
  ...props
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      {Icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <Icon size={14} />
        </span>
      )}
      <input
        type={type}
        className={`h-9 w-full rounded-md border border-bg-border bg-bg-base px-3 ${
          Icon ? 'pl-8' : ''
        } text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/40 ${className}`}
        {...props}
      />
    </div>
  )
}

export function SearchInput(props) {
  return <Input icon={Search} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`h-9 rounded-md border border-bg-border bg-bg-base px-3 text-sm text-text-primary outline-none transition-colors focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/40 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-md border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/40 ${className}`}
      {...props}
    />
  )
}

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm text-text-secondary hover:text-text-primary ${className}`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-bg-border bg-bg-base text-brand-400 accent-brand-400 focus-ring"
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  )
}
