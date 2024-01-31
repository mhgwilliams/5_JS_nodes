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

function generateBuildNumber() {
    const version = packageJson.version;
    const gitHash = getGitCommitHash();
    const buildNumber = `${version}-${gitHash}`;

    // Write to a file
    const filePath = path.join(__dirname, '..', 'build-number.txt');
    fs.writeFileSync(filePath, buildNumber);

    console.log(`Generated build number: ${buildNumber}`);
}

generateBuildNumber();
