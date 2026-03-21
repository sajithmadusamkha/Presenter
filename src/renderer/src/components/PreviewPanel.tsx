import type { Slide } from '../App'

interface Props {
  selectedSlide: Slide | null
  liveSlide: Slide | null
  width?: number
}

export default function PreviewPanel({ selectedSlide, liveSlide }: Props): JSX.Element {
  const isLive = selectedSlide !== null && liveSlide?.id === selectedSlide?.id

  return (
    <div
      className="flex h-full flex-col"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Preview
        </span>
        {isLive && (
          <span
            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-bold uppercase"
            style={{ backgroundColor: 'var(--color-live)', color: '#000' }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* 16:9 thumbnail */}
      <div className="p-4">
        <div
          className="relative w-full overflow-hidden rounded"
          style={{
            aspectRatio: '16 / 9',
            backgroundColor: '#000'
          }}
        >
          {selectedSlide ? (
            <>
              {selectedSlide.imagePath && (
                <img
                  src={selectedSlide.imagePath}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: 0.4 }}
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                <p className="text-sm font-bold leading-tight" style={{ color: '#fff' }}>
                  {selectedSlide.title}
                </p>
                <p className="mt-1 text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {selectedSlide.body}
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No slide selected
              </span>
            </div>
          )}
        </div>
      </div>

      {selectedSlide && (
        <div className="flex-1 px-4 pb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {selectedSlide.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {selectedSlide.body}
          </p>
        </div>
      )}
    </div>
  )
}
