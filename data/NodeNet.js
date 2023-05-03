
// Replace 'data.json' with the path to your JSON file
const jsonDataPath = "./data/database.json";
const pathBasename = window.path.basename;


var imgDIR = "./icons/";


function loadJsonDataAndDraw() {
  fs.readFile(jsonDataPath, "utf8", (err, jsonString) => {
    if (err) {
      console.log("Error reading file:", err);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonString);
      createNodesAndEdges(jsonData);
      redrawAll();
    } catch (err) {
      console.log("Error parsing JSON:", err);
    }
  });
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

  let nodeId = 1;
  let edgeId = 1;

  jsonData.data.forEach((item) => {
    const fileName = item.c4d_file_name || item.nuke_script_name;
    const isC4dFile = item.c4d_file_name !== undefined;

    if (!uniqueScenes[fileName]) {
      uniqueScenes[fileName] = {
        id: nodeId++,
      label: fileName,
      title: fileName,
      group: "projectfile",
      color: "yellow",
      shape: "image",
      image: isC4dFile ? imgDIR + "c4d.png" : imgDIR+ "nuke.png", // Set the image based on the file type
    };
      nodesData.push(uniqueScenes[fileName]);

      // Create a hidden node for the project file node to control the textures
      nodesData.push({
        id: nodeId++,
        hidden: false,
        physics: true,
        color: "rgba(255,255,255,0.1)",
        opacity: 0.1,
        title: "AssetControl",
        parentProjectFileId: uniqueScenes[fileName].id, // Add this custom property to store the id of the project file node
      });

      // Create a hidden node for the project file node to control the renders
      nodesData.push({
        id: nodeId++,
        hidden: false,
        physics: true,
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
        color: "red",
        hidden: true,
      });

      // Create an edge between the hidden node and the project file node
      edgesData.push({
        id: edgeId++,
        from: uniqueScenes[fileName].id,
        to: nodeId - 2,
        length: 20,
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


  network.on("selectNode", function (params) {
    if (params.nodes.length == 1) {
      if (network.isCluster(params.nodes[0]) == true) {
        network.openCluster(params.nodes[0]);
      } else {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
  
        if (node.group === "projectfile") {
          const connectedNodes = network.getConnectedNodes(nodeId);
          const connectedAssetControlNodes = connectedNodes.filter((connectedNodeId) => {
            const connectedNode = nodes.get(connectedNodeId);
            return connectedNode && connectedNode.title === "AssetControl";
          });
          const connectedOutputControlNodes = connectedNodes.filter((connectedNodeId) => {
            const connectedNode = nodes.get(connectedNodeId);
            return connectedNode && connectedNode.title === "OutputControl";
          });
  
          network.setSelection({
            nodes: [nodeId, ...connectedAssetControlNodes, ...connectedOutputControlNodes],
          });
          const asset_node = connectedAssetControlNodes[0];
          const output_node = connectedOutputControlNodes[0];

          const projFilePos = network.getPositions(nodeId);
          const newX = projFilePos[nodeId].x;
          const asset_newY = projFilePos[nodeId].y - 200;
          const output_newY = projFilePos[nodeId].y + 200;
          
          network.moveNode(connectedAssetControlNodes, newX, asset_newY);
          network.moveNode(connectedOutputControlNodes, newX, output_newY);

          nodes.update({ id: asset_node, physics: false });
          nodes.update({ id: output_node, physics: false });

        }
      }
    }
  });
  

  network.on("dragEnd", (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];


      nodes.update({ id: nodeId, physics: false });
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

  network.once("afterDrawing", () => {
    container.style.height = "99vh";
  });
}

function testarino(){
  console.log("testing from nodenet");
}

module.exports = {
  testarino
}