const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'package.json');
const packageJson = require(filePath);

const buildNumber = process.env.GITHUB_RUN_NUMBER || 1;
packageJson.version = `${packageJson.version}.${buildNumber}`;

fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
