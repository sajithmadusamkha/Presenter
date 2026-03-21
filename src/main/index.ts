import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC, SlidePayload } from '../shared/ipc-channels'
import type { CreateSongInput, UpdateSongInput, SectionUpsertInput, SongListQuery } from '../shared/song-types'
import { initDb, getDb } from './db/index'
import * as SongsDb from './db/songs'

let controlWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null
const editorWindows = new Map<number, BrowserWindow>()

function createControlWindow(): void {
  controlWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Presenter — Control',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/control.js'),
      sandbox: false
    }
  })

  controlWindow.on('ready-to-show', () => {
    controlWindow!.show()
  })

  controlWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    controlWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    controlWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getExternalDisplay(): Electron.Display | null {
  const displays = screen.getAllDisplays()
  return displays.find((d) => d.id !== screen.getPrimaryDisplay().id) ?? null
}

function createOutputWindow(initialPayload: SlidePayload): void {
  const external = getExternalDisplay()!
  const { x, y, width, height } = external.bounds

  outputWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: 'Presenter — Output',
    show: false,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/output.js'),
      sandbox: false
    }
  })

  outputWindow.webContents.once('did-finish-load', () => {
    outputWindow!.show()
    outputWindow!.setFullScreen(true)
    setTimeout(() => {
      outputWindow?.webContents.send(IPC.GO_LIVE, initialPayload)
    }, 100)
  })

  outputWindow.on('closed', () => {
    outputWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    outputWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/output.html')
  } else {
    outputWindow.loadFile(join(__dirname, '../renderer/output.html'))
  }
}

// ── Output IPC ────────────────────────────────────────────────────────────────

ipcMain.handle(IPC.GO_LIVE, (_event, payload: SlidePayload) => {
  if (!getExternalDisplay()) {
    return { success: false, reason: 'no-external-display' }
  }
  if (!outputWindow || outputWindow.isDestroyed()) {
    createOutputWindow(payload)
  } else {
    outputWindow.webContents.send(IPC.GO_LIVE, payload)
  }
  return { success: true }
})

ipcMain.handle(IPC.BLANK, () => {
  outputWindow?.webContents.send(IPC.BLANK)
})

ipcMain.handle(IPC.CLEAR, () => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.destroy()
    outputWindow = null
  }
})

// ── Editor window IPC ─────────────────────────────────────────────────────────

ipcMain.handle(IPC.SONG_OPEN_EDITOR, (_event, songId: number | 'new') => {
  // For existing songs, if a window is already open just focus it
  if (songId !== 'new') {
    const existing = editorWindows.get(songId)
    if (existing && !existing.isDestroyed()) {
      existing.focus()
      return
    }
  }

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Song Editor',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/control.js'),
      sandbox: false
    }
  })

  const param = String(songId) // 'new' or numeric id

  win.on('ready-to-show', () => win.show())
  win.on('closed', () => {
    if (songId !== 'new') editorWindows.delete(songId as number)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?editor=${param}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { editor: param }
    })
  }

  if (songId !== 'new') editorWindows.set(songId as number, win)
})

ipcMain.handle(IPC.EDITOR_CLOSE, (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

// ── Song IPC ──────────────────────────────────────────────────────────────────

ipcMain.handle(IPC.SONG_LIST, (_event, query?: SongListQuery) =>
  SongsDb.listSongs(getDb(), query)
)

ipcMain.handle(IPC.SONG_GET, (_event, id: number) =>
  SongsDb.getSong(getDb(), id)
)

ipcMain.handle(IPC.SONG_CREATE, (_event, input: CreateSongInput) =>
  SongsDb.createSong(getDb(), input)
)

ipcMain.handle(IPC.SONG_UPDATE, (_event, id: number, patch: UpdateSongInput) =>
  SongsDb.updateSong(getDb(), id, patch)
)

ipcMain.handle(IPC.SONG_DELETE, (_event, id: number) =>
  SongsDb.deleteSong(getDb(), id)
)

ipcMain.handle(IPC.SECTION_UPSERT, (_event, data: SectionUpsertInput) =>
  SongsDb.upsertSection(getDb(), data)
)

ipcMain.handle(IPC.SECTION_DELETE, (_event, id: number) =>
  SongsDb.deleteSection(getDb(), id)
)

ipcMain.handle(IPC.SECTION_REORDER, (_event, songId: number, orderedIds: number[]) =>
  SongsDb.reorderSections(getDb(), songId, orderedIds)
)

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initDb()
  electronApp.setAppUserModelId('com.presenter')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createControlWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
