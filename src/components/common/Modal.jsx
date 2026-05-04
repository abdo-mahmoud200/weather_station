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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 animate-fade-in sm:p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative max-h-[calc(100dvh-1.5rem)] w-full ${widths[size]} overflow-hidden rounded-xl border border-bg-border bg-bg-surface shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-2rem)]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-bg-border px-4 py-3 sm:px-5 sm:py-4">
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
        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-bg-border bg-bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
