
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const target = 'michelangelopavia@gmail.com';

db.serialize(() => {
    db.all(`SELECT * FROM OrdineCoworkings`, (err, rows) => {
        let found = false;
        rows.forEach(r => {
            if (r.profilo_email === target) {
                console.log('EXACT MATCH in OrdineCoworkings:', r);
                found = true;
            } else if (r.profilo_email && r.profilo_email.toLowerCase().includes('michelangelopavia')) {
                console.log('PARTIAL MATCH in OrdineCoworkings:', r);
                found = true;
            }
        });
        if (!found) console.log('No matches in OrdineCoworkings.');
        db.close();
    });
});
