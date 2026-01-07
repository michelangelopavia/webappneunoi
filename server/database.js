const { Sequelize } = require('sequelize');
const path = require('path');

const fs = require('fs');

const storagePath = process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite');
const storageDir = path.dirname(storagePath);

// Ensure the directory for the database exists (important for mounted volumes)
if (!fs.existsSync(storageDir)) {
    console.log(`Creating database directory: ${storageDir}`);
    fs.mkdirSync(storageDir, { recursive: true });
}

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false
});

module.exports = sequelize;
