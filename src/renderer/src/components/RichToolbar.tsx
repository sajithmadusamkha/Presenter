import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

// Fallback fonts shown while system fonts load (or if API unavailable)
const FALLBACK_FONTS = [
  'Arial',
  'Courier New',
  'Georgia',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
]

const SIZES = ['16', '20', '24', '28', '32', '36', '40', '46', '52', '60', '72']

// Cache so all SectionCards share one load
let systemFontsCache: string[] | null = null

async function loadSystemFonts(): Promise<string[]> {
  if (systemFontsCache) return systemFontsCache
  try {
    // queryLocalFonts is available in Electron's renderer
    const fonts = await (window as Window & { queryLocalFonts?: () => Promise<{ family: string }[]> }).queryLocalFonts?.()
    if (!fonts) throw new Error('unavailable')
    // Deduplicate family names, sort alphabetically
    const families = [...new Set(fonts.map((f) => f.family))].sort()
    systemFontsCache = families
    return families
  } catch {
    systemFontsCache = FALLBACK_FONTS
    return FALLBACK_FONTS
  }
}

interface Props {
  editor: Editor | null
}

function ToolbarButton({
  active,
  onClick,
  title,
  children
}: {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className="rounded px-2 py-1 text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-muted)',
        border: '1px solid ' + (active ? 'var(--color-accent)' : 'transparent')
      }}
    >
      {children}
    </button>
  )
}

export default function RichToolbar({ editor }: Props): JSX.Element {
  const [fonts, setFonts] = useState<string[]>(systemFontsCache ?? FALLBACK_FONTS)

  useEffect(() => {
    if (systemFontsCache) return
    loadSystemFonts().then(setFonts)
  }, [])

  const disabled = !editor
  const currentFont = editor?.getAttributes('textStyle').fontFamily ?? fonts[0] ?? 'Arial'
  const currentSize = editor?.getAttributes('textStyle').fontSize?.replace('px', '') ?? '32'

  const setFont = (font: string): void => {
    editor?.chain().focus().setFontFamily(font).run()
  }

  const setSize = (size: string): void => {
    editor?.chain().focus().setFontSize(`${size}px`).run()
  }

  const divider = (
    <div className="mx-1 h-5 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
  )

  return (
    <div
      className="flex w-full flex-wrap items-center gap-1 px-3 py-1.5"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      {/* Font family */}
      <select
        value={currentFont}
        onChange={(e) => setFont(e.target.value)}
        className="rounded border px-1.5 py-0.5 text-xs outline-none"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-overlay)',
          color: 'var(--color-text-primary)',
          maxWidth: '11rem'
        }}
      >
        {fonts.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        value={currentSize}
        onChange={(e) => setSize(e.target.value)}
        className="rounded border px-1.5 py-0.5 text-xs outline-none"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-overlay)',
          color: 'var(--color-text-primary)',
          width: '4rem'
        }}
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {divider}

      {/* Bold */}
      <ToolbarButton
        active={!!editor?.isActive('bold')}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        active={!!editor?.isActive('italic')}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>

      {/* Underline placeholder */}
      <ToolbarButton
        active={false}
        onClick={() => {}}
        title="Underline (coming soon)"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolbarButton>

      {divider}

      {/* Align left */}
      <ToolbarButton
        active={!!editor?.isActive({ textAlign: 'left' })}
        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        title="Align left"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="1" width="14" height="2" rx="1"/>
          <rect x="0" y="5" width="9" height="2" rx="1"/>
          <rect x="0" y="9" width="14" height="2" rx="1"/>
          <rect x="0" y="13" width="7" height="2" rx="1" transform="translate(0 -2)"/>
        </svg>
      </ToolbarButton>

      {/* Align center */}
      <ToolbarButton
        active={!!editor?.isActive({ textAlign: 'center' })}
        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        title="Align center"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="1" width="14" height="2" rx="1"/>
          <rect x="2.5" y="5" width="9" height="2" rx="1"/>
          <rect x="0" y="9" width="14" height="2" rx="1"/>
          <rect x="3.5" y="11" width="7" height="2" rx="1"/>
        </svg>
      </ToolbarButton>

      {/* Align right */}
      <ToolbarButton
        active={!!editor?.isActive({ textAlign: 'right' })}
        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        title="Align right"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="0" y="1" width="14" height="2" rx="1"/>
          <rect x="5" y="5" width="9" height="2" rx="1"/>
          <rect x="0" y="9" width="14" height="2" rx="1"/>
          <rect x="7" y="11" width="7" height="2" rx="1"/>
        </svg>
      </ToolbarButton>

      {divider}

      {/* Text color placeholder */}
      <ToolbarButton active={false} onClick={() => {}} title="Text color (coming soon)">
        <span className="flex flex-col items-center leading-none">
          <span className="text-xs font-bold">A</span>
          <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: 'var(--color-accent)' }} />
        </span>
      </ToolbarButton>
    </div>
  )
}
