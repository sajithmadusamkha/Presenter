import { useState, useEffect, useCallback, useRef } from 'react'
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
  // `saved` = last persisted state from DB
  // `draft` = local edits not yet saved
  const [saved, setSaved] = useState<SongWithSections | null>(null)
  const [draft, setDraft] = useState<SongWithSections | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [activeTab, setActiveTab] = useState<EditorTab>('words')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const load = useCallback(async () => {
    const s = await window.presenterSongs.get(songId)
    setSaved(s)
    setDraft(s)
    setTagInput('')
    setShowDeleteConfirm(false)
  }, [songId])

  useEffect(() => { load() }, [load])

  const isDirty = useRef(false)

  // Track whether draft differs from saved
  useEffect(() => {
    if (!saved || !draft) { isDirty.current = false; return }
    isDirty.current = JSON.stringify(draft) !== JSON.stringify(saved)
  })

  if (!draft || !saved) {
    return (
      <div className="flex h-full items-center justify-center">
        <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
      </div>
    )
  }

  const dirty = saved && draft && JSON.stringify(draft) !== JSON.stringify(saved)

  // ── Save all changes to DB ─────────────────────────────────────────────────

  const handleSave = async (): Promise<void> => {
    if (!draft) return
    setSaving(true)
    try {
      // Save song fields
      const updatedSong = await window.presenterSongs.update(draft.id, {
        title: draft.title || 'Untitled',
        artist: draft.artist ?? undefined,
        tags: draft.tags
      })

      // Save all sections
      const savedSections: SongSection[] = []
      for (const section of draft.sections) {
        const s = await window.presenterSongs.upsertSection({
          id: section.id,
          songId: draft.id,
          type: section.type,
          label: section.label,
          content: section.content,
          sortOrder: section.sortOrder
        })
        savedSections.push(s)
      }

      const newSaved: SongWithSections = {
        ...(updatedSong ?? draft),
        sections: savedSections
      }
      setSaved(newSaved)
      setDraft(newSaved)
    } finally {
      setSaving(false)
    }
  }

  // ── Cancel: revert draft to last saved ────────────────────────────────────

  const handleCancel = (): void => {
    setDraft(saved)
    setTagInput('')
  }

  // ── Tag management ────────────────────────────────────────────────────────

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || draft.tags.includes(tag)) { setTagInput(''); return }
    setDraft((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev)
    setTagInput('')
  }

  const removeTag = (tag: string): void => {
    setDraft((prev) => prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev)
  }

  // ── Section management (draft only) ──────────────────────────────────────

  const handleSectionChange = (updated: SongSection): void => {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === updated.id ? updated : s))
      }
    })
  }

  const handleSectionDelete = async (id: number): Promise<void> => {
    // Delete from DB immediately (no undo), then remove from draft+saved
    await window.presenterSongs.deleteSection(id)
    const removeSectionById = (song: SongWithSections): SongWithSections => ({
      ...song,
      sections: song.sections
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, sortOrder: i }))
    })
    setSaved((prev) => prev ? removeSectionById(prev) : prev)
    setDraft((prev) => prev ? removeSectionById(prev) : prev)
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down'): void => {
    setDraft((prev) => {
      if (!prev) return prev
      const sections = [...prev.sections]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[sections[index], sections[swapIndex]] = [sections[swapIndex], sections[index]]
      return { ...prev, sections: sections.map((s, i) => ({ ...s, sortOrder: i })) }
    })
  }

  const addSection = async (type: SectionType, label: string): Promise<void> => {
    const saved_section = await window.presenterSongs.upsertSection({
      songId: draft.id,
      type,
      label,
      content: '',
      sortOrder: draft.sections.length
    })
    const addSection_ = (song: SongWithSections): SongWithSections => ({
      ...song,
      sections: [...song.sections, saved_section]
    })
    setSaved((prev) => prev ? addSection_(prev) : prev)
    setDraft((prev) => prev ? addSection_(prev) : prev)
    setAddingSection(false)
  }

  const handleDeleteSong = async (): Promise<void> => {
    await window.presenterSongs.delete(draft.id)
    onDeleted()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Song header */}
      <div
        className="shrink-0 border-b p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
      >
        {/* Title */}
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((prev) => prev ? { ...prev, title: e.target.value } : prev)}
          className="mb-2 w-full bg-transparent text-xl font-bold outline-none"
          style={{ color: 'var(--color-text-primary)' }}
          placeholder="Song title"
        />

        {/* Artist */}
        <input
          type="text"
          value={draft.artist ?? ''}
          onChange={(e) => setDraft((prev) => prev ? { ...prev, artist: e.target.value } : prev)}
          className="mb-3 w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-text-muted)' }}
          placeholder="Artist / Author"
        />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((tag) => (
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
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex border-b"
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
        <SlidesTab sections={draft.sections} />
      ) : (
        <>
          {/* Words tab: section list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {draft.sections.length === 0 && !addingSection && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No sections yet. Add one below.
                </p>
              )}

              {draft.sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  isFirst={index === 0}
                  isLast={index === draft.sections.length - 1}
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

          {/* Footer */}
          <div
            className="shrink-0 border-t px-4 py-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
          >
            {showDeleteConfirm ? (
              /* Delete confirmation */
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  Delete &ldquo;{draft.title}&rdquo;? This cannot be undone.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded px-3 py-1.5 text-xs transition-colors"
                    style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSong}
                    className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: '1px solid #dc2626' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              /* Normal footer: Save / Cancel / Delete */
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs transition-colors hover:text-red-400"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Delete song
                </button>
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Saving…
                    </span>
                  )}
                  {dirty && !saving && (
                    <button
                      onClick={handleCancel}
                      className="rounded px-3 py-1.5 text-xs transition-colors"
                      style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="rounded px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      backgroundColor: dirty && !saving ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
                      color: dirty && !saving ? '#fff' : 'var(--color-text-muted)',
                      border: '1px solid ' + (dirty && !saving ? 'var(--color-accent)' : 'var(--color-border)')
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
