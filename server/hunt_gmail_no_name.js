
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking gmail orders with no name or name "Neu Noi"...');

db.all(`SELECT * FROM OrdineCoworkings WHERE profilo_email LIKE '%gmail.com%'`, (err, rows) => {
    rows.forEach(r => {
        if (!r.profilo_nome_completo || r.profilo_nome_completo === 'Neu Noi' || r.profilo_nome_completo.includes('Michelangelo')) {
            console.log(r);
        }
    });
    db.close();
});
