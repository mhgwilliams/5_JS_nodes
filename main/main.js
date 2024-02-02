// The main process runs in a Node.js environment, which means it can use Node.js APIs and modules.
// Renderer processes run in a Chromium environment, which provides access to the DOM and web APIs,
// but it is more restricted in terms of Node.js APIs due to security reasons.

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, net } = require("electron");
const path = require('path');
const fs = require('fs');
const { readFile } = require('fs/promises');

const Fuse = require('fuse.js');

const appStartTime = performance.now();

const { PARAMS, VALUE,  MicaBrowserWindow, IS_WINDOWS_11, WIN10 } = require('mica-electron'); //stylization


const { findJsonFiles, readJsonData, updateDatabase, loadDatabase, clearDatabase, Project, ProjectManager, NukeProject, Node, C4DProject, AEProject } = require("./data_handler");
const { buildPopupMenu } = require("./menumaker");

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

const buildNumberPath = path.join(__dirname, '../build-number.txt');
const buildNumber = fs.readFileSync(buildNumberPath, 'utf8');

var savePath =  '';

let mainWindow;
let jsonDatabase;
let projectManager;

function createWindow() {
    mainWindow = new MicaBrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#303030',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
    },
  });

  mainWindow.setCustomEffect(WIN10.BLURBEHIND, '#303030', 0.5); 

  mainWindow.loadFile("renderer/index.html");
  //mainWindow.webContents.openDevTools();

  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.show();
  });
  
}

app.whenReady().then(async () => {
  console.log(`App started in ${performance.now() - appStartTime}ms`);
  createWindow();

  try {
    jsonDatabase = await loadDatabase();
    mainWindow.webContents.send('database-loaded', jsonDatabase);
    console.log(`Database loaded in ${performance.now() - appStartTime}ms`);
    console.log(jsonDatabase);

    try {
      projectManager = new ProjectManager(appDataPath, jsonDatabase);
    } catch (error) {
      console.error("Error creating project manager:", error);
    }

  } catch (error) {
    console.error("Error loading database:", error);
  }

});

ipcMain.on('getDatabase', (event) => {
  if (jsonDatabase) {
    event.reply('database-loaded', jsonDatabase);
  } else {
    mainWindow.webContents.once('database-loaded', () => {
      event.reply('database-loaded', jsonDatabase);
    });
  }
});


// search functionality
function searchDatabase(searchTerm) {
  console.log("searching database for", searchTerm);
  const options = {
    threshold: 0.3,
    includeScore: true,
    useExtendedSearch: true,
    keys: ['file_name', 'file_path']
  }
  const fuse = new Fuse(jsonDatabase.data, options);
  const result = fuse.search(searchTerm);
  console.log(result);

  return result;
  //mainWindow.webContents.send('search-results', result);
}

ipcMain.on('searchBox', (event, searchTerm) => {
  const results = searchDatabase(searchTerm);
  const fileNames = results.map(result => result.item.file_name); // Get the file_name for each result
  const uuids = results.map(result => result.item.id); // Get the uuid for each result
  mainWindow.webContents.send('search-results', fileNames, uuids);
});

// node network config save/load

ipcMain.on('save-network', (event) => {
  console.log("main: save network received");
  mainWindow.webContents.send('save-network-data');
});

ipcMain.on('save-session-as', (event) => {
  mainWindow.webContents.send('save-network-data');
  ipcMain.once('network-data-response', (event, data) => {
    const combinedData = {
      data: data,
      jsonDatabase: jsonDatabase
    };

    dialog.showSaveDialog(mainWindow, {
      title: 'Save session',
      defaultPath: 'session.FloV',
      filters: [
        { name: 'FloV', extensions: ['FloV'] }
      ]
    }).then((result) => {
      if (!result.canceled && result.filePath) {
        const filePath = result.filePath;
        fs.writeFileSync(filePath, JSON.stringify(combinedData), 'utf8');
        savePath = filePath;
        console.log("Session saved to", filePath);
      }
    }).catch((err) => {
      console.error('Error saving session:', err);
    });
  });
  
});

ipcMain.on("save-session", (event) => {
  mainWindow.webContents.send("save-network-data");
  ipcMain.once("network-data-response", (event, data) => {
    const combinedData = {
      data: data,
      jsonDatabase: jsonDatabase,
    };
    if (savePath) {
      fs.writeFileSync(savePath, JSON.stringify(combinedData), "utf8");
      console.log("Session saved to", savePath);
    } else {
      dialog
        .showSaveDialog(mainWindow, {
          title: "Save session",
          defaultPath: "session.FloV",
          filters: [{ name: "FloV", extensions: ["FloV"] }],
        })
        .then((result) => {
          if (!result.canceled && result.filePath) {
            const filePath = result.filePath;
            fs.writeFileSync(filePath, JSON.stringify(combinedData), "utf8");
            savePath = filePath;
            console.log("Session saved to", filePath);
          }
        })
        .catch((err) => {
          console.error("Error saving session:", err);
        });
    }
  });
});

ipcMain.on('open-session', (event) => {
  dialog.showOpenDialog(mainWindow, {
    title: 'Open session',
    filters: [
      { name: 'FloV', extensions: ['FloV'] }
    ]
  }).then((result) => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      console.log("Selected file:", filePath);
      
      const data = fs.readFileSync(filePath, 'utf8');
      const combinedData = JSON.parse(data);
      jsonDatabase = combinedData.jsonDatabase;
      const networkData = JSON.parse(combinedData.data);
      savePath = filePath;
      mainWindow.webContents.send('database-loaded', jsonDatabase);
      mainWindow.webContents.send('load-network-data', networkData);
    }
  }).catch((err) => {
    console.error('Error opening session:', err);
  });
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
      jsonDatabase = loadDatabase();
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

ipcMain.on("loadNukeFile", async (event) => {
  console.log("loadNukeFile received");
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: 'NK File', extensions: ["nk"] }],
    })
    .then(async (result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Selected file:", filePath);

        const project = new NukeProject(filePath);
        const owner = await project.getFileOwner();

        const output = project.getProjectDetails();

        if (output) {
          const result = projectManager.updateDatabase(output);
          console.log("Finished processing Nuke file.");
          console.log(result);

          if (!result.duplicate) {
            mainWindow.webContents.send(
              "newProjectFile",
              result.newData,
              result.uiContent
            );
          } else {
            dialog.showMessageBox(mainWindow, {
              type: "warning",
              title: "Duplicate Entry",
              message: "This file has already been added to the network.",
              buttons: ["OK"],
            });
          }
        }
      }
      mainWindow.webContents.send('close-modal');
    });
});

async function loadC4DJsonAndValidate(filePath) {
  const project = new C4DProject(filePath);
  const owner = await project.getFileOwner();

        if(!project.isValid){
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Invalid Project File',
            message: `The selected project file is not valid and cannot be processed.\n
            Error: ${project.validationErrors[0].message}.\n Does the .json file contain the build number: ${buildNumber}?`,

            buttons: ['OK']
          });
          return;
        } else{

          const output = project.getProjectDetails();

          if (output) {
            const result = projectManager.updateDatabase(output);
            console.log("Finished processing C4D file.");
            console.log(result);

            if (!result.duplicate){
              mainWindow.webContents.send("newProjectFile", result.newData, result.uiContent);
            } if (result.duplicate) {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Duplicate Entry',
              message: 'This file has already been added to the network.',
              buttons: ['OK']
            });
            }
          }
        }
}

ipcMain.on("loadC4DJson", async (event) => {
  console.log("loadC4DJson received");
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: 'JSON File', extensions: ["json"] }],
    })
    .then(async (result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Selected file:", filePath);

        loadC4DJsonAndValidate(filePath);
    }
    mainWindow.webContents.send('close-modal');
  });
});

function runC4D(filePath) {
  let directory = path.dirname(filePath);
  let filenameWithoutExt = path.basename(filePath, path.extname(filePath));

  // Construct the new path
  let newPath = path.join(directory, "data", filenameWithoutExt + ".json");

  const quotePath = (path) => `"${path}"`;
  
  filePath = quotePath(filePath);

  const scriptENV = path.join(process.resourcesPath, 'c4d/script_manager_environment.py');
  const scriptPath = path.join(process.resourcesPath, 'c4d/c4d_generateJson.py');
 
  const { spawn } = require('child_process');

  const command = '"C:\\Program Files\\Maxon Cinema 4D 2024\\c4dpy.exe"';
  const args = ['-g_licenseServerRLM=licmaxon.buck.local:5053', scriptENV, '-script', scriptPath, '-in', filePath];
  
  const options = {
    shell: true,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  }
  const childProcess = spawn(command, args, options);

  // Setting a timeout for the process
  const timeoutMilliseconds = 60000; // For example, 30 seconds
  setTimeout(() => {
    childProcess.kill(); // Attempt to kill the process
    console.log('Process was killed due to timeout.');
  }, timeoutMilliseconds);

  childProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  childProcess.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  childProcess.on('close', (code) => {
    // this is where the script is saying it's done, so use this message to continue the app shit
    loadC4DJsonAndValidate(newPath);
  });

  childProcess.on('error', (err) => {
    console.error(`Failed to start subprocess: ${err}`);
  });

  childProcess.on('exit', (code, signal) => {
    if (code) {
      dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'C4D Script',
        message: `Child process exited with code ${code}`,
        buttons: ['OK']
      });
    }
    if (signal) {
      dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'C4D Script',
        message: `Child process killed with signal ${signal}`,
        buttons: ['OK']
      });
    };
  });
}

ipcMain.on('loadC4DFile', async (event) => {
  console.log("loadC4DFile received");
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: '', extensions: ["c4d"] }],
    })
    .then(async (result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Selected file:", filePath);

        runC4D(filePath);
        //loadC4DJsonAndValidate(filePath);
      }
      mainWindow.webContents.send('close-modal');
    });
});


ipcMain.on('load-AE', async () => {
  console.log("load-AE received");
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: 'AE Project', extensions: ["aep"] }],
    })
    .then(async (result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Selected file:", filePath);

        const project = new AEProject(filePath);
        const output = project.getProjectDetails();
        const owner = await project.getFileOwner();

        if (output) {
          const result = projectManager.updateDatabase(output);
          console.log("Finished processing AE file.");
          console.log(result);

          if (!result.duplicate){
            mainWindow.webContents.send("newProjectFile", result.newData, result.uiContent);
          } if (result.duplicate) {
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Duplicate Entry',
            message: 'This file has already been added to the network.',
            buttons: ['OK']
          });
          }
        }
      }
      mainWindow.webContents.send('close-modal');
    });
});

ipcMain.on("toggleButton", (event, uuid, state) => {
  console.log("toggle button received in main");
  console.log(uuid);
  const projectData = projectManager.retrieveDataFromDatabase(uuid);
  mainWindow.webContents.send('toggleButton', uuid, state, projectData);
});

ipcMain.on("delButton", (event, uuid) => {
  console.log("del button received in main, deleting id: ", uuid);
  projectManager.deleteProject(uuid);
  mainWindow.webContents.send('delButton', uuid);
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
  if (jsonDatabase) {
    // Flush jsonDatabase here
    jsonDatabase = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (MicaBrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
