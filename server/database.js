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

const sequelize = process.env.DB_DIALECT === 'mysql'
    ? new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            freezeTableName: false,
            timestamps: true,
            // Don't enforce foreign key constraints strictly
            underscored: false
        },
        // Make MySQL behave more like SQLite
        dialectOptions: {
            decimalNumbers: true
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false
    });

module.exports = sequelize;
