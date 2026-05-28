import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (variant === 'danger') {
        cancelBtnRef.current?.focus()
      } else {
        confirmBtnRef.current?.focus()
      }
    }
  }, [isOpen, variant])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 id="confirm-title" style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {title}
          </h3>
        </div>
        <div className="modal-body" style={{ padding: '18px 20px' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            ref={cancelBtnRef}
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ flex: 'none', padding: '0 16px' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            className="btn"
            onClick={onConfirm}
            style={{
              flex: 'none',
              padding: '0 16px',
              background: variant === 'danger' ? 'var(--error)' : 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
              color: variant === 'danger' ? '#fff' : '#26190a',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
