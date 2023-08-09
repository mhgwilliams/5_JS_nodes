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
                    label: "Control Nodes Hidden",
                    type: "checkbox",
                    checked: node.controlNodes ? true : false,
                    click: (item) => {
                        const checkValue = item.checked;
                        //console.log("control nodes", checkValue);
                        controlVis(checkValue);
                    }
                }
            ]
        },
        {
            label: "more options"
        }
    ];

    function togglePin(){
        console.log("menumaker: togglePin");
        mainWindow.webContents.send('toggle-pin');
    }

    function controlVis(checkValue){
        console.log("menumaker: controlVis");
        mainWindow.webContents.send('control-vis', checkValue);
    }

    return Menu.buildFromTemplate(contextTemplate);

}

module.exports.buildPopupMenu = buildPopupMenu;