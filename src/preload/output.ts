import { contextBridge, ipcRenderer } from 'electron'
import { IPC, SlidePayload } from '../shared/ipc-channels'

const presenterOutput = {
  onSlideUpdate: (callback: (payload: SlidePayload) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: SlidePayload): void =>
      callback(payload)
    ipcRenderer.on(IPC.GO_LIVE, handler)
    return () => ipcRenderer.removeListener(IPC.GO_LIVE, handler)
  },
  onBlank: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.BLANK, handler)
    return () => ipcRenderer.removeListener(IPC.BLANK, handler)
  },
  onClear: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on(IPC.CLEAR, handler)
    return () => ipcRenderer.removeListener(IPC.CLEAR, handler)
  }
}

contextBridge.exposeInMainWorld('presenterOutput', presenterOutput)
