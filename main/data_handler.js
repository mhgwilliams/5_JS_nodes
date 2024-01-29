const fs = require("fs");
const path = require("path");
const os = require("os");

const { v4: uuidv4 } = require('uuid'); //generating unique id's for each datapoint

const { app, ipcMain } = require("electron");

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

let projectManager;

// I'm going to try to refactor this stuff to use classes, methods, and objects instead of whatever the hell this is
// I'm thinking about how to use inheritance to make nodes more easily updatable.

/* const nodeProperties = {
  id: nodeId++,
  UUID: uniqueID,
  label: fileName,
  title: fileName, //testing div element as title
  group: "projectfile",
  controlNodes: true, // control nodes hidden option
  clusterInOut: false,
  color: "#67676710",
  shape: "image",
  physics: false,
  x: Math.floor(Math.random() * 500) - 200,
  y: fileTypePositions[fileType],
  image: imgDIR + fileTypeIcons[fileType], // Set the image based on the file type
}; */

class Project{

  constructor(jsonData){
    this.id = uuidv4();
    this.file_path = jsonData.file_path || this.file_path;
    this.name = jsonData.file_name || (this.file_path ? path.basename(this.file_path) : undefined);
    this.type = jsonData.type || "generic";
    this.dateModified = jsonData.date_modified;
    this.user = jsonData.user || "";
    this.projectInfo = jsonData.project_info;
    this.assets = jsonData.assets;
    this.outputs = jsonData.outputs;
  }


  //methods
  //static methods can be called without having to create a new instance of project

  // Example method to get project details
  getProjectDetails() {
    return {
      id: this.id,
      file_path: this.file_path,
      file_name: this.file_name,
      name: this.name,
      type: this.type,
      dateModified: this.dateModified,
      user: this.user,
      projectInfo: this.projectInfo,
      assets: this.assets,
      outputs: this.outputs,
    };
}

}

class NukeProject extends Project{
  constructor(filePath){
    super({}); // Call the parent constructor with an empty object
    this.file_path = filePath;
    this.loadNukeFile();
  }

  extractReadNodes() {
    let content = fs.readFileSync(this.file_path, "utf8");
    let readNodePattern = /Read\s*\{[^}]*\}/g;
    let readNodesRaw = content.match(readNodePattern) || [];
    let readNodes = new Set(); // Change this to a Set
  
    for (let readNodeRaw of readNodesRaw) {
      let filePattern = /\bfile\s+([\S\s]*?)\n/;
      let fileMatch = filePattern.exec(readNodeRaw);
  
      if (fileMatch) {
        let file_path = fileMatch[1].trim();
        file_path = file_path.replace(/%04d/, "0000");
        file_path = file_path.replace(/####/, "0000");
        readNodes.add(file_path); // Use the add method instead of push
      }
    }
    return Array.from(readNodes); // Convert the Set back to an Array before returning
  }

  extractWriteNodes() {
    let content = fs.readFileSync(this.file_path, "utf8");
    let writeNodePattern = /Write\s*\{[^}]*\}/g;
    let writeNodesRaw = content.match(writeNodePattern) || [];
    let writeNodes = new Set(); // Change this to a Set
  
    for (let writeNodeRaw of writeNodesRaw) {
      let filePattern = /\bfile\s+([\S\s]*?)\n/;
      let fileMatch = filePattern.exec(writeNodeRaw);
      if (fileMatch) {
        writeNodes.add(fileMatch[1].trim()); // Use the add method instead of push
      }
    }
    return Array.from(writeNodes); // Convert the Set back to an Array before returning
  }

  loadNukeFile() {
    if (this.file_path) {
  
      const readNodes = this.extractReadNodes();
      const writeNodes = this.extractWriteNodes();
  
      const nukeScriptName = path.basename(this.file_path);
      const date = new Date().toISOString().substring(0, 10);

      this.file_name = nukeScriptName;
      this.dateModified = date;
      this.name = nukeScriptName;
      
      this.assets = readNodes.map((file_path) => ({ type: "read", file_path }));
      this.outputs = writeNodes.map((file_path) => ({ type: "write", file_path }));

    }
  }
  
}

class C4DProject extends Project{
  constructor(filePath){
    super({}); // Call the parent constructor with an empty object
    this.loadC4DFile(filePath);
  }

  loadC4DFile(filePath) {
    let JSONData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (JSONData) {
      this.file_name = JSONData.file_name;
      this.name = JSONData.name;
      this.file_path = JSONData.file_path;
      this.dateModified = JSONData.date_modified;
      this.assets = JSONData.assets;
      this.outputs = JSONData.outputs;
    }
    
  }
}

class ProjectManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.databasePath = path.join(appDataPath, "data", "database.json");
    this.dataList = this.loadData();
  }

  loadData() {
    if (fs.existsSync(this.databasePath)) {
        return JSON.parse(fs.readFileSync(this.databasePath, "utf8"));
    }
    return { timestamp: this.getCurrentTimestamp(), data: [], uiContent: [] };
  }

  getCurrentTimestamp() {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  updateUI() {
    // Change all values in the database under uicontent.deployed to true
    console.log("Updating UI, all nodes deployed");
    this.dataList.uiContent.forEach(ui => {
      ui.deployed = true;
    });
    this.saveData();
  }

  updateDatabase(newData) {
    let duplicateEntry = false;
    let uiContent = {};

    const projectIndex = this.dataList.data.findIndex(project => project.file_name === newData.file_name);
    if (projectIndex !== -1) {
        const existingId = this.dataList.data[projectIndex].id;
        this.dataList.data[projectIndex] = { ...newData, id: existingId };
        duplicateEntry = true;
    } else {
        newData.id = uuidv4();
        this.dataList.data.push(newData);
    }

    uiContent = {
        file_name: newData.file_name,
        id: newData.id,
        deployed: false,
        key2: 'value2',
    };

    if (duplicateEntry) {
        const uiIndex = this.dataList.uiContent.findIndex(ui => ui.id === newData.id);
        if (uiIndex !== -1) {
            this.dataList.uiContent[uiIndex] = uiContent;
        }
    } else {
        this.dataList.uiContent.push(uiContent);
    }

    this.saveData();

    return { newData: newData, uiContent: uiContent, duplicate: duplicateEntry };
  }

  saveData() {
    try {
        fs.writeFileSync(this.databasePath, JSON.stringify(this.dataList, null, 4), "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
            fs.writeFileSync(this.databasePath, JSON.stringify(this.dataList, null, 4), "utf8");
        } else {
            throw error;
        }
    }
  }

  retrieveDataFromDatabase(uuid) {
    const data = this.dataList.data.find(item => item.id === uuid);
    return data;
  }

  deleteProject(uuid) {
    const projectIndex = this.dataList.data.findIndex(project => project.id === uuid);
    if (projectIndex !== -1) {
        this.dataList.data.splice(projectIndex, 1);
    }

    const uiIndex = this.dataList.uiContent.findIndex(ui => ui.id === uuid);
    if (uiIndex !== -1) {
        this.dataList.uiContent.splice(uiIndex, 1);
    }

    this.saveData();
  }

  addProject(project) {
      if (!this.projects.has(project.id)) {
          this.projects.set(project.id, project);
      }
  }

  updateProject(projectId, newProjectData) {
      if (this.projects.has(projectId)) {
          // Assuming Project class has an update method
          this.projects.get(projectId).updateProjectData(newProjectData);
      }
  }

  getProject(projectId) {
      return this.projects.get(projectId);
  }

  // Additional methods for managing projects, like file watching, can be added here
}

class Node{
  constructor(options = {}){
    this.id = options.id;
    this.label = options.label;
    this.title = options.title;
    this.group = options.group || "none";
    this.controlNodes = options.controlNodes || false;
    this.clusterInOut = options.clusterInOut || false;
    this.color = options.color || "#67676710";
    this.shape = options.shape || "circle";
    this.physics = options.physics || true;
    this.x = options.x || Math.floor(Math.random() * 500) - 200;
    this.y = options.y || Math.floor(Math.random() * 500) - 200;
    this.image = options.image || "";
  }

  //methods
  updateNodeData(newData) {
    // Update node properties as needed
    this.id = newData.id || this.id;
    this.label = newData.label || this.label;
    this.title = newData.title || this.title;
    this.group = newData.group || this.group;
    this.controlNodes = newData.controlNodes || this.controlNodes;
    this.clusterInOut = newData.clusterInOut || this.clusterInOut;
    this.color = newData.color || this.color;
    this.shape = newData.shape || this.shape;
    this.physics = newData.physics || this.physics;
    this.x = newData.x || this.x;
    this.y = newData.y || this.y;
    this.image = newData.image || this.image;
  }
}



/* app.whenReady().then(() => {
  console.log("data handler saying App ready");
  projectManager = new ProjectManager(appDataPath);
});


ipcMain.on("loadNukeFile", (event, filePath) => {
  console.log("loadNukeFile received");
  const project = new NukeProject(filePath);
  const output = project.getProjectDetails();
  if (output) {
    const result = projectManager.updateDatabase(output);
    console.log("Finished processing Nuke file.");
    console.log(result);
    //event.reply("loadNukeFileReply", result); could be a cool way to link back and forth cleanly
    mainWindow.webContents.send("newProjectFile", result.newData);
    //ipcRenderer.send("newProjectFile", result.newData);
  }
}); */

async function loadDatabaseBACKUP(){
  const jsonDataPath = path.join(appDataPath, "data", "database.json");
  console.log("Loading database...", jsonDataPath);
  let jsonData = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    data: [],
    uiContent: [],
  };

  try {
    if (fs.existsSync(jsonDataPath)) {
      const fileData = fs.readFileSync(jsonDataPath, 'utf8');
      jsonData = JSON.parse(fileData);
    } else {
      throw new Error('File does not exist');
    }
  } catch (err) {
    console.error("Error reading file or parsing JSON:", err);
    // Create an empty JSON file if it doesn't exist or there was a parsing error
    fs.writeFileSync(jsonDataPath, JSON.stringify(jsonData, null, 4), 'utf8');
    console.log("Created empty JSON file");
  }

  console.log(`data_handler: DB loaded at ${performance.now()}`);

  return jsonData;
  
}

async function loadDatabase(){
  const jsonDataPath = path.join(appDataPath, "data", "database.json");
  console.log("making database...", jsonDataPath);
  let jsonData = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    data: [],
    uiContent: [],
  };
  
  console.log(`data_handler: DB loaded at ${performance.now()}`);

  return jsonData;
  
}

function clearDatabase() {
  const filePath = path.join(appDataPath, "data", "database.json");
  if (fs.existsSync(filePath)) {
    // Write database boilerplate to file
    const boilerplate = {
      "timestamp": new Date().toISOString().replace("T", " ").substring(0, 19),
      "data": [],
      "uiContent": [],
    }
    fs.writeFileSync(filePath, JSON.stringify(boilerplate, null, 4), 'utf8');

    console.log("Database cleared");
  } else {
    console.log("File not found, nothing to clear");
  }
}

function findJsonFiles(rootDir) {
  let jsonFiles = [];

  function walkSync(currentDirPath) {
    fs.readdirSync(currentDirPath).forEach((name) => {
      let filePath = path.join(currentDirPath, name);
      let stat = fs.statSync(filePath);
      if (stat.isFile() && path.extname(filePath) === ".json") {
        jsonFiles.push(filePath);
      } else if (stat.isDirectory()) {
        walkSync(filePath);
      }
    });
  }

  walkSync(rootDir);
  return jsonFiles;
}

function readJsonData(jsonFiles) {
  let data_list = [];

  for (let file of jsonFiles) {
    let data = JSON.parse(fs.readFileSync(file, "utf8"));
    data_list.push(data);
  }

  return data_list;
}

// Nuke functions

function extractReadNodes(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    let readNodePattern = /Read\s*\{[^}]*\}/g;
    let readNodesRaw = content.match(readNodePattern) || [];
    let readNodes = [];
  
    for (let readNodeRaw of readNodesRaw) {
      let filePattern = /\bfile\s+([\S\s]*?)\n/;
      let fileMatch = filePattern.exec(readNodeRaw);
  
      if (fileMatch) {
        let filePath = fileMatch[1].trim();
        filePath = filePath.replace(/%04d/, "0000");
        filePath = filePath.replace(/####/, "0000");
        readNodes.push(filePath);
      }
    }
    return readNodes;
  }
  
function extractWriteNodes(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    let writeNodePattern = /Write\s*\{[^}]*\}/g;
    let writeNodesRaw = content.match(writeNodePattern) || [];
    let writeNodes = [];
  
    for (let writeNodeRaw of writeNodesRaw) {
      let filePattern = /\bfile\s+([\S\s]*?)\n/;
      let fileMatch = filePattern.exec(writeNodeRaw);
      if (fileMatch) {
        writeNodes.push(fileMatch[1].trim());
      }
    }
    return writeNodes;
  }
  
function loadNukeFile(filePath) {
  if (filePath) {
    console.log("Processing Nuke file...");

    const readNodes = extractReadNodes(filePath);
    const writeNodes = extractWriteNodes(filePath);

    const nukeScriptName = path.basename(filePath);
    const date = new Date().toISOString().substring(0, 10);

    const assets = readNodes.map((file_path) => ({ type: "read", file_path }));
    const outputs = writeNodes.map((file_path) => ({ type: "write", file_path }));

    const output = {
      file_name: nukeScriptName,
      date,
      assets,
      outputs,
    };

    return output;

    //updateDatabase(output);
    //console.log("Finished processing Nuke file.");
    //console.log("JSON data appended to 'database.json'.");
  }
}

function updateDatabase(newData) {
  let data_list;
  let duplicateEntry = false;
  let uiContent = {};
  const jsonDataPath = path.join(appDataPath, "data", "database.json");

  if (fs.existsSync(jsonDataPath)) {
    data_list = JSON.parse(fs.readFileSync(jsonDataPath, "utf8"));

    if (data_list && data_list.data) {
      const projectIndex = data_list.data.findIndex((project) => {
        return (
          project.file_name &&
          newData.file_name &&
          project.file_name === newData.file_name
        );
      });

      if (projectIndex !== -1) {
        // Preserve the existing UUID if the entry already exists
        const existingId = data_list.data[projectIndex].id;
        data_list.data[projectIndex] = { ...newData, id: existingId };
        duplicateEntry = true;
      } else {
        // Assign a new UUID for new data
        newData.id = uuidv4();
        data_list.data.push(newData);
        //send a message to the nodenet that we got new shit
      }

      // Update or Add UIContent entry
      uiContent = {
        file_name: newData.file_name,
        id: newData.id,
        // Additional key-value pairs
        deployed: false,
        key2: 'value2',
      };

      if (duplicateEntry) {
        // Update the existing UIContent entry
        const uiIndex = data_list.uiContent.findIndex(ui => ui.id === newData.id);
        if (uiIndex !== -1) {
          data_list.uiContent[uiIndex] = uiContent;
        }
      } else {
        // Add new UIContent entry
        data_list.uiContent.push(uiContent);
      }
    }
  } else {
    // Create a new list with a UUID for the new entry
    newData.id = uuidv4();
    data_list = {
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      data: [newData],
      uiContent: [{
        file_name: newData.file_name,
        id: newData.id,
        deployed: false,
        key2: 'value2',
      }],
    };
  }
  
  try {
    fs.writeFileSync(jsonDataPath, JSON.stringify(data_list, null, 4), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      // Create the directory if it doesn't exist
      fs.mkdirSync(path.dirname(jsonDataPath), { recursive: true });
      // Create the file
      fs.writeFileSync(jsonDataPath, JSON.stringify(data_list, null, 4), "utf8");
    } else {
      throw error;
    }
  }

  return {newData: newData, uiContent: uiContent, duplicate: duplicateEntry};
}

module.exports = {
    loadNukeFile,
    findJsonFiles,
    readJsonData,
    updateDatabase,
    loadDatabase,
    clearDatabase,
    Project,
    ProjectManager,
    NukeProject,
    C4DProject,
    Node,
  };
  
