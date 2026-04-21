import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = ++idSeq
      const t = {
        id,
        type: 'info',
        duration: 4500,
        ...toast,
      }
      setToasts((list) => [...list, t])
      if (t.duration > 0) {
        setTimeout(() => dismiss(id), t.duration)
      }
      return id
    },
    [dismiss],
  )

  const api = {
    push,
    dismiss,
    success: (message, opts) => push({ type: 'success', message, ...opts }),
    info: (message, opts) => push({ type: 'info', message, ...opts }),
    warning: (message, opts) => push({ type: 'warning', message, ...opts }),
    error: (message, opts) => push({ type: 'error', message, ...opts }),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const typeStyles = {
  success: {
    icon: CheckCircle2,
    border: 'border-brand-400/40',
    bg: 'bg-accent-successSoft',
    color: 'text-brand-300',
  },
  info: {
    icon: Info,
    border: 'border-accent-info/40',
    bg: 'bg-accent-infoSoft',
    color: 'text-accent-info',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-accent-warning/40',
    bg: 'bg-accent-warningSoft',
    color: 'text-accent-warning',
  },
  error: {
    icon: XCircle,
    border: 'border-accent-danger/40',
    bg: 'bg-accent-dangerSoft',
    color: 'text-accent-danger',
  },
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const s = typeStyles[t.type] || typeStyles.info
        const Icon = s.icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border ${s.border} bg-bg-surface p-3 shadow-xl animate-slide-in`}
          >
            <span className={`mt-0.5 ${s.color}`}>
              <Icon size={16} strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              {t.title && (
                <div className="text-sm font-semibold text-text-primary">{t.title}</div>
              )}
              <div className="text-sm text-text-secondary">{t.message}</div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary focus-ring"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
