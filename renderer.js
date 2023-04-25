const vis = require("vis-network");
const { DataSet, Network } = vis;

var network;

function redrawAll() {
  var container = document.getElementById("network");
  var options = {
    nodes: {
      shape: "dot",
      scaling: {
        min: 10,
        max: 30,
      },
      font: {
        size: 12,
        face: "Tahoma",
      },
    },
    edges: {
      color: { inherit: true },
      width: 0.15,
      smooth: {
        type: "continuous",
      },
    },
    interaction: {
      hideEdgesOnDrag: true,
      tooltipDelay: 200,
    },
    configure: {
      filter: function (option, path) {
        if (option === "inherit") {
          return true;
        }
        if (option === "type" && path.indexOf("smooth") !== -1) {
          return true;
        }
        if (option === "roundness") {
          return true;
        }
        if (option === "hideEdgesOnDrag") {
          return true;
        }
        if (option === "hideNodesOnDrag") {
          return true;
        }
        return false;
      },
      container: document.getElementById("optionsContainer"),
      showButton: false,
    },
    physics: false,
  };

  var data = { nodes: nodes, edges: edges };
  // Note: data is coming from ./data/WorldCup2014.js
  network = new Network(container, data, options);
  
  network.once('afterDrawing', () => {
    container.style.height = '100vh'
  })
}

redrawAll();


