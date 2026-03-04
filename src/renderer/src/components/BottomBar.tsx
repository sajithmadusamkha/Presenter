interface Props {
  outputState: 'idle' | 'live' | 'blank'
  hasSelection: boolean
  onGoLive: () => void
  onBlank: () => void
  onClear: () => void
}

export default function BottomBar({ outputState, hasSelection, onGoLive, onBlank, onClear }: Props): JSX.Element {
  const isBlank = outputState === 'blank'

  return (
    <div
      className="flex h-14 items-center gap-3 border-t px-4"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Go Live */}
      <button
        onClick={onGoLive}
        disabled={!hasSelection}
        className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-40"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: '#fff'
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: 'var(--color-live)' }}
        />
        Go Live
      </button>

      {/* Blank Screen toggle */}
      <button
        onClick={onBlank}
        className="rounded px-4 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: isBlank ? '#92400e' : 'var(--color-bg-overlay)',
          color: isBlank ? '#fcd34d' : 'var(--color-text-muted)',
          border: `1px solid ${isBlank ? '#92400e' : 'var(--color-border)'}`
        }}
      >
        {isBlank ? 'Restore' : 'Blank Screen'}
      </button>

      {/* Clear Output */}
      <button
        onClick={onClear}
        className="rounded px-4 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: 'var(--color-bg-overlay)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)'
        }}
      >
        Clear Output
      </button>
    </div>
  )
}
