import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // autofocus panel for accessibility
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 10)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${widths[size]} rounded-xl border border-bg-border bg-bg-surface shadow-2xl focus:outline-none`}
      >
        <div className="flex items-start justify-between border-b border-bg-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary focus-ring"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-bg-border bg-bg-surface/50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
