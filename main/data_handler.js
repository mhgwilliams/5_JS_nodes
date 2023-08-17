const fs = require("fs");
const path = require("path");
const os = require("os");

// currently this function just grabs the username but should be set to grab all the metadata I want from the file.
function getUsername(filePath) {

  var username;
  var uid;

  fs.stat(filePath, function(err, stats){
  
    //Checking for errors
   if(err){
       console.log(err)
   }
   else{
    //Logging the stats Object
   uid = stats.uid;
   }
  });

  try {

    // Printing user information
    console.log(os.userInfo());
    var userInfo = os.userInfo(uid);
    username = userInfo.username;

  } catch (err) {
   
    // Printing if any exception occurs
    console.log(": error occurred" + err);

  }

  return username;

};

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
      nuke_script_name: nukeScriptName,
      date,
      assets,
      outputs,
    };

    updateDatabase(output);
    console.log("Finished processing Nuke file.");
    console.log("JSON data appended to 'database.json'.");
  }
}

function updateDatabase(newData) {
  let data_list;

  if (fs.existsSync("./data/database.json")) {
    data_list = JSON.parse(fs.readFileSync("./data/database.json", "utf8"));

    const projectIndex = data_list.data.findIndex(project => {
      return (
        (project.nuke_script_name &&
          newData.nuke_script_name &&
          project.nuke_script_name === newData.nuke_script_name) ||
        (project.c4d_file_name &&
          newData.c4d_file_name &&
          project.c4d_file_name === newData.c4d_file_name)
      );
    });

    if (projectIndex !== -1) {
      data_list.data[projectIndex] = newData;
    } else {
      data_list.data.push(newData);
    }
  } else {
    data_list = {
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      data: [newData],
    };
  }

  fs.writeFileSync("./data/database.json", JSON.stringify(data_list, null, 4), "utf8");
}


function testPrint() {
  console.log("doing stuff in data handler file");
}

module.exports = {
    loadNukeFile,
    findJsonFiles,
    readJsonData,
    updateDatabase,
  };
  
