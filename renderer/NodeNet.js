//const { ipcRenderer } = require("electron");

const pathBasename = window.electronAPI.basename;
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

    nodes.update({ id: nodeId, controlNodes: !currentCheckVal });

    const connectedNodes = network.getConnectedNodes(nodeId);
    connectedNodes.forEach(connectedNodeId => {
      const connectedNode = nodes.get(connectedNodeId);
      if (connectedNode.group === "controlNodes") {
        console.log(connectedNode);
        const hiddenControl = checkValue ? true : false;
        nodes.update({ id: connectedNodeId, hidden: hiddenControl, color: "rgba(255,255,255,0.1)" });
      }
    });
  }
}



function removeContextMenu() {
  if (contextMenuElement) {
    contextMenuElement.remove();
    selectedNode = null;
    contextMenuElement = null;
  }
}

async function loadJsonDataAndDraw() {
  try {
    const jsonData = await fetch(jsonDataPath).then((response) =>
      response.json()
    );
    console.log("JSON Data is ", jsonData);
    createNodesAndEdges(jsonData);
  } catch (err) {
    console.log("Error reading file or parsing JSON:", err);
  }
}

function formatNode(asset, id) {
  const assetFileName = pathBasename(asset.path);

  const node = {
    id,
    label: assetFileName,
    title: assetFileName,
  };

  if (asset.type === "Texture") {
    node.color = "#8ecae6";
    node.shape = "diamond";
    node.size = 10;
  } else if (asset.type === "Geometry") {
    node.color = "#ffb703";
    node.shape = "database";
    node.size = 10;
  } else if (asset.type === "read") {
    node.color = "#219ebc";
    node.shape = "box";
    node.size = 15;
  } else if (asset.type === "write") {
    node.color = "#83f3c4";
    node.shape = "box";
    node.size = 15;
  } else if (asset.type === "Render") {
    node.color = "#ff80c0";
    node.shape = "box";
  } else if (asset.type === "alembic_rop") {
    node.color = "#ffb703";
    node.shape = "database";
  } else {
    node.color = "#fb8500";
    node.shape = "hexagon";
  }

  return node;
}

function createNodesAndEdges(jsonData) {

  const fileTypeIcons = {
    c4d: "c4d.png",
    nk: "nuke.png",
    hip: "hou.png",
    // Add more file types here
  };

  let nodeId = 1;
  let edgeId = 1;

  jsonData.data.forEach((item) => {
    const fileExtension = item.file_name.split('.').pop().toLowerCase();
    const fileType = fileExtension in fileTypeIcons ? fileExtension : null;
    //const fileType = fileTypes.find((type) => item[fileTypeKeys[type]] !== undefined);
    const fileName = item.file_name;
    const uniqueID = item.id;


    if (!uniqueScenes[fileName]) {
      uniqueScenes[fileName] = {
        id: nodeId++,
        UUID: uniqueID,
        label: fileName,
        title: fileName, //testing div element as title
        group: "projectfile",
        controlNodes: true, // control nodes hidden option
        color: "yellow",
        shape: "image",
        physics: false,
        image: imgDIR + fileTypeIcons[fileType], // Set the image based on the file type
      };
      nodesData.push(uniqueScenes[fileName]);

      // Create a hidden node for the project file node to control the textures
      nodesData.push({
        id: nodeId++,
        hidden: true,
        physics: false,
        group: "controlNodes",
        color: "rgba(255,255,255,0.1)",
        title: "AssetControl",
        parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
      });

      // Create a hidden node for the project file node to control the renders
      nodesData.push({
        id: nodeId++,
        hidden: true,
        physics: false,
        group: "controlNodes",
        color: "rgba(255,255,255,0.1)",
        title: "OutputControl",
        parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
      });

      // Create an edge between the hidden node and the project file node
      edgesData.push({
        id: edgeId++,
        from: uniqueScenes[fileName].id,
        to: nodeId - 1,
        length: 20,
        physics: false,
        color: "red",
        hidden: true,
      });

      // Create an edge between the hidden node and the project file node
      edgesData.push({
        id: edgeId++,
        from: uniqueScenes[fileName].id,
        to: nodeId - 2,
        length: 20,
        physics: false,
        color: "red",
        hidden: true,
      });
    }

    item.assets.forEach((asset) => {
      const assetFileName = pathBasename(asset.path);

      if (!uniqueAssets[assetFileName]) {
        uniqueAssets[assetFileName] = formatNode(asset, nodeId++);
        nodesData.push(uniqueAssets[assetFileName]);
      }

      edgesData.push({
        id: edgeId++,
        to: uniqueScenes[fileName].id,
        from: uniqueAssets[assetFileName].id,
        arrows: "to", // Add an arrow to the edge
      });

      // Connect hidden nodes to their texture nodes
      const AssetControlNode = nodesData.find(
        (item) =>
          item.parentProjectFileId === uniqueScenes[fileName].id &&
          item.title === "AssetControl"
      );

      edgesData.push({
        id: edgeId++,
        to: AssetControlNode.id,
        from: uniqueAssets[assetFileName].id,
        length: 20,
        hidden: true,
      });
    });

    // Process the outputs if they exist
    if (item.outputs) {
      item.outputs.forEach((output) => {
        const outputFileName = pathBasename(output.path);

        if (!uniqueAssets[outputFileName]) {
          uniqueAssets[outputFileName] = formatNode(output, nodeId++);
          nodesData.push(uniqueAssets[outputFileName]);
        }

        edgesData.push({
          id: edgeId++,
          from: uniqueScenes[fileName].id,
          to: uniqueAssets[outputFileName].id,
          arrows: "to", // Add an arrow to the edge
        });

        const OutputControlNode = nodesData.find(
          (item) =>
            item.parentProjectFileId === uniqueScenes[fileName].id &&
            item.title === "OutputControl"
        );

        edgesData.push({
          id: edgeId++,
          to: OutputControlNode.id,
          from: uniqueAssets[outputFileName].id,
          length: 20,
          hidden: true,
        });
      });
    }
  });

  nodes = new vis.DataSet(nodesData);
  edges = new vis.DataSet(edgesData);

  initNetwork();
}
function addNodesAndEdges(jsonData) {

  const fileTypeIcons = {
    c4d: "c4d.png",
    nk: "nuke.png",
    hip: "hou.png",
    // Add more file types here
  };

  let nodeId;
  let edgeId;

  if (nodesData.length > 0 && typeof nodesData[nodesData.length - 1].id !== 'undefined') {
      nodeId = nodesData[nodesData.length - 1].id + 1;
  } else {
      nodeId = 1;
  }

  if (edgesData.length > 0 && typeof edgesData[edgesData.length - 1].id !== 'undefined') {
      edgeId = edgesData[edgesData.length - 1].id + 1;
  } else {
      edgeId = 1;
  }

  const fileExtension = jsonData.file_name.split('.').pop().toLowerCase();
  const fileType = fileExtension in fileTypeIcons ? fileExtension : null;
  //const fileType = fileTypes.find((type) => item[fileTypeKeys[type]] !== undefined);
  const fileName = jsonData.file_name;
  const uniqueID = jsonData.id;


  if (!uniqueScenes[fileName]) {
    uniqueScenes[fileName] = {
      id: nodeId++,
      UUID: uniqueID,
      label: fileName,
      title: fileName, //testing div element as title
      group: "projectfile",
      controlNodes: true, // control nodes hidden option
      color: "yellow",
      shape: "image",
      physics: false,
      image: imgDIR + fileTypeIcons[fileType], // Set the image based on the file type
    };
    nodesData.push(uniqueScenes[fileName]);

    // Create a hidden node for the project file node to control the textures
    nodesData.push({
      id: nodeId++,
      hidden: true,
      physics: false,
      group: "controlNodes",
      color: "rgba(255,255,255,0.1)",
      title: "AssetControl",
      parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
    });

    // Create a hidden node for the project file node to control the renders
    nodesData.push({
      id: nodeId++,
      hidden: true,
      physics: false,
      group: "controlNodes",
      color: "rgba(255,255,255,0.1)",
      title: "OutputControl",
      parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
    });

    // Create an edge between the hidden node and the project file node
    edgesData.push({
      id: edgeId++,
      from: uniqueScenes[fileName].id,
      to: nodeId - 1,
      length: 20,
      physics: false,
      color: "red",
      hidden: true,
    });

    // Create an edge between the hidden node and the project file node
    edgesData.push({
      id: edgeId++,
      from: uniqueScenes[fileName].id,
      to: nodeId - 2,
      length: 20,
      physics: false,
      color: "red",
      hidden: true,
    });
  }

  jsonData.assets.forEach((asset) => {
    const assetFileName = pathBasename(asset.path);

    if (!uniqueAssets[assetFileName]) {
      uniqueAssets[assetFileName] = formatNode(asset, nodeId++);
      nodesData.push(uniqueAssets[assetFileName]);
    }

    edgesData.push({
      id: edgeId++,
      to: uniqueScenes[fileName].id,
      from: uniqueAssets[assetFileName].id,
      arrows: "to", // Add an arrow to the edge
    });

    // Connect hidden nodes to their texture nodes
    const AssetControlNode = nodesData.find(
      (item) =>
        item.parentProjectFileId === uniqueScenes[fileName].id &&
        item.title === "AssetControl"
    );

    edgesData.push({
      id: edgeId++,
      to: AssetControlNode.id,
      from: uniqueAssets[assetFileName].id,
      length: 20,
      hidden: true,
    });
  });

  // Process the outputs if they exist
  if (jsonData.outputs) {
    jsonData.outputs.forEach((output) => {
      const outputFileName = pathBasename(output.path);

      if (!uniqueAssets[outputFileName]) {
        uniqueAssets[outputFileName] = formatNode(output, nodeId++);
        nodesData.push(uniqueAssets[outputFileName]);
      }

      edgesData.push({
        id: edgeId++,
        from: uniqueScenes[fileName].id,
        to: uniqueAssets[outputFileName].id,
        arrows: "to", // Add an arrow to the edge
      });

      const OutputControlNode = nodesData.find(
        (item) =>
          item.parentProjectFileId === uniqueScenes[fileName].id &&
          item.title === "OutputControl"
      );

      edgesData.push({
        id: edgeId++,
        to: OutputControlNode.id,
        from: uniqueAssets[outputFileName].id,
        length: 20,
        hidden: true,
      });
    });
  }

  nodes = new vis.DataSet(nodesData);
  edges = new vis.DataSet(edgesData);


  initNetwork();
}

function initNetwork() {

  console.log("network initialized");

  var container = document.getElementById("mynetwork");

  var options = {
    layout: {
      randomSeed: undefined,
      improvedLayout: false,
    },
    nodes: {
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
      color: { inherit: true },
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
      container: document.getElementById("config"),
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

  networkInteraction();

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
    if (params.nodes.length == 1) {
      if (network.isCluster(params.nodes[0]) == true) {
        network.openCluster(params.nodes[0]);
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

  // this event listener handles clustering. Should consider changing cluster functionality
  network.on("doubleClick", function (params) {
    if (params.nodes.length == 1) {
      const clickedNodeId = params.nodes[0];
      const nodeData = nodes.get(params.nodes[0]);


      console.log("doubleclick");
      //I want to display information for a node in a popup window when a user doubleclicks. I think I need
      //to send a message to main.js because I have to load content from the json file.

      ipcRenderer.send('open-node-details', nodeData.UUID);

      // Check if the clicked node is a cluster
      // Cluster the nodes directly connected to the clicked node
      const connectedNodes = network.getConnectedNodes(clickedNodeId);
      const clusterOptions = {
        joinCondition: function (nodeOptions) {
          const isConnected = connectedNodes.indexOf(nodeOptions.id) !== -1;
          const hasSingleConnection =
            network.getConnectedNodes(nodeOptions.id).length === 1;
          return isConnected && hasSingleConnection;
        },
        clusterNodeProperties: {
          label: `Cluster of ${clickedNodeId}`,
          borderWidth: 3,
          shape: "database",
          size: 20,
        },
      };
      network.cluster(clusterOptions);
    }
  });

  
}

function redrawAll() {

  var container = document.getElementById("mynetwork");

  var options = {
    layout: {
      randomSeed: undefined,
      improvedLayout: false,
    },
    nodes: {
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
      color: { inherit: true },
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
      container: document.getElementById("config"),
    },
  };

  data = {
    nodes: nodes,
    edges: edges,
  };

  network = new vis.Network(container, data, options);


}

function exportNetwork(){
  // variables for saving state

  networkState = {
    nodes: nodesData,
    edges: edgesData,
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

// ipc event listeners
ipcRenderer.on("toggle-pin", () => {
  console.log("nodenet: toggle-pin received");
  togglePin(selectedNode);
});

ipcRenderer.on("save-network-data", (event) => {
  console.log("nodenet: save-network-data received from main");
  exportNetwork();
  ipcRenderer.send('network-data-response', serializedState);
});

ipcRenderer.on("process-json-data", (event) => {
  loadJsonDataAndDraw();
  //initNetwork();
});

ipcRenderer.on("control-vis", (event, checkValue) => {
  console.log("nodenet: control-vis received");
  controlVis(selectedNode, checkValue);
});

ipcRenderer.on('database-updated', (event, newData) => {
  console.log("database updated- new data received");
  //console.log(newData);
  addNodesAndEdges(newData);
});

ipcRenderer.on('load-network-data', (event, networkData) => {
  console.log("restoring network");
  restoreNetwork(networkData);
  //before i re-init the network i need to check if there are any new nodes from the database
  initNetwork();
});

window.addEventListener("load", () => {
  console.log("window loaded");
  ipcRenderer.send('request-network-data');
});
