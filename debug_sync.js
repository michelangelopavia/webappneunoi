
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const email = 'michelangelo@neunoi.it';

db.serialize(() => {
    console.log(`Checking data for email: ${email}`);

    // Get User
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            return;
        }
        console.log('User found:', user);

        if (!user) {
            console.log('User not found in users table');
            return;
        }

        // Get ProfiloCoworker
        db.all('SELECT * FROM ProfiloCoworker WHERE email = ?', [email], (err, profili) => {
            if (err) {
                console.error('Error fetching profili:', err);
            }
            console.log('ProfiliCoworker found:', profili);

            // Get Abbonamenti linked to this email or user_id
            db.all('SELECT * FROM AbbonamentoCoworker WHERE profilo_id IN (SELECT id FROM ProfiloCoworker WHERE email = ?) OR user_id = ?', [email, user.id], (err, abbonamenti) => {
                if (err) {
                    console.error('Error fetching abbonamenti:', err);
                }
                console.log('Abbonamenti found:', abbonamenti);
                db.close();
            });
        });
    });
});
