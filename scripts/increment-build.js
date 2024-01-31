const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

function getGitCommitHash() {
    try {
        // Get the short format of the current commit hash
        return execSync('git rev-parse --short HEAD').toString().trim();
    } catch (error) {
        console.error('Error fetching Git commit hash:', error);
        return 'unknown';
    }
}

function addCommentAndBuildNumToFiles(buildNumber) {
    const files = [
        path.join(__dirname, '..', 'c4d', 'c4d_generateJson.pyp'),
        path.join(__dirname, '..', 'c4d', 'c4d_autoGenerateJson.pyp')
    ];

    files.forEach(file => {
        try {
            let data = fs.readFileSync(file, 'utf8');
            const comment = `# Build number: ${buildNumber}\n`;
            const buildNumString = `buildNum = "${buildNumber}"\n`;
            // Check if the file already contains the buildNum variable to avoid duplication
            if (!data.includes(`buildNum = "`)) {
                // Prepend the buildNum string and the comment
                data = comment + buildNumString + data;
                fs.writeFileSync(file, data, 'utf8');
                console.log(`Updated ${file} with build number and buildNum string.`);
            } else {
                console.log(`${file} already contains a buildNum variable. Skipping update.`);
            }
        } catch (error) {
            console.error(`Error updating ${file}:`, error);
        }
    });
}

function generateBuildNumber() {
    const version = packageJson.version;
    const gitHash = getGitCommitHash();
    const buildNumber = `${version}-${gitHash}`;

    // Write to a file
    const filePath = path.join(__dirname, '..', 'build-number.txt');
    fs.writeFileSync(filePath, buildNumber);

    // Now prepend the build number as a comment and populate buildNum in the Python scripts
    addCommentAndBuildNumToFiles(buildNumber);

    console.log(`Generated build number: ${buildNumber}`);
}

generateBuildNumber();
