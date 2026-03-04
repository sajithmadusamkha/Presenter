import { useState, useEffect, useCallback } from 'react'
import type { SongWithSections, SongSection, SectionType } from '../../../shared/song-types'
import SectionCard from './SectionCard'
import SlidesTab from './SlidesTab'

type EditorTab = 'words' | 'slides'

interface Props {
  songId: number
  onDeleted: () => void
}

const SECTION_TYPE_DEFAULTS: { type: SectionType; label: string }[] = [
  { type: 'verse', label: 'Verse 1' },
  { type: 'chorus', label: 'Chorus' },
  { type: 'pre-chorus', label: 'Pre-Chorus' },
  { type: 'bridge', label: 'Bridge' },
  { type: 'tag', label: 'Tag' },
  { type: 'intro', label: 'Intro' },
  { type: 'outro', label: 'Outro' },
  { type: 'interlude', label: 'Interlude' }
]

export default function SongEditor({ songId, onDeleted }: Props): JSX.Element {
  const [song, setSong] = useState<SongWithSections | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [activeTab, setActiveTab] = useState<EditorTab>('words')

  const load = useCallback(async () => {
    const s = await window.presenterSongs.get(songId)
    setSong(s)
    setTagInput('')
  }, [songId])

  useEffect(() => {
    load()
  }, [load])

  if (!song) {
    return (
      <div className="flex h-full items-center justify-center">
        <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
      </div>
    )
  }

  // ── Field save helpers ────────────────────────────────────────────────────

  const saveField = async (patch: { title?: string; artist?: string; tags?: string[] }): Promise<void> => {
    const updated = await window.presenterSongs.update(song.id, patch)
    if (updated) setSong((prev) => prev ? { ...prev, ...updated } : prev)
  }

  // ── Tag management ────────────────────────────────────────────────────────

  const addTag = async (): Promise<void> => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || song.tags.includes(tag)) { setTagInput(''); return }
    const newTags = [...song.tags, tag]
    await saveField({ tags: newTags })
    setSong((prev) => prev ? { ...prev, tags: newTags } : prev)
    setTagInput('')
  }

  const removeTag = async (tag: string): Promise<void> => {
    const newTags = song.tags.filter((t) => t !== tag)
    await saveField({ tags: newTags })
    setSong((prev) => prev ? { ...prev, tags: newTags } : prev)
  }

  // ── Section management ────────────────────────────────────────────────────

  const handleSectionChange = async (updated: SongSection): Promise<void> => {
    setSaving(true)
    const saved = await window.presenterSongs.upsertSection({
      id: updated.id,
      songId: song.id,
      type: updated.type,
      label: updated.label,
      content: updated.content,
      sortOrder: updated.sortOrder
    })
    setSong((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === saved.id ? saved : s))
      }
    })
    setSaving(false)
  }

  const handleSectionDelete = async (id: number): Promise<void> => {
    await window.presenterSongs.deleteSection(id)
    setSong((prev) => {
      if (!prev) return prev
      const sections = prev.sections
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, sortOrder: i }))
      return { ...prev, sections }
    })
  }

  const handleMoveSection = async (index: number, direction: 'up' | 'down'): Promise<void> => {
    const sections = [...song.sections]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[sections[index], sections[swapIndex]] = [sections[swapIndex], sections[index]]
    const reordered = sections.map((s, i) => ({ ...s, sortOrder: i }))
    setSong((prev) => prev ? { ...prev, sections: reordered } : prev)
    await window.presenterSongs.reorderSections(
      song.id,
      reordered.map((s) => s.id)
    )
  }

  const addSection = async (type: SectionType, label: string): Promise<void> => {
    const saved = await window.presenterSongs.upsertSection({
      songId: song.id,
      type,
      label,
      content: '',
      sortOrder: song.sections.length
    })
    setSong((prev) => prev ? { ...prev, sections: [...prev.sections, saved] } : prev)
    setAddingSection(false)
  }

  const handleDeleteSong = async (): Promise<void> => {
    if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return
    await window.presenterSongs.delete(song.id)
    onDeleted()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Song header */}
      <div
        className="flex-shrink-0 border-b p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
      >
        {/* Title */}
        <input
          type="text"
          defaultValue={song.title}
          onBlur={(e) => saveField({ title: e.target.value.trim() || 'Untitled' })}
          className="mb-2 w-full bg-transparent text-xl font-bold outline-none"
          style={{ color: 'var(--color-text-primary)' }}
          placeholder="Song title"
        />

        {/* Artist */}
        <input
          type="text"
          defaultValue={song.artist ?? ''}
          onBlur={(e) => saveField({ artist: e.target.value.trim() || undefined })}
          className="mb-3 w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-text-muted)' }}
          placeholder="Artist / Author"
        />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {song.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
              style={{ backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-accent)' }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="opacity-60 hover:opacity-100"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            onBlur={addTag}
            placeholder="+ tag"
            className="bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text-muted)', width: '4rem' }}
          />
        </div>

        {/* Saving indicator */}
        {saving && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Saving…
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex-shrink-0 flex border-b"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
      >
        {(['words', 'slides'] as EditorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 text-sm font-medium capitalize transition-colors"
            style={{
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'slides' ? (
        <SlidesTab sections={song.sections} />
      ) : (
        <>
          {/* Words tab: section list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {song.sections.length === 0 && !addingSection && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No sections yet. Add one below.
                </p>
              )}

              {song.sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isFirst={index === 0}
                  isLast={index === song.sections.length - 1}
                  onChange={handleSectionChange}
                  onDelete={() => handleSectionDelete(section.id)}
                  onMoveUp={() => handleMoveSection(index, 'up')}
                  onMoveDown={() => handleMoveSection(index, 'down')}
                />
              ))}

              {/* Add section */}
              {addingSection ? (
                <div
                  className="rounded border p-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Choose section type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SECTION_TYPE_DEFAULTS.map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => addSection(type, label)}
                        className="rounded px-3 py-1.5 text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--color-bg-overlay)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => setAddingSection(false)}
                      className="rounded px-3 py-1.5 text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSection(true)}
                  className="rounded border border-dashed py-2 text-sm transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  + Add Section
                </button>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div
            className="flex-shrink-0 flex justify-end border-t px-4 py-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={handleDeleteSong}
              className="text-xs transition-colors hover:text-red-400"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Delete song
            </button>
          </div>
        </>
      )}
    </div>
  )
}
