// this is not a renderer process apparently because I'm requiring it in main and using it there

const { app, Menu } = require('electron');

function buildPopupMenu(mainWindow) {
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
                    label: "Toggle Control Nodes",
                    click: () => {console.log("control nodes")}
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
    return Menu.buildFromTemplate(contextTemplate);

}

module.exports.buildPopupMenu = buildPopupMenu;