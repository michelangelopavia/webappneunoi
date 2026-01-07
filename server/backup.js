const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_STORAGE || './database.sqlite';
const absoluteDbPath = path.resolve(__dirname, dbPath);

const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `database-backup-${timestamp}.sqlite`);

try {
    if (fs.existsSync(absoluteDbPath)) {
        fs.copyFileSync(absoluteDbPath, backupPath);
        console.log(`✅ Backup created successfully: ${backupPath}`);
    } else {
        console.error(`❌ Database file not found at: ${absoluteDbPath}`);
    }
} catch (error) {
    console.error('❌ Backup failed:', error);
}
