import { useEffect, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

/**
 * Confirmation dialog. When `confirmPhrase` is set, the user must
 * type it exactly before the confirm button activates (per UX rule:
 * "Dangerous actions require typed confirmation").
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmPhrase,
  loading = false,
}) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  const confirmEnabled = confirmPhrase ? typed === confirmPhrase : true

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={!confirmEnabled}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            variant === 'danger'
              ? 'border-accent-danger/30 bg-accent-dangerSoft text-accent-danger'
              : variant === 'warning'
                ? 'border-accent-warning/30 bg-accent-warningSoft text-accent-warning'
                : 'border-bg-border bg-bg-elevated text-text-secondary'
          }`}
        >
          <AlertTriangle size={18} />
        </span>
        <div className="flex-1 space-y-3">
          {description && <p className="text-sm text-text-secondary">{description}</p>}
          {confirmPhrase && (
            <div className="space-y-1.5">
              <p className="text-xs text-text-muted">
                Type{' '}
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-text-primary">
                  {confirmPhrase}
                </span>{' '}
                to confirm.
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-md border border-bg-border bg-bg-base px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-brand-400"
                placeholder={confirmPhrase}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
