import type { SongSection } from '../../../shared/song-types'
import type { SlidePayload } from '../../../shared/ipc-channels'

const MAX_LINES = 4

/**
 * Detect whether content is HTML (from Tiptap) or legacy plain text.
 */
function isHtml(content: string): boolean {
  return content.trimStart().startsWith('<')
}

/**
 * Split HTML content (from Tiptap) into slide HTML strings.
 * Each <p> is one line. Blank <p> (no text content) = stanza break.
 */
function splitHtmlContent(html: string, maxLines: number): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const paras = Array.from(doc.querySelectorAll('div > p'))

  // Group into stanzas separated by blank paragraphs
  const stanzas: Element[][] = []
  let current: Element[] = []
  for (const p of paras) {
    if (!p.textContent?.trim()) {
      if (current.length) { stanzas.push(current); current = [] }
    } else {
      current.push(p)
    }
  }
  if (current.length) stanzas.push(current)

  // Cap each stanza at maxLines
  const slides: string[] = []
  for (const stanza of stanzas) {
    for (let i = 0; i < stanza.length; i += maxLines) {
      slides.push(
        stanza
          .slice(i, i + maxLines)
          .map((p) => p.outerHTML)
          .join('')
      )
    }
  }
  return slides
}

/**
 * Split plain-text content (legacy) into slide plain-text strings.
 */
function splitPlainContent(content: string, maxLines: number): string[] {
  const stanzas = content
    .split(/\n[ \t]*\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const slides: string[] = []
  for (const stanza of stanzas) {
    const lines = stanza.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0)
    if (lines.length <= maxLines) {
      slides.push(lines.join('\n'))
    } else {
      for (let i = 0; i < lines.length; i += maxLines) {
        slides.push(lines.slice(i, i + maxLines).join('\n'))
      }
    }
  }
  return slides
}

/**
 * Split a song section into projection slides.
 * Supports both HTML content (Tiptap) and legacy plain text.
 */
export function splitSectionToSlides(
  section: SongSection,
  maxLines = MAX_LINES
): SlidePayload[] {
  const content = section.content?.trim()
  if (!content) return []

  const bodies = isHtml(content)
    ? splitHtmlContent(content, maxLines)
    : splitPlainContent(content, maxLines)

  return bodies.map((body, i) => ({
    id: `s${section.id}-${i}`,
    title: section.label,
    body
  }))
}

export function countSlides(section: SongSection, maxLines = MAX_LINES): number {
  return splitSectionToSlides(section, maxLines).length
}
