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
            const newComment = `# Build number: ${buildNumber}\n`;
            const newBuildNumString = `buildNum = "${buildNumber}"\n`;

            const commentRegex = /# Build number: .*\n/;
            const buildNumRegex = /buildNum = ".*"\n/;

            let updated = false;

            // Update the comment if it exists
            if (commentRegex.test(data)) {
                data = data.replace(commentRegex, newComment);
                updated = true;
            }

            // Update the buildNum variable if it exists
            if (buildNumRegex.test(data)) {
                data = data.replace(buildNumRegex, newBuildNumString);
                updated = true;
            }

            // If neither existed, prepend both
            if (!commentRegex.test(data) && !buildNumRegex.test(data)) {
                data = newComment + newBuildNumString + data;
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(file, data, 'utf8');
                console.log(`Updated ${file} with new build number and buildNum string.`);
            } else {
                console.log(`${file} is already up to date with the current build number. Skipping.`);
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
