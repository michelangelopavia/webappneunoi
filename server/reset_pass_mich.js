const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function reset() {
    try {
        const user = await User.findOne({
            where: { email: 'michelangelo@neunoi.it' }
        });

        if (user) {
            const newPass = 'neu2026!'; // Impostiamo una password forte ma nota
            const hashed = await bcrypt.hash(newPass, 10);
            await user.update({ password_hash: hashed });
            console.log('PASSWORD RESETTATA CON SUCCESSO per michelangelo@neunoi.it');
            console.log('Nuova password impostata:', newPass);
        } else {
            console.log('Utente non trovato, impossibile resettare.');
        }
    } catch (e) {
        console.error('Errore durante il reset:', e.message);
    }
    process.exit(0);
}

reset();
