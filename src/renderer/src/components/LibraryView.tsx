import { useState } from 'react'
import type { Song } from '../../../shared/song-types'
import SongList from './SongList'

export default function LibraryView(): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreated = (_song: Song): void => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <SongList onCreated={handleCreated} refreshKey={refreshKey} />
    </div>
  )
}
