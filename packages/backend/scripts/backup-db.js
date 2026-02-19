const fs = require('fs');
const path = require('path');

const { databasePath } = require('../src/app');

if (!fs.existsSync(databasePath)) {
  console.error(`Database file does not exist: ${databasePath}`);
  process.exit(1);
}

const backupsDir = path.join(__dirname, '..', 'data', 'backups');
fs.mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilePath = path.join(backupsDir, `todos-${timestamp}.sqlite`);

fs.copyFileSync(databasePath, backupFilePath);

console.log(`Backup created: ${backupFilePath}`);
