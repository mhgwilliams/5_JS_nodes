const fs = require("fs");
const path = require("path");
const os = require("os");

const { v4: uuidv4 } = require('uuid'); //generating unique id's for each datapoint

const { app, ipcMain } = require("electron");
const { exec } = require('child_process');

const Ajv = require("ajv");
const ajv = new Ajv();

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

const chokidar = require('chokidar');

let projectManager;

const buildNumberPath = path.join(__dirname, '../build-number.txt');
const buildNumber = fs.readFileSync(buildNumberPath, 'utf8');

const schema = {
  type: "object",
  properties: {
    file_name: { type: "string" },
    file_path: { type: "string" },
    date_modified: { type: "string" },
    build_number: {type: "string" },
    project_info: {
      type: "object",
      properties: {
        fps: { type: "number" },
        min_time: { type: "number" },
        max_time: { type: "number" },
        color_management: { type: "number" },
        ocio_preset: { type: "number" },
        ocio_config: { type: "string" },
        ocio_render_colorspace: { type: "number" },
        program_creator_name: { type: "string" },
        program_writer_name: { type: "string" },
      },
      required: []
    },
    assets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          file_path: { type: "string" },
          frames: { type: "number" },
        },
        required: ["type", "file_path"]
      }
    },
    outputs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          file_path: { type: "string" },
          frames: { type: "number" },
        },
        required: ["type", "file_path"]
      }}  // Define further if your outputs have a specific structure
  },
  required: ["file_name", "file_path"]
};

const validate = ajv.compile(schema);


class Project {
  constructor(jsonData) {
    this.id = uuidv4();
    this.file_path = jsonData.file_path || this.file_path;
    this.name =
      jsonData.file_name ||
      (this.file_path ? path.basename(this.file_path) : undefined);
    this.type = jsonData.type || "generic";
    this.dateModified = jsonData.date_modified;
    this.buildNum = jsonData.build_number;
    this.user = jsonData.user || "";
    this.projectInfo = jsonData.project_info;
    this.assets = jsonData.assets;
    this.outputs = jsonData.outputs;
  }

  // Example method to get project details
  getProjectDetails() {
    return {
      id: this.id,
      file_path: this.file_path,
      file_name: this.file_name,
      name: this.name,
      type: this.type,
      dateModified: this.dateModified,
      buildNum: this.buildNum,
      user: this.user,
      projectInfo: this.projectInfo,
      assets: this.assets,
      outputs: this.outputs,
    };
  }

  getFileOwner() {
    const filePath = this.file_path;
    let fileOwner = "";
    const sanitizedPath = filePath.replace(/\\/g, "\\\\");
    const command = `powershell -Command "(Get-Item '${sanitizedPath}').GetAccessControl().Owner"`;

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
          console.error(`Error getting file owner: ${error || stderr}`);
          resolve("");
        } else {
          console.log(`Owner of the file: ${stdout.trim()}`);
          fileOwner = stdout.trim();
          this.user = fileOwner;
          resolve(fileOwner);
        }
      });
    });
  }

  checkForNewerFile() {
    const fileExtension = path.extname(this.file_path);
    const directory = path.dirname(this.file_path);

    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          console.error(`Error reading directory: ${err}`);
          resolve(false);
        } else {
          const newerFiles = files.filter((file) => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            return (
              stats.isFile() &&
              path.extname(file) === fileExtension &&
              stats.mtime > fs.statSync(this.file_path).mtime
            );
          });

          resolve(newerFiles.length > 0);
        }
      });
    });
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
    this.isValid = true; // Default to true
    this.validationErrors = [];
    this.loadC4DFile(filePath);
  }

  validateC4DData(JSONData) {
    const valid = validate(JSONData);
    if (!valid) {
      return { isValid: false, errors: validate.errors };
    } else {
      return { isValid: true };
    }
  }

  loadC4DFile(filePath) {
    let JSONData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const validation = this.validateC4DData(JSONData);

    if (!validation.isValid) {
      this.isValid = false;
      this.validationErrors = validate.errors;
      console.error("JSON validation failed:", validation.errors);
      return;
    }

    console.log("JSON data is valid.");
    this.file_name = JSONData.file_name;
    this.name = JSONData.name;
    this.file_path = JSONData.file_path;
    this.projectInfo = JSONData.project_info;
    this.dateModified = JSONData.date_modified;
    this.buildNum = JSONData.build_number;
    this.assets = JSONData.assets;
    this.outputs = JSONData.outputs;
    }
}

class AEProject extends Project{
  constructor(filePath){
    super({}); // Call the parent constructor with an empty object
    this.file_path = filePath;
    this.loadAEFile(filePath);
  }

  loadAEFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const regex = /"fullpath":\s*"(.*?)"/g;
        const matches = fileContent.matchAll(regex);

        // Use a Map to ensure unique file paths with their last occurrence
        const uniqueAssets = new Map();
        for (const match of matches) {
            uniqueAssets.set(match[1], { type: 'aep_import', file_path: match[1] });
        }

        // Convert the unique values of the Map back into an array
        const assets = Array.from(uniqueAssets.values());

        const fileStats = fs.statSync(filePath);
        const fileModified = fileStats.mtime;

        this.assets = assets;
        this.file_name = filePath.split('\\').pop();
        this.name = this.file_name;
        this.date_modified = fileModified;


    } catch (error) {
        console.error('Error opening .aep file:', error);
        return null;
    }
}

}


class ProjectManager {
  constructor(appDataPath, jsonDatabase) {
    this.appDataPath = appDataPath;
    this.databasePath = path.join(appDataPath, "data", "database.json");
    this.dataList = jsonDatabase;
  }

  getCurrentTimestamp() {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
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

async function loadDatabase(){
  const jsonDataPath = path.join(appDataPath, "data", "database.json");
  console.log("making database...", jsonDataPath);
  let jsonData = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    build_number: buildNumber,
    data: [],
    uiContent: [],
  };

  console.log(`data_handler: DB loaded at ${performance.now()}`);
  console.log("database contents: ", jsonData);

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
    AEProject
  };
  
