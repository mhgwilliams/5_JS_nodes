const fs = require("fs");
const path = require("path");
const os = require("os");

const { v4: uuidv4 } = require('uuid'); //generating unique id's for each datapoint

const { app } = require("electron");

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

async function loadDatabase(){
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
    clearDatabase
  };
  
