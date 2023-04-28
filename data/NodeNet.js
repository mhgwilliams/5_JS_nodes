// Replace 'data.json' with the path to your JSON file
const jsonDataPath = './data/database.json';
const pathBasename = window.path.basename;

function loadJsonDataAndDraw() {
  fs.readFile(jsonDataPath, 'utf8', (err, jsonString) => {
    if (err) {
      console.log('Error reading file:', err);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonString);
      createNodesAndEdges(jsonData);
      redrawAll();
    } catch (err) {
      console.log('Error parsing JSON:', err);
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

  if (asset.type === 'Texture') {
    node.color = '#8ecae6';
  } else if (asset.type === 'Geometry') {
    node.color = '#ffb703';
  } else if (asset.type === 'read') {
    node.color = '#219ebc';
  } else {
    node.color = '#fb8500';
    node.shape = 'triangle';
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

    if (!uniqueScenes[fileName]) {
      uniqueScenes[fileName] = {
        id: nodeId++,
        label: fileName,
        title: fileName,
        color: 'yellow',
        shape: 'triangle',
      };
      nodesData.push(uniqueScenes[fileName]);
    }

    item.assets.forEach((asset) => {
      const assetFileName = pathBasename(asset.path);

      if (!uniqueAssets[assetFileName]) {
        uniqueAssets[assetFileName] = formatNode(asset, nodeId++);
        nodesData.push(uniqueAssets[assetFileName]);
      }

      edgesData.push({
        id: edgeId++,
        from: uniqueScenes[fileName].id,
        to: uniqueAssets[assetFileName].id,
      });
    });
  });

  nodes = new vis.DataSet(nodesData);
  edges = new vis.DataSet(edgesData);
}

function redrawAll() {
  var container = document.getElementById('mynetwork');

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
        roundness: 0.9
      },
    },
    interaction: {
      hideEdgesOnDrag: true,
      tooltipDelay: 200,
    },
    physics: {
      barnesHut: {
        gravitationalConstant: -150,
        springLength: 225,
        damping: 0.76,
        avoidOverlap: 0.33
      },
      maxVelocity: 28,
      minVelocity: 0.49
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
            const hasSingleConnection = network.getConnectedNodes(nodeOptions.id).length === 1;
            return isConnected && hasSingleConnection;
          },
          clusterNodeProperties: {
            label: `Cluster of ${clickedNodeId}`,
            borderWidth: 3,
            shape: "database",
          },
        };
        network.cluster(clusterOptions);
    }
  });


  network.once('afterDrawing', () => {
    container.style.height = '80vh'
  })
}
