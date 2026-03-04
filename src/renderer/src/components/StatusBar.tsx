import type { Slide } from '../App'

interface Props {
  outputState: 'idle' | 'live' | 'blank'
  liveSlide: Slide | null
  warning: string | null
}

export default function StatusBar({ outputState, liveSlide, warning }: Props): JSX.Element {
  return (
    <div
      className="flex h-6 items-center gap-2 border-t px-4"
      style={{
        backgroundColor: 'var(--color-bg-base)',
        borderColor: 'var(--color-border)'
      }}
    >
      {warning ? (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span className="font-mono text-xs" style={{ color: '#ef4444' }}>
            {warning}
          </span>
        </>
      ) : (
        <>
          {outputState === 'live' && (
            <>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-live)' }}
              />
              <span className="font-mono text-xs" style={{ color: 'var(--color-live)' }}>
                LIVE — {liveSlide?.title}
              </span>
            </>
          )}
          {outputState === 'blank' && (
            <>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#f59e0b' }}
              />
              <span className="font-mono text-xs" style={{ color: '#f59e0b' }}>
                BLANK
              </span>
            </>
          )}
          {outputState === 'idle' && (
            <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Output idle
            </span>
          )}
        </>
      )}
    </div>
  )
}
