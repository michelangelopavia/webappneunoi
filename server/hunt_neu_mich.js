
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM TransazioneNEUs", (err, rows) => {
    rows.forEach(r => {
        if (JSON.stringify(r).toLowerCase().includes('michelangelo') || JSON.stringify(r).toLowerCase().includes('pavia')) {
            console.log(r);
        }
    });
    db.close();
});
