interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}: Props): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-96 overflow-hidden rounded border shadow-2xl"
        style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-overlay)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          <button
            onClick={onCancel}
            className="flex h-5 w-5 items-center justify-center rounded text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-base)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 border-t px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={onCancel}
            className="rounded px-4 py-1.5 text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded px-4 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: danger ? '#dc2626' : 'var(--color-accent)',
              color: '#fff'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
