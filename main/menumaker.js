// this is not a renderer process apparently because I'm requiring it in main and using it there

const { app, Menu, ipcMain } = require('electron');

function buildPopupMenu(mainWindow, node) {
    console.log(node);
    const contextTemplate= [
        {
            label: "Node Options",
            submenu: [
                {
                    label: "Toggle Pin",
                    click: () => {
                        togglePin();
                    }
                },
                {
                    label: "Cluster In/Out",
                    type: "checkbox",
                    checked: node.clusterInOut ? true : false,
                    click: (item) => {
                        const checkValue = item.checked;
                        console.log("cluster in/out", checkValue);
                        //toggleCluster(checkValue);
                    }
                },
                {
                    label: "Control Nodes Hidden",
                    type: "checkbox",
                    checked: node.controlNodes ? true : false,
                    click: (item) => {
                        const checkValue = item.checked;
                        //console.log("control nodes", checkValue);
                        //controlVis(node, checkValue);
                    }
                }
            ]
        },
        {
            label: "Open Details",
            click: () => {
                const nodeUUID = node.UUID;
                openDetails(nodeUUID);
            }
        },
        {
            label: "Open Directory",
            click: () => {
                const nodeUUID = node.UUID;
                const directory = true;
                openFileExplorer(nodeUUID, directory);
            }
        },
        {
            label: "Open File",
            click: () => {
                const nodeUUID = node.UUID;
                const directory = false;
                openFileExplorer(nodeUUID, directory);
            }
        }
    ];

    function togglePin(){
        console.log("menumaker: togglePin");
        mainWindow.webContents.send('toggle-pin');
    }

    function toggleCluster(checkValue){
        console.log("menumaker: toggleCluster");
        mainWindow.webContents.send('toggle-cluster', node, checkValue);
    }

    function controlVis(checkValue){
        console.log("menumaker: controlVis");
        mainWindow.webContents.send('control-vis', checkValue);
    }

    function openDetails(nodeUUID){
        console.log("menumaker: openDetails", nodeUUID);
        mainWindow.webContents.send('open-details', nodeUUID);
    }

    function openFileExplorer(nodeUUID, directory) {
        console.log("menumaker: open explorer", nodeUUID);
        mainWindow.webContents.send('open-explorer', nodeUUID, directory);
      }

    return Menu.buildFromTemplate(contextTemplate);

}

module.exports.buildPopupMenu = buildPopupMenu;