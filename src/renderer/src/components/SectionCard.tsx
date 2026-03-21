import { useRef, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import type { SongSection, SectionType } from '../../../shared/song-types'
import { SECTION_TYPE_LABELS } from '../../../shared/song-types'
import { countSlides } from '../lib/split-slides'

const SECTION_TYPES = Object.keys(SECTION_TYPE_LABELS) as SectionType[]

const TYPE_COLORS: Record<SectionType, string> = {
  verse: '#5b5fc7',
  chorus: '#0ea5e9',
  'pre-chorus': '#8b5cf6',
  bridge: '#f59e0b',
  tag: '#10b981',
  intro: '#6b7280',
  outro: '#6b7280',
  interlude: '#ec4899'
}

interface Props {
  section: SongSection
  isFirst: boolean
  isLast: boolean
  onChange: (updated: SongSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFocusEditor: Dispatch<SetStateAction<Editor | null>>
}

export default function SectionCard({
  section,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onFocusEditor
}: Props): JSX.Element {
  const slideCount = countSlides(section)

  const latestRef = useRef({ section, onChange })
  latestRef.current = { section, onChange }

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['paragraph'] }),
      FontFamily,
      TextStyle,
      FontSize
    ],
    content: section.content || '',
    onUpdate: ({ editor: e }) => {
      const { section: s, onChange: cb } = latestRef.current
      cb({ ...s, content: e.getHTML() })
    },
    onFocus: ({ editor: e }) => {
      onFocusEditor(e)
    }
  })

  // Sync content only when the section id changes
  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(section.content || '', false)
  }, [section.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleField = <K extends keyof SongSection>(key: K, value: SongSection[K]): void => {
    latestRef.current.onChange({ ...latestRef.current.section, [key]: value })
  }

  return (
    <div
      className="rounded border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', minWidth: 0 }}
    >
      {/* Header */}
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        {/* Type badge */}
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: TYPE_COLORS[section.type] + '33', color: TYPE_COLORS[section.type] }}
        >
          <select
            value={section.type}
            onChange={(e) => handleField('type', e.target.value as SectionType)}
            className="cursor-pointer bg-transparent text-xs font-semibold outline-none"
            style={{ color: TYPE_COLORS[section.type] }}
            onClick={(e) => e.stopPropagation()}
          >
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t} style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-overlay)' }}>
                {SECTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </span>

        {/* Label */}
        <input
          type="text"
          value={section.label}
          onChange={(e) => handleField('label', e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          style={{ color: 'var(--color-text-primary)' }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Slide count */}
        {slideCount > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)' }}
          >
            {slideCount} slide{slideCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded p-1 transition-opacity disabled:opacity-30"
            style={{ color: 'var(--color-text-muted)' }}
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded p-1 transition-opacity disabled:opacity-30"
            style={{ color: 'var(--color-text-muted)' }}
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 transition-colors hover:text-red-400"
            style={{ color: 'var(--color-text-muted)' }}
            title="Delete section"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Rich text editor (no toolbar — toolbar is lifted to SongEditor) */}
      <div className="px-3 pb-3">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  )
}
