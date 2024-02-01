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
        path.join(__dirname, '..', 'c4d', 'c4d_generateJson.py'),
        path.join(__dirname, '..', 'c4d', 'c4d_autoGenerateJson.py')
    ];

    files.forEach(file => {
        try {
            let data = fs.readFileSync(file, 'utf8');
            const commentPrefix = "# Build number:";
            const buildNumPrefix = "buildNum =";

            let newContent = [];
            let foundComment = false;
            let foundBuildNum = false;

            // Split the data by new lines and process each line
            const lines = data.split('\n');
            lines.forEach(line => {
                if (line.startsWith(commentPrefix)) {
                    newContent.push(`${commentPrefix} ${buildNumber}`);
                    foundComment = true;
                } else if (line.startsWith(buildNumPrefix)) {
                    newContent.push(`buildNum = "${buildNumber}"`);
                    foundBuildNum = true;
                } else {
                    newContent.push(line);
                }
            });

            // Prepend the comment and buildNum if they weren't found
            if (!foundComment) {
                newContent.unshift(`${commentPrefix} ${buildNumber}`);
            }
            if (!foundBuildNum) {
                newContent.unshift(`buildNum = "${buildNumber}"`);
            }

            // Join the content back together and write to the file
            const updatedData = newContent.join('\n');
            fs.writeFileSync(file, updatedData, 'utf8');
            console.log(`Updated ${file} with build number and buildNum string.`);

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
