import { useState, useEffect, useCallback } from 'react'
import type { Song } from '../../../shared/song-types'

interface Props {
  selectedId: number | null
  onSelect: (song: Song) => void
  onCreated: (song: Song) => void
  refreshKey: number
}

export default function SongList({ selectedId, onSelect, onCreated, refreshKey }: Props): JSX.Element {
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')

  const load = useCallback(async () => {
    const query = {
      search: search.trim() || undefined,
      tags: tagFilter ? [tagFilter] : undefined
    }
    const result = await window.presenterSongs.list(query)
    setSongs(result)
  }, [search, tagFilter])

  useEffect(() => { load() }, [load, refreshKey])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search, load])

  // All unique tags across songs
  const [allTags, setAllTags] = useState<string[]>([])
  useEffect(() => {
    const tags = new Set<string>()
    songs.forEach((s) => s.tags.forEach((t) => tags.add(t)))
    setAllTags([...tags].sort())
  }, [songs])

  const handleCreate = async (): Promise<void> => {
    const song = await window.presenterSongs.create({ title: 'Untitled Song' })
    setSongs((prev) => [song, ...prev])
    onCreated(song)
  }

  return (
    <div
      className="flex w-72 flex-shrink-0 flex-col border-r"
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
          songs.map((song) => {
            const isSelected = song.id === selectedId
            return (
              <button
                key={song.id}
                onClick={() => onSelect(song)}
                className="w-full px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--color-bg-overlay)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent'
                }}
              >
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                >
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
              </button>
            )
          })
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
    </div>
  )
}
