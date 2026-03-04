"use strict";
const electron = require("electron");
const ipcChannels = require("./chunks/ipc-channels-DiQ1ewji.js");
const presenterOutput = {
  onSlideUpdate: (callback) => {
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(ipcChannels.IPC.GO_LIVE, handler);
    return () => electron.ipcRenderer.removeListener(ipcChannels.IPC.GO_LIVE, handler);
  },
  onBlank: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on(ipcChannels.IPC.BLANK, handler);
    return () => electron.ipcRenderer.removeListener(ipcChannels.IPC.BLANK, handler);
  },
  onClear: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on(ipcChannels.IPC.CLEAR, handler);
    return () => electron.ipcRenderer.removeListener(ipcChannels.IPC.CLEAR, handler);
  }
};
electron.contextBridge.exposeInMainWorld("presenterOutput", presenterOutput);
