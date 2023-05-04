// ui-handler.js
const { extractReadNodes } = require('../main/data_handler.js');

const loadNukeFileBtn = document.getElementById('loadNukeFileBtn');

loadNukeFileBtn.addEventListener('click', () => {
    const { dialog } = require('electron').remote;
    const options = {
        filters: [{ name: 'Nuke files', extensions: ['nk'] }],
        properties: ['openFile'],
    };

    dialog.showOpenDialog(options).then((result) => {
        if (!result.canceled) {
            const filePath = result.filePaths[0];
            const readNodes = extractReadNodes(filePath);
            console.log('Read nodes:', readNodes);
        }
    });
});
