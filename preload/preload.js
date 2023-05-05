// preload.js
const { contextBridge, ipcRenderer } = require("electron");
const path = require('path');

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

contextBridge.exposeInMainWorld('electronAPI', {
  joinPath: (path1, path2) => {
    return path.join(path1, path2);
  },
  basename: (path1) => {
    return path.basename(path1);
  },
});