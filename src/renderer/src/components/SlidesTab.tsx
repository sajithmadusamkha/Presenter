import { useState } from 'react'
import type { SongSection } from '../../../shared/song-types'
import { splitSectionToSlides } from '../lib/split-slides'
import type { SlidePayload } from '../../../shared/ipc-channels'

interface Props {
  sections: SongSection[]
}

interface SlideListItemProps {
  index: number
  slide: SlidePayload
  isSelected: boolean
  onClick: () => void
}

function SlideListItem({ index, slide, isSelected, onClick }: SlideListItemProps): JSX.Element {
  const previewLines = slide.body.split('\n').slice(0, 2).join('\n')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 border-b transition-colors"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: isSelected ? 'var(--color-bg-overlay)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent'
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-mono rounded px-1.5 py-0.5 shrink-0"
          style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)' }}
        >
          {index + 1}
        </span>
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-accent)' }}>
          {slide.title}
        </span>
      </div>
      <p
        className="text-xs leading-relaxed line-clamp-2 whitespace-pre-line"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {previewLines}
      </p>
    </button>
  )
}

export default function SlidesTab({ sections }: Props): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allSlides = sections.flatMap((s) => splitSectionToSlides(s))
  const selected = allSlides[selectedIndex] ?? null

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: slide list */}
      <div
        className="w-72 shrink-0 overflow-y-auto border-r"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
      >
        {allSlides.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No slides yet.
              <br />
              Add sections in the Words tab.
            </p>
          </div>
        ) : (
          allSlides.map((slide, i) => (
            <SlideListItem
              key={slide.id}
              index={i}
              slide={slide}
              isSelected={i === selectedIndex}
              onClick={() => setSelectedIndex(i)}
            />
          ))
        )}
      </div>

      {/* Right: preview */}
      <div className="flex flex-1 items-center justify-center bg-black">
        {selected ? (
          selected.body.trimStart().startsWith('<') ? (
            <div
              className="text-center leading-relaxed px-12 slide-body"
              style={{ color: '#ffffff', fontSize: '2rem' }}
              dangerouslySetInnerHTML={{ __html: selected.body }}
            />
          ) : (
            <p
              className="text-center leading-relaxed whitespace-pre-line px-12"
              style={{ color: '#ffffff', fontSize: '2rem' }}
            >
              {selected.body}
            </p>
          )
        ) : (
          <p className="text-sm" style={{ color: '#4b5563' }}>
            No slides
          </p>
        )}
      </div>
    </div>
  )
}
