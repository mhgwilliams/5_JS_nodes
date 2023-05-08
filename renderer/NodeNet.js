const pathBasename = window.electronAPI.basename;
const jsonDataPath = "../data/database.json";

var imgDIR = "./icons/";
var nodes;

let contextMenuElement = null;
let selectedNode = null;

function objectToArray(obj) {
  return Object.keys(obj).map(function (key) {
    obj[key].id = key;
    return obj[key];
  });
}

function addConnections(elem, index) {
  // need to replace this with a tree of the network, then get child direct children of the element
  elem.connections = network.getConnectedNodes(index);
}


function exportNetwork() {
  var nodes = objectToArray(network.getPositions());
  nodes.forEach(addConnections);

  // pretty print node data
  var exportValue = JSON.stringify(nodes, undefined, 2);

  // Send a message to the main process to save the network data
  ipcRenderer.send('save-network-data', exportValue);
}

function loadNetworkFromFile() {
  ipcRenderer.send('load-network-data');
}


function showPopupMenu(params) {
  selectedNode = network.getNodeAt(params.pointer.DOM);
  if (selectedNode) {
    console.log("selectedNode", selectedNode);
    ipcRenderer.send("nodeContext", selectedNode);
  }
  return contextMenuElement;
}

function togglePin(params) {
  console.log(`togglePin(${params})`);
  const nodeId = params;

  if (nodeId) {
    const node = nodes.get(nodeId);
    const currentPhysics = node.physics !== undefined ? node.physics : true;
    nodes.update({ id: nodeId, physics: !currentPhysics });
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
    redrawAll();
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
  const nodesData = [];
  const edgesData = [];
  const uniqueAssets = {};
  const uniqueScenes = {};

  const fileTypeIcons = {
    c4d: "c4d.png",
    nuke: "nuke.png",
    hou: "hou.png",
    // Add more file types here
  };

  const fileTypeKeys = {
    c4d: "c4d_file_name",
    nuke: "nuke_script_name",
    hou: "hou_file_name",
    // Add more file types here
  };

  let nodeId = 1;
  let edgeId = 1;

  jsonData.data.forEach((item) => {
    const fileTypes = Object.keys(fileTypeIcons);
    const fileType = fileTypes.find((type) => item[fileTypeKeys[type]] !== undefined);
    const fileName = item[fileTypeKeys[fileType]];

    if (!uniqueScenes[fileName]) {
      uniqueScenes[fileName] = {
        id: nodeId++,
        label: fileName,
        title: fileName,
        group: "projectfile",
        color: "yellow",
        shape: "image",
        physics: false,
        image: imgDIR + fileTypeIcons[fileType], // Set the image based on the file type
      };
      nodesData.push(uniqueScenes[fileName]);

      // Create a hidden node for the project file node to control the textures
      nodesData.push({
        id: nodeId++,
        hidden: false,
        physics: false,
        color: "rgba(255,255,255,0.1)",
        opacity: 0.1,
        title: "AssetControl",
        parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
      });

      // Create a hidden node for the project file node to control the renders
      nodesData.push({
        id: nodeId++,
        hidden: false,
        physics: false,
        color: "rgba(255,255,255,0.1)",
        opacity: 0.1,
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
        from: AssetControlNode.id,
        to: uniqueAssets[assetFileName].id,
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
          from: OutputControlNode.id,
          to: uniqueAssets[outputFileName].id,
          length: 20,
          hidden: true,
        });
      });
    }
  });

  nodes = new vis.DataSet(nodesData);
  edges = new vis.DataSet(edgesData);
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

  var data = {
    nodes: nodes,
    edges: edges,
  };

  network = new vis.Network(container, data, options);

  //loadNetworkFromFile();

  // interactions with the node net

  network.on("oncontext", function (params) {
    params.event.preventDefault();
    console.log("oncontext", params);

    // Remove the existing context menu if any
    if (contextMenuElement) {
      contextMenuElement.remove();
    }

    contextMenuElement = showPopupMenu(params);

    // Add a blur event listener to the window to remove the context menu when it loses focus
    window.addEventListener("blur", removeContextMenu, { once: true });
  });

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
          const asset_newY = projFilePos[nodeId].y - 200;
          const output_newY = projFilePos[nodeId].y + 200;

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

  ipcRenderer.on('network-data-loaded', (event, inputData) => {
    if (inputData) {
      var data = {
        nodes: getNodeData(inputData),
        edges: getEdgeData(inputData),
      };
  
      network = new vis.Network(container, data, {});
    }
  });

  network.once("afterDrawing", () => {
    container.style.height = "99vh";
  });
}

// ipc event listeners
ipcRenderer.on("toggle-pin", () => {
  console.log("nodenet: toggle-pin received");
  togglePin(selectedNode);
});

function getNodeData(data) {
  var networkNodes = [];

  data.forEach(function (elem, index, array) {
    networkNodes.push({
      id: elem.id,
      label: elem.id,
      x: elem.x,
      y: elem.y,
    });
  });

  return new vis.DataSet(networkNodes);
}

function getNodeById(data, id) {
  for (var n = 0; n < data.length; n++) {
    if (data[n].id == id) {
      // double equals since id can be numeric or string
      return data[n];
    }
  }

  throw "Can not find id '" + id + "' in data";
}

function getEdgeData(data) {
  var networkEdges = [];

  data.forEach(function (node) {
    // add the connection
    node.connections.forEach(function (connId, cIndex, conns) {
      networkEdges.push({ from: node.id, to: connId });
      let cNode = getNodeById(data, connId);

      var elementConnections = cNode.connections;

      // remove the connection from the other node to prevent duplicate connections
      var duplicateIndex = elementConnections.findIndex(function (connection) {
        return connection == node.id; // double equals since id can be numeric or string
      });

      if (duplicateIndex != -1) {
        elementConnections.splice(duplicateIndex, 1);
      }
    });
  });

  return new vis.DataSet(networkEdges);
}

window.addEventListener("load", () => {
  loadJsonDataAndDraw();
});
