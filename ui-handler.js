// ui-handler.js

const {
    findJsonFiles,
    readJsonData,
    saveDataList,
    extractReadNodes,
    updateDatabase,
} = require('./data_handler.js');

const loadNukeFileBtn = document.getElementById('load-nuke-file');
const updateDataBtn = document.getElementById('update-data');
const textOutput = document.getElementById('text-output');

loadNukeFileBtn.addEventListener('click', () => {
    // Implement your file dialog logic here to get the file path
    // You can use Electron's dialog module for this purpose
    const { dialog } = require('electron').remote;
    const options = {
        filters: [{ name: 'Nuke files', extensions: ['nk'] }],
        properties: ['openFile'],
    };

    dialog.showOpenDialog(options).then((result) => {
        if (!result.canceled) {
            const filePath = result.filePaths[0];
            textOutput.value = 'Processing Nuke file...';

            const readNodes = extractReadNodes(filePath);
            const nukeScriptName = path.basename(filePath);
            const date = new Date().toISOString().split('T')[0];

            const assets = readNodes.map((path) => ({ type: 'read', path }));

            const output = {
                nuke_script_name: nukeScriptName,
                date,
                assets,
            };

            updateDatabase(output);
            textOutput.value += '\nFinished processing Nuke file.';
            textOutput.value += '\nJSON data appended to "database.json".';
        }
    });
});

updateDataBtn.addEventListener('click', () => {
    // Implement your directory dialog logic here to get the root directory
    // You can use Electron's dialog module for this purpose
    const { dialog } = require('electron').remote;
    const options = {
        properties: ['openDirectory'],
    };

    dialog.showOpenDialog(options).then((result) => {
        if (!result.canceled) {
            const rootDir = result.filePaths[0];
            textOutput.value = 'Updating data from directory...';

            const jsonFiles = findJsonFiles(rootDir);
            const dataList = readJsonData(jsonFiles);

            if (fs.existsSync('database.json')) {
                const existingData = JSON.parse(fs.readFileSync('database.json', 'utf8'));
                dataList.push(...existingData.data);
            }

            saveDataList(dataList, 'database.json');
            textOutput.value += '\nFinished updating data.';
            textOutput.value += '\nCombined JSON data saved to "database.json".';
        }
    });
});
