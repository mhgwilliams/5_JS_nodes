const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { testPrint } = require('./data_handler');


function createWindow() {
  const mainWindow = new BrowserWindow({
    backgroundColor: '#2e2c29',
    width: 900,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

}

app.whenReady().then(createWindow);

ipcMain.on('loadNukeFile', (event, file) => {
  console.log('msg received in main');
  testPrint();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
