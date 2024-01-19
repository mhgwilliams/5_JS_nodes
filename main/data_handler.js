const fs = require("fs");
const path = require("path");
const os = require("os");

const { v4: uuidv4 } = require('uuid'); //generating unique id's for each datapoint

const { app } = require("electron");

var appPath = app.getAppPath();
var appDataPath = app.getPath('userData');

async function loadDatabase(){
  const jsonDataPath = path.join(appDataPath, "data", "database.json");
  let jsonData = {
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    data: [],
  };

  try {
    if (fs.existsSync(jsonDataPath)) {
      const fileData = fs.readFileSync(jsonDataPath, 'utf8');
      jsonData = JSON.parse(fileData);
    } else {
      throw new Error('File does not exist');
    }
    console.log("JSON Data is ", jsonData);
  } catch (err) {
    console.error("Error reading file or parsing JSON:", err);
    // Create an empty JSON file if it doesn't exist or there was a parsing error
    fs.writeFileSync(jsonDataPath, JSON.stringify(jsonData, null, 4), 'utf8');
    console.log("Created empty JSON file");
  }

  return jsonData;
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

function saveDataList(dataList, outputFile) {
  let current_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);
  let data = {
    timestamp: current_time,
    data: dataList,
  };

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 4), "utf8");
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

    const assets = readNodes.map((path) => ({ type: "read", path }));
    const outputs = writeNodes.map((path) => ({ type: "write", path }));

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
    }
  } else {
    // Create a new list with a UUID for the new entry
    newData.id = uuidv4();
    data_list = {
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      data: [newData],
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

  return {newData: newData, duplicate: duplicateEntry};
}

module.exports = {
    loadNukeFile,
    findJsonFiles,
    readJsonData,
    updateDatabase,
    loadDatabase
  };
  
