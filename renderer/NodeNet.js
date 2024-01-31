const pathBasename = window.electronAPI.basename;
var nodenetStartTime = performance.now();

const jsonDataPath = "../data/database.json";

var imgDIR = "./icons/";
var nodes = new vis.DataSet();
var edges = new vis.DataSet();

var uniqueAssets = {};
var uniqueScenes = {};

var networkState;
var nodesData = [];
var edgesData = [];

var data;

let serializedState;

let contextMenuElement = null;
let selectedNode = null;

const fileTypeIcons = {
  c4d: "c4d.png",
  nk: "nuke.png",
  hip: "hou.png",
  // Add more file types here
};

const fileTypePositions = {
  c4d: -200,
  nk: 200,
  hip: 0,
};



class ControlNode {
  constructor(id, title, parent) {
      this.id = id;
      this.hidden = true,
      this.physics = false,
      this.group = "controlNodes",
      this.color = "rgba(255,255,255,0.1)",
      this.title = title;
      this.parentProjectFileId = parent.id;
      this.parentUUID = new Set([parent.UUID]);
      this.x = parent.x;
      this.y = title === "AssetControl" ? parent.y - 100 : title === "OutputControl" ? parent.y + 100 : parent.y;
  }

  createEdgeToParent(edgeId) {
      return {
          id: edgeId,
          from: this.parentProjectFileId,
          to: this.id,
          length: 20,
          hidden: true,
          physics: false,
          color: "red",
      };
  }

}

class NodeFormatter {
  constructor() {
      this.defaultSize = 10;
      this.assetTypeMappings = {
          "Texture": { group: "Texture", size: this.defaultSize },
          "Geometry": { group: "Geometry", size: this.defaultSize },
          "read": { group: "read", size: 15 },
          "write": { group: "write", size: 15 },
          "Render": { group: "Render" },
          "alembic_rop": { group: "Geometry" },
          "filecache": { group: "file_cache" }
      };
  }

  format(asset, id, parent, type) {
    const assetFileName = pathBasename(asset.file_path);
    const node = {
      id,
      label: assetFileName,
      title: assetFileName,
      type: type,
      parentUUID: new Set([parent.UUID]),
      x: parent.x,
      y: type === "asset" ? parent.y - 100 : parent.y,
      ...this.getAssetTypeProperties(asset.type)
    };

    // Set default properties for unknown asset types
    if (!node.group) {
      node.color = "#fb8500";
      node.shape = "hexagon";
    }

    return node;
  }

  getAssetTypeProperties(type) {
      if (type.includes("alembic") && !type.includes("alembic_rop")) {
          return { group: "Geometry" };
      }

      return this.assetTypeMappings[type] || {};
  }
}


function showPopupMenu(params) {
  selectedNode = network.getNodeAt(params.pointer.DOM);

  if (selectedNode) {
    const node = nodes.get(selectedNode);
    console.log("selectedNode", selectedNode);
    ipcRenderer.send("nodeContext", node);
  }

  return contextMenuElement;
}

function togglePin(params) {
  const nodeId = params;

  if (nodeId) {
    const node = nodes.get(nodeId);
    const currentPhysics = node.physics !== undefined ? node.physics : true;
    nodes.update({ id: nodeId, physics: !currentPhysics });
  }
}

function controlVis(nodeId, checkValue) {
  
  if (nodeId) {
    // set value on project node properites
    const node = nodes.get(nodeId);
    const currentCheckVal = node.controlNodes;

    const targColor = {
      background: "rgba(255,255,255,0.1)",
      border: "rgba(255,255,255,0.1)",
      highlight: {
        background: "rgba(255,255,255,0.1)",
        border: "rgba(255,255,255,0.1)",
        },
    }

    nodes.update({ id: nodeId, controlNodes: !currentCheckVal });

    const connectedNodes = network.getConnectedNodes(nodeId);
    connectedNodes.forEach(connectedNodeId => {
      const connectedNode = nodes.get(connectedNodeId);

      //change all nodes
      //nodes.update({ id: connectedNodeId, color: targColor });

      if (connectedNode.group === "controlNodes") {
        console.log(connectedNode);
        const hiddenControl = checkValue ? true : false;
        nodes.update({ id: connectedNodeId, hidden: hiddenControl, color: "rgba(255,255,255,0.1)" });
      }
    });
  }
}

function toggleCluster(node, checkValue) {

  console.log("toggleCluster", node, checkValue);
  // this function is broken, it's not clustering the nodes correctly
  // need to decide what the cluster should really be, what nodes should be included, what would make it feel nice.

  /* if (node) {
    //const node = nodes.get(nodeId);
    const currentCheckVal = node.clusterInOut;
    const nodeId = node.id;
    const uuid = node.UUID;
    
    const clusterOptions2 = {
      joinCondition: function (childOptions) {
        return (
          childOptions.UUID === uuid ||
          (childOptions.parentUUID.has(uuid) &&
            childOptions.parentUUID.size < 2)
        );
      },
      clusterNodeProperties: {
        label: `Cluster of ${node.file_name}`,
        borderWidth: 3,
        shape: "database",
        size: 20,
        clusterInOut: true,
      },
    };

    if (!currentCheckVal) {
      console.log("clustering");
      nodes.update({ id: nodeId, clusterInOut: !currentCheckVal });
      //network.clusterByConnection(nodeId);
      network.cluster(clusterOptions2);
      console.log(network.getNodesInCluster(nodeId));
    } else {
      console.log("unclustering");
      nodes.update({ id: nodeId, clusterInOut: !currentCheckVal });
      network.openCluster(nodeId);
    }
  } */
}

function removeContextMenu() {
  if (contextMenuElement) {
    contextMenuElement.remove();
    selectedNode = null;
    contextMenuElement = null;
  }
}

async function receiveJsonDataAndDraw(jsonData) {
  try {
    console.time('NodeNet: reading database and adding nodes');
    addNewNodesAndEdges(jsonData.data);
    console.timeEnd('NodeNet: reading database and adding nodes');
  } catch (err) {
    console.log("Error reading file or parsing JSON:", err);
  }
}

function addNewNodesAndEdges(jsonDataInput) {
  //Ensure jsonData is always an array
  const jsonDataArray = Array.isArray(jsonDataInput) ? jsonDataInput : [jsonDataInput];

  jsonDataArray.forEach((jsonData) => {
    const NodeFormatterInstance = new NodeFormatter();

    let nodeId;
    let edgeId;

    const existingNodeObjects = nodes.get();
    const existingEdgeObjects = edges.get();

    // Check if there are any nodes and get the id of the last node
    if (existingNodeObjects.length > 0) {
      const lastNodeId = existingNodeObjects[existingNodeObjects.length - 1].id;
      if (typeof lastNodeId !== 'undefined') {
          nodeId = lastNodeId + 1;
      } else {
          nodeId = 1;
      }
    } else {
      nodeId = 1;
    }

    // Check if there are any edges and get the id of the last edge
    if (existingEdgeObjects.length > 0) {
      const lastEdgeId = existingEdgeObjects[existingEdgeObjects.length - 1].id;
      if (typeof lastEdgeId !== 'undefined') {
          edgeId = lastEdgeId + 1;
      } else {
          edgeId = 1;
      }
    } else {
      edgeId = 1;
    }

    const fileExtension = jsonData.file_name.split('.').pop().toLowerCase();
    const fileType = fileExtension in fileTypeIcons ? fileExtension : null;

    const fileName = jsonData.file_name;
    const uniqueID = jsonData.id;


    if (!uniqueScenes[fileName]) {
      uniqueScenes[fileName] = {
        id: nodeId++,
        UUID: uniqueID,
        parentUUID: new Set([]),
        label: fileName,
        title: fileName, //testing div element as title
        group: "projectfile",
        controlNodes: true, // control nodes hidden option
        clusterInOut: false,
        color: "grey",
        shape: "image",
        physics: false,
        x: Math.floor(Math.random() * 500) - 200,
        y: fileTypePositions[fileType],
        image: imgDIR + fileTypeIcons[fileType], // Set the image based on the file type
      };
      nodes.add(uniqueScenes[fileName]);

    }

    const AssetControlNode = new ControlNode(nodeId++, "AssetControl", uniqueScenes[fileName]);
    const OutputControlNode = new ControlNode(nodeId++, "OutputControl", uniqueScenes[fileName]);

    nodes.add(AssetControlNode);
    nodes.add(OutputControlNode);

    const assetControlEdge = AssetControlNode.createEdgeToParent(edgeId++);
    const outputControlEdge = OutputControlNode.createEdgeToParent(edgeId++);

    edges.add(assetControlEdge);
    edges.add(outputControlEdge);

    if (jsonData.assets && jsonData.assets.length > 0) {
      jsonData.assets.forEach((asset) => {

        // WARNING: This just checks the file name which makes the assets link together, but if they're in different places
        // the asset could TECHNICALLY be different. Right now it doesn't care, it just links them even if the project is
        // actually pulling the asset from a different path. 

        const assetFileName = pathBasename(asset.file_path);

        if (!uniqueAssets[assetFileName]) {
          uniqueAssets[assetFileName] = NodeFormatterInstance.format(asset, nodeId++, uniqueScenes[fileName], "asset");
          nodes.add(uniqueAssets[assetFileName]);
        } else {
          uniqueAssets[assetFileName].parentUUID.add(uniqueScenes[fileName].UUID);
          nodes.update(uniqueAssets[assetFileName]);
        }

        edges.add({
          id: edgeId++,
          parentUUID: new Set([uniqueScenes[fileName].UUID]),
          to: uniqueScenes[fileName].id,
          from: uniqueAssets[assetFileName].id,
          arrows: "to", // Add an arrow to the edge
        });

        edges.add({
          id: edgeId++,
          parentUUID: new Set([uniqueScenes[fileName].UUID]),
          to: AssetControlNode.id,
          from: uniqueAssets[assetFileName].id,
          length: 20,
        });
      });
    }

  // Process the outputs if they exist
    if (jsonData.outputs) {
      
      jsonData.outputs.forEach((output) => {
        const outputFileName = pathBasename(output.file_path);

        if (!uniqueAssets[outputFileName]) {
          uniqueAssets[outputFileName] = NodeFormatterInstance.format(output, nodeId++, uniqueScenes[fileName], "output");
          nodes.add(uniqueAssets[outputFileName]);
        } else {
          uniqueAssets[outputFileName].parentUUID.add(uniqueScenes[fileName].UUID);
          nodes.update(uniqueAssets[outputFileName]);
        }

        edges.add({
          id: edgeId++,
          parentUUID: new Set([uniqueScenes[fileName].UUID]),
          from: uniqueScenes[fileName].id,
          to: uniqueAssets[outputFileName].id,
          arrows: "to", // Add an arrow to the edge
        });

        edges.add({
          id: edgeId++,
          parentUUID: new Set([uniqueScenes[fileName].UUID]),
          to: OutputControlNode.id,
          from: uniqueAssets[outputFileName].id,
          length: 20,
          hidden: true,
        });
      });
    }
  });
}

function initNetwork() {

  console.log("NodeNet: network initializing at ", performance.now() - nodenetStartTime, "ms");

  var container = document.getElementById("mynetwork");

  const colorPalette = {
    orange: "#ffb703",
    teal: "#83f3c4",
    blue: "#8ecae6",
    aqua: "#219ebc",
    pink: "#ff80c0",
    grey: "#404040",
    black: "#000000",
    white: "#ffffff",
  };

  var options = {
    layout: {
      randomSeed: undefined,
      improvedLayout: false,
    },
    nodes: {
      shadow: true,
      x:0,
      y:0,
      shape: "dot",
      scaling: {
        min: 5,
        max: 10,
      },
      font: {
        size: 0,
        face: "Tahoma",
        strokeWidth: 2,
        strokeColor: "#ffffff",
      },
    },
    edges: {
      color: { inherit: 'both' },
      width: 0.15,
      smooth: {
        type: "cubicBezier",
        forceDirection: "none",
        roundness: 0.9,
      },
      arrows: {
        to: { enabled: true, scaleFactor: 0.5 },
      },
    },
    groups: {
      Texture: {
        shape: "diamond",
        color: {
          background: colorPalette.grey,
          border: colorPalette.blue,
          highlight: {
            background: "#8ecae6",
            border: "#d5dee2",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
      Geometry: {
        shape: "database",
        color: {
          background: colorPalette.grey,
          border: colorPalette.orange,
          highlight: {
            background: "#ffb703",
            border: "#a8a08b",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
      file_cache: {
        shape: "database",
        color: {
          background: colorPalette.grey,
          border: colorPalette.orange,
          highlight: {
            background: "#ffb703",
            border: "#a8a08b",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
      Render: {
        shape: "box",
        color: {
          background: colorPalette.grey,
          border: colorPalette.pink,
          highlight: {
            background: "#ff80c0",
            border: "#a8a08b",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
      read: {
        shape: "box",
        color: {
          background: colorPalette.grey,
          border: colorPalette.aqua,
          highlight: {
            background: "#219ebc",
            border: "#a8a08b",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
      write: {
        shape: "box",
        color: {
          background: colorPalette.grey,
          border: colorPalette.teal,
          highlight: {
            background: "#83f3c4",
            border: "#a8a08b",
            },
        },
        borderWidth: 1,
        borderWidthSelected: 2,
      },
    },
    interaction: {
      hideEdgesOnDrag: false,
      tooltipDelay: 200,
    },
    physics: {
      barnesHut: {
        gravitationalConstant: -150,
        springLength: 225,
        damping: 0.76,
        avoidOverlap: 0.33,
      },
      maxVelocity: 28,
      minVelocity: 0.49,
    },
  };

  data = {
    nodes: nodes,
    edges: edges,
  };

  network = new vis.Network(container, data, options);
  
  network.once("afterDrawing", () => {
      container.style.height = "99vh";
    });

  const config_options = {
    configure: {
      filter: function (option, path) {
        if (path.indexOf("physics") !== -1) {
          return true;
        }
        if (path.indexOf("smooth") !== -1 || option === "smooth") {
          return true;
        }
        return false;
      },
      enabled: true,
      showButton: false,
      container: document.getElementById("config"),
    }
  };

  networkInteraction();
  network.setOptions(config_options);

  console.log("NodeNet: network ready", performance.now() - nodenetStartTime, "ms");

}

function networkInteraction(){

  // interactions with the node net
  network.on("oncontext", function (params) {
  params.event.preventDefault();

  // Remove the existing context menu if any
  if (contextMenuElement) {
    contextMenuElement.remove();
  }

  contextMenuElement = showPopupMenu(params);

  // Add a blur event listener to the window to remove the context menu when it loses focus
  window.addEventListener("blur", removeContextMenu, { once: true });
  });

  // This event listener is to select and reposition the control nodes when the project file node is dragged

  network.on("dragStart", function (params) {
    // this is weird and messing up clustering
    if (params.nodes.length == 1) {
      if (network.isCluster(params.nodes[0]) == true) {
        //network.openCluster(params.nodes[0]);
      } else {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);

        if (node.group === "projectfile") {
          const connectedNodes = network.getConnectedNodes(nodeId);
          const connectedAssetControlNodes = connectedNodes.filter(
            (connectedNodeId) => {
              const connectedNode = nodes.get(connectedNodeId);
              return connectedNode && connectedNode.title === "AssetControl";
            }
          );
          const connectedOutputControlNodes = connectedNodes.filter(
            (connectedNodeId) => {
              const connectedNode = nodes.get(connectedNodeId);
              return connectedNode && connectedNode.title === "OutputControl";
            }
          );

          network.setSelection({
            nodes: [
              nodeId,
              ...connectedAssetControlNodes,
              ...connectedOutputControlNodes,
            ],
          });
          const asset_node = connectedAssetControlNodes[0];
          const output_node = connectedOutputControlNodes[0];

          const projFilePos = network.getPositions(nodeId);
          const newX = projFilePos[nodeId].x;
          const asset_newY = projFilePos[nodeId].y - 100;
          const output_newY = projFilePos[nodeId].y + 100;

          network.moveNode(connectedAssetControlNodes, newX, asset_newY);
          network.moveNode(connectedOutputControlNodes, newX, output_newY);

          //nodes.update({ id: asset_node, physics: false });
          //nodes.update({ id: output_node, physics: false });
        }
      }
    }
  });

  network.on("doubleClick", function (params) {
    if (params.nodes.length == 1) {
      const clickedNodeId = params.nodes[0];
      const nodeData = nodes.get(params.nodes[0]);


      console.log("doubleclick");
      //I want to display information for a node in a popup window when a user doubleclicks. I think I need
      //to send a message to main.js because I have to load content from the json file.

      ipcRenderer.send('open-node-details', nodeData.UUID);
    }
  });

  
}

function exportNetwork(){
  // variables for saving state

  networkState = {
    nodes: nodes.get(),
    edges: edges.get(),
  };

  console.log(networkState); // Check the value of networkState
  console.log(networkState.nodes); // Check the value of networkState.nodes

  if (networkState.nodes && Array.isArray(networkState.nodes)) {
      networkState.nodes.forEach(node => {
          const position = network.getPositions(node.id);
          if (position) {
            node.x = position[node.id].x;
            node.y = position[node.id].y;
          } else {
            node.x = 0;
            node.y = 0;
          }
      });
  }

  serializedState = JSON.stringify(networkState, null, 2);
}

function restoreNetwork(savedNetwork){
  console.log("loading data");

  nodesData = savedNetwork.nodes;
  edgesData = savedNetwork.edges;

  nodes = new vis.DataSet(savedNetwork.nodes);
  edges = new vis.DataSet(savedNetwork.edges);

};

function removeNodes(uuid){

  const existingNodeObjects = nodes.get();
  const existingEdgeObjects = edges.get();
  //console.log("removeNodes", uuid);

  const nodesToRemove = [];
  const edgesToRemove = [];
  const uniqueScenesToRemove = [];
  const uniqueAssetsToRemove = [];

  for (const node of existingNodeObjects) {
    // for every node in the network
    if (node.UUID === uuid || (node.parentUUID && node.parentUUID.has(uuid))) {
      // check if the node is the project file or if it's a child of the project file
      if ( node.parentUUID.size > 1 ) {
        // check if the node has more than one parent
        // if it does, remove the parentUUID from the node
        node.parentUUID.delete(uuid);
        nodes.update(node);
      } else {
        // if it only has one parent, add it to the list of nodes to remove
        nodesToRemove.push(node);
        if (node.group === "projectfile") {
          // if it's a project file, add it to the list of uniqueScenes to remove
          uniqueScenesToRemove.push(node.label);
        } else if(node.group !== "controlNodes" && node.group !== "projectfile") {
          // if it's not a control node or a project file, add it to the list of uniqueAssets to remove
          uniqueAssetsToRemove.push(node.label);
        }
      }
    }
  }
  for (const edge of existingEdgeObjects) {
    if (edge.parentUUID && edge.parentUUID.has(uuid)) {
      edgesToRemove.push(edge);
      //edges.remove(edge.id);
    }
  }
  //console.log("nodesToRemove", nodesToRemove);
  nodes.remove(nodesToRemove);

  //console.log("uniqueScenesToRemove", uniqueScenesToRemove);
  //console.log("uniqueAssetsToRemove", uniqueAssetsToRemove);
  for (const scene of uniqueScenesToRemove) {
    delete uniqueScenes[scene];
  }
  for (const asset of uniqueAssetsToRemove) {
    delete uniqueAssets[asset];
  }

  edges.remove(edgesToRemove);
};


// #region ipc event listeners
ipcRenderer.on("toggle-pin", () => {
  console.log("nodenet: toggle-pin received");
  togglePin(selectedNode);
});

ipcRenderer.on("save-network-data", (event) => {
  console.log("nodenet: save-network-data received from main");
  exportNetwork();
  //ipcRenderer.send('network-data-response', serializedState);
  ipcRenderer.send('network-data-response', serializedState);
});

ipcRenderer.on("process-json-data", (event, jsonData) => {
  console.log("nodenet: starting up, processing json data from database");
  receiveJsonDataAndDraw(jsonData)
  initNetwork();
});

ipcRenderer.on("control-vis", (event, checkValue) => {
  console.log("nodenet: control-vis received");
  controlVis(selectedNode, checkValue);
});

ipcRenderer.on("toggle-cluster", (event, node, checkValue) => {
  console.log("nodenet: toggle-cluster received");
  toggleCluster(node, checkValue);
});

// Scene Manager

ipcRenderer.on("toggleButton", (event, uuid, state, projectData) => {
  console.log(state);
  if (state === "add") {
    console.log("nodenet: toggleButton received, adding");
    console.time('add new nodes');
    addNewNodesAndEdges(projectData);
    console.timeEnd('add new nodes');
  } else if (state === "remove"){
    console.log("nodenet: toggleButton received, removing");
    removeNodes(uuid);
  }
  
});

ipcRenderer.on("delButton", (event, uuid) => {
  console.log("nodenet: delButton received");
  removeNodes(uuid);
});

// This is so stupid it's just to get the right click menu to also open the node details view GODDAMNIT
ipcRenderer.on("open-details", (event, UUID) => {
  ipcRenderer.send('open-node-details', UUID);
});

ipcRenderer.on("open-explorer", (event, UUID, directory) => {
  ipcRenderer.send('open-file-explorer', UUID, directory);
});

ipcRenderer.on('database-updated', (event, newData) => {
  console.log("database updated- new data received");
  addNewNodesAndEdges(newData);
});

ipcRenderer.on('load-network-data', (event, networkData) => {
  console.log("restoring network");
  restoreNetwork(networkData);
  
  initNetwork();
});

// #endregion

window.addEventListener("load", () => {
  nodenetStartTime = performance.now();
  console.log(`NodeNet: window loaded at ${performance.now()}`);
  ipcRenderer.send('request-network-data');
});
