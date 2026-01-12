const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Controllo utente michelangelo@neunoi.it...');

db.get("SELECT id, email, full_name, role, password_hash FROM Users WHERE LOWER(email) = 'michelangelo@neunoi.it'", (err, row) => {
    if (err) {
        console.error('Errore query:', err.message);
    } else if (row) {
        console.log('UTENTE TROVATO:');
        console.log('ID:', row.id);
        console.log('Nome:', row.full_name);
        console.log('Ruolo:', row.role);
        console.log('Hash Password:', row.password_hash);
        console.log('-----------------------------------');
        if (!row.password_hash) {
            console.log('ATTENZIONE: L\'utente non ha una password impostata (hash vuoto).');
        }
    } else {
        console.log('UTENTE NON TROVATO nel database locale.');
        // Mostra i primi 5 utenti per capire chi c'è
        db.all("SELECT email FROM Users LIMIT 5", (err, rows) => {
            if (rows) {
                console.log('Email presenti nel DB (primi 5):', rows.map(r => r.email).join(', '));
            }
        });
    }
    db.close();
});
