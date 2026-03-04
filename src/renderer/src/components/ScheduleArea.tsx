import type { Slide } from '../App'

interface Props {
  slides: Slide[]
  selectedSlide: Slide | null
  liveSlide: Slide | null
  onSelect: (slide: Slide) => void
}

export default function ScheduleArea({ slides, selectedSlide, liveSlide, onSelect }: Props): JSX.Element {
  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div
        className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Schedule
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {slides.map((slide) => {
          const isSelected = selectedSlide?.id === slide.id
          const isLive = liveSlide?.id === slide.id

          return (
            <button
              key={slide.id}
              onClick={() => onSelect(slide)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{
                backgroundColor: isSelected ? 'var(--color-bg-overlay)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent'
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="truncate text-sm font-medium"
                  style={{ color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
                  {slide.title}
                </div>
                <div
                  className="mt-0.5 truncate text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {slide.body}
                </div>
              </div>
              {isLive && (
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase"
                  style={{
                    backgroundColor: 'var(--color-live)',
                    color: '#000'
                  }}
                >
                  LIVE
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
