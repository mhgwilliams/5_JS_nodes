// The main process runs in a Node.js environment, which means it can use Node.js APIs and modules.
// Renderer processes run in a Chromium environment, which provides access to the DOM and web APIs,
// but it is more restricted in terms of Node.js APIs due to security reasons.

const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require('path');
const fs = require('fs');
const { readFile } = require('fs/promises');


const { loadNukeFile, findJsonFiles, readJsonData, updateDatabase } = require("./data_handler");
const { buildPopupMenu } = require("./menumaker");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
    backgroundColor: "#2e2c29",
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
    },
  });

  mainWindow.loadFile("renderer/index.html");
  mainWindow.webContents.openDevTools();
  
}

app.whenReady().then(createWindow);

// node network config save/load

ipcMain.on('save-network-data', (event, data) => {
  const filePath = path.join(__dirname, 'network_data.json');
  fs.writeFileSync(filePath, data, 'utf8');
});

ipcMain.on('load-network-data', (event) => {
  const filePath = path.join(__dirname, 'network_data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    event.reply('network-data-loaded', JSON.parse(data));
  } else {
    event.reply('network-data-loaded', null);
  }
});



// node network interaction
ipcMain.on("nodeContext", (event, nodeId) => {
  console.log("main: nodeContext received");
  const popupMenu = buildPopupMenu(mainWindow);
  popupMenu.popup(mainWindow);
});

// Buttons for loading files

ipcMain.on("loadNukeFile", (event, file) => {
  console.log("file path received in main");
  console.log(file);
  loadNukeFile(file);
});

ipcMain.on("loadHouJson", (event) => {
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ extensions: ["json"] }],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Selected file:", filePath);
        
        const data = fs.readFileSync(filePath, 'utf8');
        updateDatabase(JSON.parse(data));
      }
    })
    .catch((err) => {
      console.log(err);
    });
});


ipcMain.on("searchDirectory", (event) => {
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const directoryPath = result.filePaths[0];
        console.log("Selected directory:", directoryPath);

        // Call findJsonFiles function to get JSON files
        const jsonFiles = findJsonFiles(directoryPath);

        // Call readJsonData function to read JSON data from the files
        const dataList = readJsonData(jsonFiles);

        // Iterate through the data list and call the updateDatabase function
        for (const data of dataList) {
          updateDatabase(data);
        }

      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
