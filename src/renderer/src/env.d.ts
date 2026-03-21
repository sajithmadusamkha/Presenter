/// <reference types="vite/client" />

import type { SlidePayload } from '../../../shared/ipc-channels'
import type {
  Song,
  SongWithSections,
  SongSection,
  CreateSongInput,
  UpdateSongInput,
  SectionUpsertInput,
  SongListQuery
} from '../../../shared/song-types'

declare global {
  interface Window {
    presenterControl: {
      goLive: (payload: SlidePayload) => Promise<{ success: boolean; reason?: string }>
      blank: () => Promise<void>
      clear: () => Promise<void>
      openSongEditor: (songId: number | 'new') => Promise<void>
      closeEditor: () => Promise<void>
    }
    presenterSongs: {
      list: (query?: SongListQuery) => Promise<Song[]>
      get: (id: number) => Promise<SongWithSections | null>
      create: (input: CreateSongInput) => Promise<Song>
      update: (id: number, patch: UpdateSongInput) => Promise<Song | null>
      delete: (id: number) => Promise<void>
      upsertSection: (data: SectionUpsertInput) => Promise<SongSection>
      deleteSection: (id: number) => Promise<void>
      reorderSections: (songId: number, orderedIds: number[]) => Promise<void>
    }
  }
}
