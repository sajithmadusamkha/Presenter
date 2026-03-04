import { useState } from 'react'
import type { Song } from '../../../shared/song-types'
import SongList from './SongList'
import SongEditor from './SongEditor'

export default function LibraryView(): JSX.Element {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSelect = (song: Song): void => {
    setSelectedSong(song)
  }

  const handleCreated = (song: Song): void => {
    setSelectedSong(song)
    setRefreshKey((k) => k + 1)
  }

  const handleDeleted = (): void => {
    setSelectedSong(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <SongList
        selectedId={selectedSong?.id ?? null}
        onSelect={handleSelect}
        onCreated={handleCreated}
        refreshKey={refreshKey}
      />

      <div className="flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-base)' }}>
        {selectedSong ? (
          <SongEditor key={selectedSong.id} songId={selectedSong.id} onDeleted={handleDeleted} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Select a song to edit, or create a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
