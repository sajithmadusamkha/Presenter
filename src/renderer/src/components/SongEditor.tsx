import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { SongWithSections, SongSection, SectionType } from '../../../shared/song-types'
import { splitSectionToSlides } from '../lib/split-slides'
import type { SlidePayload } from '../../../shared/ipc-channels'
import SectionCard from './SectionCard'
import RichToolbar from './RichToolbar'
import ConfirmDialog from './ConfirmDialog'

type EditorTab = 'words' | 'slides'

interface Props {
  songId: number | null   // null = new song (not yet in DB)
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
  const [saved, setSaved] = useState<SongWithSections | null>(null)
  const [draft, setDraft] = useState<SongWithSections | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [activeTab, setActiveTab] = useState<EditorTab>('words')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // The tiptap Editor instance of whichever SectionCard is currently focused
  const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null)
  // Which slide is selected in the right-side preview
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)
  const [titleError, setTitleError] = useState(false)
  // Track whether this started as a new song (prop is null) even after addSection assigns an id
  const [createdId, setCreatedId] = useState<number | null>(null)

  const EMPTY_SONG: SongWithSections = { id: 0, title: '', artist: null, tags: [], sections: [], createdAt: '', updatedAt: '' }

  const load = useCallback(async () => {
    if (songId === null) {
      // New song — start with empty draft, no DB call
      setSaved(EMPTY_SONG)
      setDraft(EMPTY_SONG)
      setTagInput('')
      setShowDeleteConfirm(false)
      return
    }
    const s = await window.presenterSongs.get(songId)
    setSaved(s)
    setDraft(s)
    setTagInput('')
    setShowDeleteConfirm(false)
  }, [songId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Derive all slides from current draft sections (for the right-side preview)
  const allSlides: SlidePayload[] = draft
    ? draft.sections.flatMap((s) => splitSectionToSlides(s))
    : []
  const previewSlide = allSlides[selectedSlideIndex] ?? allSlides[0] ?? null

  // Keep selectedSlideIndex in bounds when sections change
  useEffect(() => {
    setSelectedSlideIndex((i) => Math.min(i, Math.max(0, allSlides.length - 1)))
  }, [allSlides.length])

  if (!draft || !saved) {
    return (
      <div className="flex h-full items-center justify-center">
        <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
      </div>
    )
  }

  // isNew = originally opened as new song (not yet committed by user)
  const isNew = songId === null
  // effectiveSongId = the real DB id once addSection has created the record
  const effectiveSongId = songId ?? createdId
  const dirty = isNew
    ? draft.title.trim() !== '' || draft.sections.length > 0
    : JSON.stringify(draft) !== JSON.stringify(saved)

  const closeWindow = (): void => { window.presenterControl.closeEditor() }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (): Promise<boolean> => {
    if (!draft.title.trim()) {
      setTitleError(true)
      return false
    }
    setTitleError(false)
    setSaving(true)
    try {
      let baseSong: SongWithSections

      if (effectiveSongId === null) {
        // Truly new — no sections added yet so song not in DB at all
        const created = await window.presenterSongs.create({ title: draft.title.trim() })
        const updated = await window.presenterSongs.update(created.id, {
          title: created.title,
          artist: draft.artist ?? undefined,
          tags: draft.tags
        })
        baseSong = { ...(updated ?? created), sections: [] }
        setCreatedId(created.id)
      } else {
        // Either an existing song OR a new song that already has a DB record (from addSection)
        const updated = await window.presenterSongs.update(effectiveSongId, {
          title: draft.title.trim(),
          artist: draft.artist ?? undefined,
          tags: draft.tags
        })
        baseSong = { ...(updated ?? draft), sections: [] }
      }

      const savedSections: SongSection[] = []
      for (const section of draft.sections) {
        const s = await window.presenterSongs.upsertSection({
          id: section.id > 0 ? section.id : undefined,
          songId: baseSong.id,
          type: section.type,
          label: section.label,
          content: section.content,
          sortOrder: section.sortOrder
        })
        savedSections.push(s)
      }

      const newSaved: SongWithSections = { ...baseSong, sections: savedSections }
      setSaved(newSaved)
      setDraft(newSaved)
      return true
    } finally {
      setSaving(false)
    }
  }

  // OK = validate title → save if dirty → close
  const handleOk = async (): Promise<void> => {
    if (saving) return   // prevent double-click
    if (!draft.title.trim()) {
      setTitleError(true)
      return
    }
    if (dirty) {
      const ok = await handleSave()
      if (!ok) return
    }
    closeWindow()
  }

  // Cancel = discard and close
  const handleCancel = (): void => { closeWindow() }

  // ── Tags ──────────────────────────────────────────────────────────────────

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || draft.tags.includes(tag)) { setTagInput(''); return }
    setDraft((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev)
    setTagInput('')
  }

  const removeTag = (tag: string): void => {
    setDraft((prev) => prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev)
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  const handleSectionChange = (updated: SongSection): void => {
    setDraft((prev) => {
      if (!prev) return prev
      return { ...prev, sections: prev.sections.map((s) => s.id === updated.id ? updated : s) }
    })
  }

  const handleSectionDelete = async (id: number): Promise<void> => {
    await window.presenterSongs.deleteSection(id)
    const remove = (song: SongWithSections): SongWithSections => ({
      ...song,
      sections: song.sections.filter((s) => s.id !== id).map((s, i) => ({ ...s, sortOrder: i }))
    })
    setSaved((prev) => prev ? remove(prev) : prev)
    setDraft((prev) => prev ? remove(prev) : prev)
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
    let targetId: number

    // If this is a new unsaved song with no DB record yet, create it in DB first
    if (effectiveSongId === null) {
      const created = await window.presenterSongs.create({
        title: draft.title.trim() || 'Untitled'
      })
      targetId = created.id
      setCreatedId(created.id)
      setSaved((prev) => prev ? { ...prev, id: created.id, title: created.title } : prev)
      setDraft((prev) => prev ? { ...prev, id: created.id, title: created.title } : prev)
    } else {
      targetId = effectiveSongId
    }

    const newSection = await window.presenterSongs.upsertSection({
      songId: targetId, type, label, content: '', sortOrder: draft.sections.length
    })
    const add = (song: SongWithSections): SongWithSections => ({
      ...song, sections: [...song.sections, newSection]
    })
    setSaved((prev) => prev ? add(prev) : prev)
    setDraft((prev) => prev ? add(prev) : prev)
    setAddingSection(false)
  }

  const handleDeleteSong = async (): Promise<void> => {
    await window.presenterSongs.delete(draft.id)
    onDeleted()
    window.close()
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-base)' }}>

      {/* ── Title row ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
      >
        <div className="flex flex-1 flex-col">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => {
              setTitleError(false)
              setDraft((prev) => prev ? { ...prev, title: e.target.value } : prev)
            }}
            className="bg-transparent text-base font-bold outline-none"
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: titleError ? '1px solid #dc2626' : '1px solid transparent'
            }}
            placeholder="Song title *"
          />
          {titleError && (
            <span className="mt-0.5 text-xs" style={{ color: '#dc2626' }}>
              Title is required
            </span>
          )}
        </div>
        <input
          type="text"
          value={draft.artist ?? ''}
          onChange={(e) => setDraft((prev) => prev ? { ...prev, artist: e.target.value } : prev)}
          className="w-40 bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-text-muted)' }}
          placeholder="Artist"
        />
        {/* Tags inline */}
        <div className="flex flex-wrap items-center gap-1">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-accent)' }}
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100" style={{ color: 'var(--color-text-muted)' }}>×</button>
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
            style={{ color: 'var(--color-text-muted)', width: '3.5rem' }}
          />
        </div>
      </div>

      {/* ── Global RichToolbar (tracks focused section editor) ────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <RichToolbar editor={focusedEditor} />
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
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

      {/* ── Main body: left list + right preview ──────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: section list (Words) or slide list (Slides) */}
        <div
          className="flex w-80 shrink-0 flex-col overflow-hidden border-r"
          style={{ borderColor: 'var(--color-border)', minWidth: 0 }}
        >
          {activeTab === 'slides' ? (
            /* Slides tab: slide cards */
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
              {allSlides.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No slides yet.<br />Add sections in Words tab.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {allSlides.map((slide, i) => (
                    <button
                      key={slide.id}
                      onClick={() => setSelectedSlideIndex(i)}
                      className="w-full rounded-lg border text-left transition-colors"
                      style={{
                        borderColor: i === selectedSlideIndex ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-overlay)',
                        boxShadow: i === selectedSlideIndex ? '0 0 0 1px var(--color-accent)' : 'none'
                      }}
                    >
                      {/* Mini slide preview — 16:9 black area */}
                      <div
                        className="flex w-full items-center justify-center rounded-t-lg px-4 py-5"
                        style={{ backgroundColor: '#000', aspectRatio: '16/9' }}
                      >
                        <p
                          className="line-clamp-3 whitespace-pre-line text-center text-xs leading-relaxed"
                          style={{ color: '#fff' }}
                        >
                          {slide.body.replace(/<[^>]+>/g, '')}
                        </p>
                      </div>
                      {/* Label */}
                      <div className="px-3 py-2">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                          {slide.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Words tab: section cards */
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
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
                    onFocusEditor={setFocusedEditor}
                  />
                ))}

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
                          style={{ backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
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
          )}
        </div>

        {/* Right: always-visible slide preview */}
        <div className="flex flex-1 flex-col overflow-hidden bg-black">
          {previewSlide ? (
            <div className="flex h-full flex-col items-center justify-center px-12">
              {previewSlide.body.trimStart().startsWith('<') ? (
                <div
                  className="slide-body text-center leading-relaxed"
                  style={{ color: '#ffffff', fontSize: '2rem' }}
                  dangerouslySetInnerHTML={{ __html: previewSlide.body }}
                />
              ) : (
                <p
                  className="whitespace-pre-line text-center leading-relaxed"
                  style={{ color: '#ffffff', fontSize: '2rem' }}
                >
                  {previewSlide.body}
                </p>
              )}
              {previewSlide.title && (
                <p
                  className="absolute bottom-4 right-4 text-xs"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {previewSlide.title}
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: '#4b5563' }}>
                {draft.sections.length === 0 ? 'Add sections to see a preview' : 'No slides'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t px-4 py-3"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', position: 'relative', zIndex: 10 }}
      >
        <div className="flex items-center justify-between">
          {!isNew ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs transition-colors hover:text-red-400"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Delete song
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Saving…</span>
            )}
            <button
              onClick={handleCancel}
              className="rounded px-4 py-1.5 text-xs"
              style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleOk}
              disabled={saving}
              className="rounded px-4 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete "${draft.title || 'Untitled'}"`}
          message="This song will be permanently deleted. This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteSong}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
