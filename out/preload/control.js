"use strict";
const electron = require("electron");
const ipcChannels = require("./chunks/ipc-channels-DiQ1ewji.js");
electron.contextBridge.exposeInMainWorld("presenterControl", {
  goLive: (payload) => electron.ipcRenderer.invoke(ipcChannels.IPC.GO_LIVE, payload),
  blank: () => electron.ipcRenderer.invoke(ipcChannels.IPC.BLANK),
  clear: () => electron.ipcRenderer.invoke(ipcChannels.IPC.CLEAR)
});
electron.contextBridge.exposeInMainWorld("presenterSongs", {
  list: (query) => electron.ipcRenderer.invoke(ipcChannels.IPC.SONG_LIST, query),
  get: (id) => electron.ipcRenderer.invoke(ipcChannels.IPC.SONG_GET, id),
  create: (input) => electron.ipcRenderer.invoke(ipcChannels.IPC.SONG_CREATE, input),
  update: (id, patch) => electron.ipcRenderer.invoke(ipcChannels.IPC.SONG_UPDATE, id, patch),
  delete: (id) => electron.ipcRenderer.invoke(ipcChannels.IPC.SONG_DELETE, id),
  upsertSection: (data) => electron.ipcRenderer.invoke(ipcChannels.IPC.SECTION_UPSERT, data),
  deleteSection: (id) => electron.ipcRenderer.invoke(ipcChannels.IPC.SECTION_DELETE, id),
  reorderSections: (songId, orderedIds) => electron.ipcRenderer.invoke(ipcChannels.IPC.SECTION_REORDER, songId, orderedIds)
});
