// preload.js
const os = require('os');
const path = require('path');
const fs = require('fs');


const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('os', {
    homedir: () => os.homedir()
  })

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
  });

contextBridge.exposeInMainWorld('path', {
    basename: path.basename
})

contextBridge.exposeInMainWorld('fs', {
    readFile: (path, options, callback) => {
      fs.readFile(path, options, (err, data) => {
        callback(err, data);
      });
    },
    // Add other methods if needed
  });