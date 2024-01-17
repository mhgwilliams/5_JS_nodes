const { ipcRenderer } = require('electron');
const jsonview = require('@pgrabovets/json-view');

ipcRenderer.on('node-data', (event, nodeInfo) => {
  // Assuming you have an element with id 'nodeInfoContainer' in your HTML
  const container = document.getElementById('nodeInfoContainer');
  if (container) {
    const tree = jsonview.create(nodeInfo);

    jsonview.render(tree, container);
    //jsonview.expand(tree);

    // Convert nodeInfo object to a string or format it as needed
    //container.innerText = JSON.stringify(nodeInfo, null, 2);
  }
});
