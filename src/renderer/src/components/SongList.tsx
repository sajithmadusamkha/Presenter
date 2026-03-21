import { useState, useEffect, useCallback, useRef } from 'react'
import type { Song } from '../../../shared/song-types'
import ConfirmDialog from './ConfirmDialog'

interface ContextMenu {
  x: number
  y: number
  song: Song
}

interface Props {
  onCreated: (song: Song) => void
  refreshKey: number
}

export default function SongList({ onCreated, refreshKey }: Props): JSX.Element {
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [deletingSong, setDeletingSong] = useState<Song | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const result = await window.presenterSongs.list({
      search: search.trim() || undefined,
      tags: tagFilter ? [tagFilter] : undefined
    })
    setSongs(result)
  }, [search, tagFilter])

  useEffect(() => { load() }, [load, refreshKey])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search, load])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // All unique tags across songs
  const [allTags, setAllTags] = useState<string[]>([])
  useEffect(() => {
    const tags = new Set<string>()
    songs.forEach((s) => s.tags.forEach((t) => tags.add(t)))
    setAllTags([...tags].sort())
  }, [songs])

  // Refresh list when window regains focus (editor window may have saved a new song)
  useEffect(() => {
    const onFocus = (): void => { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const handleCreate = async (): Promise<void> => {
    await window.presenterControl.openSongEditor('new')
  }

  const handleContextMenu = (e: React.MouseEvent, song: Song): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, song })
  }

  const handleEdit = async (): Promise<void> => {
    if (!contextMenu) return
    setContextMenu(null)
    await window.presenterControl.openSongEditor(contextMenu.song.id)
  }

  const handleDeleteConfirm = (): void => {
    if (!contextMenu) return
    setDeletingSong(contextMenu.song)
    setContextMenu(null)
  }

  const handleDelete = async (): Promise<void> => {
    if (!deletingSong) return
    const song = deletingSong
    setDeletingSong(null)
    await window.presenterSongs.delete(song.id)
    setSongs((prev) => prev.filter((s) => s.id !== song.id))
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}
    >
      {/* Search */}
      <div className="border-b p-3" style={{ borderColor: 'var(--color-border)' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs…"
          className="w-full rounded border px-3 py-1.5 text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-bg-overlay)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 border-b px-3 py-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
              className="rounded-full px-2.5 py-0.5 text-xs transition-colors"
              style={{
                backgroundColor: tagFilter === tag ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
                color: tagFilter === tag ? '#fff' : 'var(--color-text-muted)'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto py-1">
        {songs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {search || tagFilter ? 'No songs match.' : 'No songs yet.'}
          </p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              onContextMenu={(e) => handleContextMenu(e, song)}
              className="w-full cursor-default px-4 py-3 text-left transition-colors select-none"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-overlay)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {song.title}
              </p>
              {song.artist && (
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {song.artist}
                </p>
              )}
              {song.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {song.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-accent)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New song button */}
      <div className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={handleCreate}
          className="w-full rounded py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          + New Song
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 overflow-hidden rounded border py-1 shadow-lg"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--color-bg-overlay)',
            borderColor: 'var(--color-border)',
            minWidth: '140px'
          }}
        >
          <div
            className="truncate px-3 py-1.5 text-xs font-semibold"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {contextMenu.song.title}
          </div>
          <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          <button
            onClick={handleEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Edit
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
            style={{ color: '#f87171' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Delete
          </button>
        </div>
      )}

      {deletingSong && (
        <ConfirmDialog
          title={`Delete "${deletingSong.title}"`}
          message="This song will be permanently deleted. This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingSong(null)}
        />
      )}
    </div>
  )
}
