const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const { loadNukeFile, findJsonFiles, readJsonData, updateDatabase } = require("./data_handler");
const { popupMenu } = require("./menumaker");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
    backgroundColor: "#2e2c29",
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
  //mainWindow.webContents.openDevTools();

  mainWindow.webContents.on("context-menu", () => {
    popupMenu.popup(mainWindow.webContents);
  })
  
}

app.whenReady().then(createWindow);

ipcMain.on("loadNukeFile", (event, file) => {
  console.log("file path received in main");
  console.log(file);
  loadNukeFile(file);
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
