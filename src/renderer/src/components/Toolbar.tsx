type OutputState = 'idle' | 'live' | 'blank'

interface Props {
  outputState: OutputState
  hasSelection: boolean
  liveTitle: string | null
  warning: string | null
  onGoLive: () => void
  onBlank: () => void
  onClear: () => void
}

export default function Toolbar({
  outputState,
  hasSelection,
  liveTitle,
  warning,
  onGoLive,
  onBlank,
  onClear
}: Props): JSX.Element {
  const isBlank = outputState === 'blank'
  const isLive = outputState === 'live'

  return (
    <div
      className="flex h-11 shrink-0 items-center gap-2 border-b px-3"
      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      {/* Left: file actions (stubs for Phase 3) */}
      <button
        className="rounded px-2.5 py-1 text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        title="New service (coming soon)"
      >
        New
      </button>
      <button
        className="rounded px-2.5 py-1 text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        title="Open service (coming soon)"
      >
        Open
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        {warning ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="max-w-xs truncate font-mono text-xs" style={{ color: '#ef4444' }}>
              {warning}
            </span>
          </>
        ) : isLive ? (
          <>
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: 'var(--color-live)' }}
            />
            <span className="max-w-xs truncate font-mono text-xs" style={{ color: 'var(--color-live)' }}>
              LIVE{liveTitle ? ` — ${liveTitle}` : ''}
            </span>
          </>
        ) : isBlank ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className="font-mono text-xs" style={{ color: '#f59e0b' }}>BLANK</span>
          </>
        ) : (
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>Output idle</span>
        )}
      </div>

      <div className="mx-2 h-4 w-px" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Right: output controls */}
      <button
        onClick={onGoLive}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-live)' }} />
        Go Live
      </button>

      <button
        onClick={onBlank}
        className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
        style={{
          backgroundColor: isBlank ? '#92400e' : 'var(--color-bg-overlay)',
          color: isBlank ? '#fcd34d' : 'var(--color-text-muted)',
          border: `1px solid ${isBlank ? '#92400e' : 'var(--color-border)'}`
        }}
      >
        {isBlank ? 'Restore' : 'Black'}
      </button>

      <button
        onClick={onClear}
        className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
        style={{
          backgroundColor: 'var(--color-bg-overlay)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)'
        }}
      >
        Clear
      </button>
    </div>
  )
}
