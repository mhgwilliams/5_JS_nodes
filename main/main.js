// The main process runs in a Node.js environment, which means it can use Node.js APIs and modules.
// Renderer processes run in a Chromium environment, which provides access to the DOM and web APIs,
// but it is more restricted in terms of Node.js APIs due to security reasons.

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require('path');
const fs = require('fs');
const { readFile } = require('fs/promises');

const Fuse = require('fuse.js');

const { PARAMS, VALUE,  MicaBrowserWindow, IS_WINDOWS_11, WIN10 } = require('mica-electron'); //stylization


const { loadNukeFile, findJsonFiles, readJsonData, updateDatabase, loadDatabase, clearDatabase, Project, ProjectManager, NukeProject, Node } = require("./data_handler");
const { buildPopupMenu } = require("./menumaker");

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

let mainWindow;
let jsonDatabase;
let projectManager;


function createWindow() {
    mainWindow = new MicaBrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
    },
  });

  mainWindow.setCustomEffect(WIN10.BLURBEHIND, '#303030', 0.1); 

  mainWindow.loadFile("renderer/index.html");
  //mainWindow.webContents.openDevTools();

  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.show();
  });
  
}

app.whenReady().then(async () => {
  createWindow();

  try {
    jsonDatabase = await loadDatabase();
    mainWindow.webContents.send('database-loaded', jsonDatabase);
    console.log("database loaded");

    try {
      projectManager = new ProjectManager(appDataPath);
      console.log("project manager created");
    } catch (error) {
      console.error("Error creating project manager:", error);
    }
    
  } catch (error) {
    console.error("Error loading database:", error);
  }

});

// search functionality
function searchDatabase(searchTerm) {
  console.log("searching database for", searchTerm);
  const options = {
    includeScore: true,
    keys: ['file_name', 'file_path']
  }
  const fuse = new Fuse(jsonDatabase.data, options);
  const result = fuse.search(searchTerm);

  return result;
  //console.log(result);
  //mainWindow.webContents.send('search-results', result);
}

ipcMain.on('searchBox', (event, searchTerm) => {
  const results = searchDatabase(searchTerm);
  const fileNames = results.map(result => result.item.file_name); // Get the file_name for each result
  mainWindow.webContents.send('search-results', fileNames);
  
  console.log(fileNames);
});

// node network config save/load

ipcMain.on('save-network', (event) => {
  console.log("main: save network received");
  mainWindow.webContents.send('save-network-data');
});

ipcMain.on('network-data-response', (event, data) => {
  const filePath = path.join(appDataPath, 'network_data.json');
  fs.writeFileSync(filePath, data, 'utf8');
});

ipcMain.on('request-network-data', async (event) => {
  const networkDataPath = path.join(appDataPath, 'network_data.json');

  // Read the file's content
  let networkData;
  try {
    networkData = fs.readFileSync(networkDataPath, 'utf8').trim();
  } catch (error) {
    console.error('Error reading network data:', error);
    console.log("Creating empty network data file");
    fs.writeFileSync(networkDataPath, '', 'utf8');
    networkData = '';
  }

  // If the content is empty (or whitespace), bypass the JSON parsing
  if (!networkData) {
    if (jsonDatabase){
      mainWindow.webContents.send('process-json-data', jsonDatabase);
    }
    return; // Exit the function early
  }

  // Safely parse JSON
  let jsonContent;
  try {
    jsonContent = JSON.parse(networkData);
  } catch (error) {
    console.error('Error parsing network data:', error);
    if (jsonDatabase){
      mainWindow.webContents.send('process-json-data', jsonDatabase);
    }
    return; // Exit the function early
  }

  // Check if 'nodes' exists and is not empty
  if (jsonContent.nodes && jsonContent.nodes.length !== 0) {
    console.log("saved network config found");
    mainWindow.webContents.send('load-network-data', jsonContent);
  } else {
    if (jsonDatabase){
      mainWindow.webContents.send('process-json-data', jsonDatabase);
    }
  }
});

ipcMain.on('load-network', (event) => {
  const filePath = path.join(appDataPath, 'network_data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    mainWindow.webContents.send('load-network-data', JSON.parse(data));
  } else {
    console.log("nothing to load");
  }
});

ipcMain.on('clear-network', (event) => {
  const filePath = path.join(appDataPath, 'network_data.json');
  if (fs.existsSync(filePath)) {
    // Write an empty object to the file
    fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
    
    console.log("Network data cleared");
  } else {
    console.log("File not found, nothing to clear");
  }
});

ipcMain.on('clear-database', (event) => {
  dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'clearing database',
    message: 'Continue clearing the database?',
    buttons: [
      'OK',
      'Cancel'
    ]
  }).then((response) => {
    if (response.response === 0) {
      // Continue with clearing the database
      clearDatabase();
      //jsonDatabase = loadDatabase();
    } else {
      // User clicked on a button other than OK
      console.log("Database clearing cancelled");
    }
  });
});

// node network interaction
ipcMain.on("nodeContext", (event, node) => {

  const popupMenu = buildPopupMenu(mainWindow, node);
  popupMenu.popup(mainWindow, node);

});

// Buttons for loading files

ipcMain.on("loadNukeFile", (event, filePath) => {
  console.log("loadNukeFile received");
  const project = new NukeProject(filePath);
  const output = project.getProjectDetails();
  if (output) {
    const result = projectManager.updateDatabase(output);
    console.log("Finished processing Nuke file.");
    console.log(result);

    mainWindow.webContents.send("newProjectFile", result.newData);
  }
});

ipcMain.on("toggleButton", (event, uuid) => {
  console.log("toggle button received in main");
  console.log(uuid);
  mainWindow.webContents.send('toggleButton', uuid);
});

ipcMain.on("addButton", (event, uuid) => {
  console.log("add button received in main, finding data");
  const projectData = projectManager.retrieveDataFromDatabase(uuid);
  mainWindow.webContents.send('addButton_2', projectData);
});

/* ipcMain.on("loadNukeFile", (event, file) => {
  console.log("file path received in main");
  console.log(file);
  const nukeContent = loadNukeFile(file);

  const updatedData = updateDatabase(nukeContent);
  if (!updatedData.duplicate) {
    mainWindow.webContents.send('database-updated', updatedData.newData);
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Duplicate Entry',
      message: 'This file has already been added to the network.',
      buttons: ['OK']
    });
    console.log("duplicate entry");
  }
}); */

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
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Duplicate Entry',
            message: 'This file has already been added to the network.',
            buttons: ['OK']
          });
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
          mainWindow.webContents.send('database-updated', updatedData.newData, updatedData.uiContent);
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Duplicate Entry',
            message: 'This file has already been added to the network.',
            buttons: ['OK']
          });
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
  openNodeDetails_Menu(uuid);
  console.log("opening node details window");
});

ipcMain.on('open-file-explorer', (event, uuid, directory) => {
  openFileExplorer(uuid, directory);
});

function openFileExplorer(uuid, directory) {
  
  //directory is a boolean that determines if I open the folder or the file

  let nodeInfo;
  let path;

  if (jsonDatabase && jsonDatabase.data) {
    nodeInfo = jsonDatabase.data.find(item => item.id === uuid);
    console.log(nodeInfo);
    path = nodeInfo.file_path;
  }

  if (directory) {
    path = path.substring(0, path.lastIndexOf("\\"));
    console.log("opening directory", path);
  }

  shell.openPath(path)
      .then(result => {
        if (result) {
          console.error('An error occurred:', result);
        } else {
          console.log('File explorer opened successfully.');
        }
      })
      .catch(err => {
        console.error('Failed to open file explorer:', err);
      });
}

function openNodeDetails_Menu(uuid) {
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

  if (jsonDatabase && jsonDatabase.data) {
    nodeInfo = jsonDatabase.data.find(item => item.id === uuid);
  }

  // Load a specific HTML file or URL, you might pass nodeId to dynamically change content
  nodeWindow.loadFile('renderer/node-details.html');

  // Send data to new window
  nodeWindow.webContents.on('did-finish-load', () => {
    console.log("sending node data to node details window");
    nodeWindow.webContents.send('node-data', nodeInfo);
  });

  nodeWindow.webContents.once('dom-ready', () => {
    console.log("node details window ready");
    nodeWindow.show();
  });

  // Handle window close
  nodeWindow.on('closed', () => {
    nodeWindow = null;
  });
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (MicaBrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
