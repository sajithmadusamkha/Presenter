import { contextBridge, ipcRenderer } from 'electron'
import { IPC, SlidePayload } from '../shared/ipc-channels'
import type {
  CreateSongInput,
  UpdateSongInput,
  SectionUpsertInput,
  SongListQuery
} from '../shared/song-types'

contextBridge.exposeInMainWorld('presenterControl', {
  goLive: (payload: SlidePayload): Promise<{ success: boolean; reason?: string }> =>
    ipcRenderer.invoke(IPC.GO_LIVE, payload),
  blank: (): Promise<void> => ipcRenderer.invoke(IPC.BLANK),
  clear: (): Promise<void> => ipcRenderer.invoke(IPC.CLEAR)
})

contextBridge.exposeInMainWorld('presenterSongs', {
  list: (query?: SongListQuery) => ipcRenderer.invoke(IPC.SONG_LIST, query),
  get: (id: number) => ipcRenderer.invoke(IPC.SONG_GET, id),
  create: (input: CreateSongInput) => ipcRenderer.invoke(IPC.SONG_CREATE, input),
  update: (id: number, patch: UpdateSongInput) => ipcRenderer.invoke(IPC.SONG_UPDATE, id, patch),
  delete: (id: number) => ipcRenderer.invoke(IPC.SONG_DELETE, id),
  upsertSection: (data: SectionUpsertInput) => ipcRenderer.invoke(IPC.SECTION_UPSERT, data),
  deleteSection: (id: number) => ipcRenderer.invoke(IPC.SECTION_DELETE, id),
  reorderSections: (songId: number, orderedIds: number[]) =>
    ipcRenderer.invoke(IPC.SECTION_REORDER, songId, orderedIds)
})
