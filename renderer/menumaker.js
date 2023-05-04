const { app, Menu } = require('electron');

const contextTemplate= [
    {
        label: "Node Options",
        submenu: [
            {
                label: "Toggle Pin",
                click: () => {
                    console.log("node pin");
                    doSomething();
                    testarino();
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

function doSomething(){
    console.log("did something in menumaker");
}

module.exports.popupMenu = Menu.buildFromTemplate(contextTemplate);
