const fs = require("fs");
const path = require("path");

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
      readNodes.push(fileMatch[1].trim());
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
    data_list.data.push(newData);
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
  testPrint,
};
