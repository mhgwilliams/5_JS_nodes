// The main process runs in a Node.js environment, which means it can use Node.js APIs and modules.
// Renderer processes run in a Chromium environment, which provides access to the DOM and web APIs,
// but it is more restricted in terms of Node.js APIs due to security reasons.

const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require('path');
const fs = require('fs');
const { readFile } = require('fs/promises');

const { PARAMS, VALUE,  MicaBrowserWindow, IS_WINDOWS_11, WIN10 } = require('mica-electron'); //stylization


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

ipcMain.on('save-network', (event) => {
  //const filePath = path.join(__dirname, 'network_data.json');
  //fs.writeFileSync(filePath, data, 'utf8');
  console.log("main: save network received");
  mainWindow.webContents.send('save-network-data');
});

ipcMain.on('network-data-response', (event, data) => {
  const filePath = path.join(__dirname, 'network_data.json');
  fs.writeFileSync(filePath, data, 'utf8');
  //console.log(data);

});

ipcMain.on('request-network-data', (event) => {
  console.log("request for network config received");
  const networkDataPath = path.join(__dirname, 'network_data.json');

  // Check if file exists and is not empty
  if (!fs.existsSync(networkDataPath) || fs.statSync(networkDataPath).size === 0) {
    console.log("saved network config NOT found");
    mainWindow.webContents.send('process-json-data');
    return; // Exit the function early
  }

  // Read the file's content
  const networkData = fs.readFileSync(networkDataPath, 'utf8').trim();

  // If the content is empty (or whitespace), bypass the JSON parsing
  if (!networkData) {
    console.log("saved network config NOT found");
    mainWindow.webContents.send('process-json-data');
    return; // Exit the function early
  }

  // Safely parse JSON
  let jsonContent;
  try {
    jsonContent = JSON.parse(networkData);
  } catch (error) {
    console.error('Error parsing network data:', error);
    console.log("saved network config NOT found");
    mainWindow.webContents.send('process-json-data');
    return; // Exit the function early
  }

  // Check if 'nodes' exists and is not empty
  if (jsonContent.nodes && jsonContent.nodes.length !== 0) {
    console.log("saved network config found");
    mainWindow.webContents.send('load-network-data', jsonContent);
  } else {
    console.log("saved network config NOT found");
    mainWindow.webContents.send('process-json-data');
  }
});



ipcMain.on('load-network', (event) => {
  const filePath = path.join(__dirname, 'network_data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    mainWindow.webContents.send('load-network-data', JSON.parse(data));
  } else {
    console.log("nothing to load");
  }
});

ipcMain.on('clear-network', (event) => {
  const filePath = path.join(__dirname, 'network_data.json');
  if (fs.existsSync(filePath)) {
    // Write an empty object to the file
    fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');

    // Optionally, notify mainWindow that the network data has been cleared
    // You can adjust the message and data sent based on your application's needs
    mainWindow.webContents.send('network-data-cleared', {});
    console.log("Network data cleared");
  } else {
    console.log("File not found, nothing to clear");
  }
});


// node network interaction
ipcMain.on("nodeContext", (event, node) => {
  //console.log("main: nodeContext received");
  const popupMenu = buildPopupMenu(mainWindow, node);
  popupMenu.popup(mainWindow, node);
});

// Buttons for loading files

ipcMain.on("loadNukeFile", (event, file) => {
  console.log("file path received in main");
  console.log(file);
  const nukeContent = loadNukeFile(file);
  console.log(nukeContent);
  const updatedData = updateDatabase(nukeContent);
        if (!updatedData.duplicate){
          mainWindow.webContents.send('database-updated', updatedData.newData);
        } else {
          console.log("duplicate entry");
        }
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
        const updatedData = updateDatabase(JSON.parse(data));
        if (!updatedData.duplicate){
          mainWindow.webContents.send('database-updated', updatedData.newData);
        } else {
          console.log("duplicate entry");
        }
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on("loadC4DJson", (event) => {
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
        const updatedData = updateDatabase(JSON.parse(data));
        if (!updatedData.duplicate){
          mainWindow.webContents.send('database-updated', updatedData.newData);
        } else {
          console.log("duplicate entry");
        }
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

//window stuff
ipcMain.on('open-node-details', (event, uuid) => {
  let nodeWindow = new MicaBrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Consider security implications
      // Other webPreferences you might need
    }
  });

  //nodeWindow.webContents.openDevTools();

  nodeWindow.setCustomEffect(WIN10.BLURBEHIND, '#303030', 0.4); 

  // Load a specific HTML file or URL, you might pass nodeId to dynamically change content
  nodeWindow.loadFile('renderer/node-details.html');

  const jsonData = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));
  const nodeInfo = jsonData.data.find(item => item.id === uuid);

  // Send data to new window
  nodeWindow.webContents.on('did-finish-load', () => {
    nodeWindow.webContents.send('node-data', nodeInfo);
  });

  nodeWindow.webContents.once('dom-ready', () => {
    nodeWindow.show();
  });

  // Handle window close
  nodeWindow.on('closed', () => {
    nodeWindow = null;
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
