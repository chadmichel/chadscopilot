const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  sourceDir: path.resolve(__dirname, '../dist/panic-blaster'),
  deploymentDir: process.env.DEPLOYMENT_DIR || '/var/www/panicblaster',
  backupDir: process.env.BACKUP_DIR || '/var/www/backups/panicblaster',
  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
};

// Create backup directory if it doesn't exist
fs.ensureDirSync(config.backupDir);

try {
  console.log('Starting deployment process...');
  
  // Check if deployment directory exists
  if (fs.existsSync(config.deploymentDir)) {
    // Create a backup of the current deployment
    const backupPath = path.join(config.backupDir, `backup-${config.timestamp}`);
    console.log(`Creating backup at: ${backupPath}`);
    fs.copySync(config.deploymentDir, backupPath);
  } else {
    console.log(`Creating deployment directory: ${config.deploymentDir}`);
    fs.ensureDirSync(config.deploymentDir);
  }
  
  // Clear the deployment directory
  console.log(`Clearing deployment directory: ${config.deploymentDir}`);
  fs.emptyDirSync(config.deploymentDir);
  
  // Copy the built files to the deployment directory
  console.log(`Copying build from ${config.sourceDir} to ${config.deploymentDir}`);
  fs.copySync(config.sourceDir, config.deploymentDir);
  
  console.log('Deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
