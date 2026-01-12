const { User } = require('./models');

async function check() {
    try {
        const user = await User.findOne({
            where: { email: 'michelangelo@neunoi.it' }
        });

        if (user) {
            console.log('UTENTE TROVATO:');
            console.log('Email:', user.email);
            console.log('Nome:', user.full_name);
            console.log('Ruolo:', user.role);
            // Non stampiamo l'hash in chiaro per sicurezza estrema, ma confermiamo se c'è
            console.log('Password impostata:', !!user.password_hash);
        } else {
            console.log('Utente non trovato.');
            const users = await User.findAll({ limit: 5 });
            console.log('Email presenti (primi 5):', users.map(u => u.email).join(', '));
        }
    } catch (e) {
        console.error('Errore:', e.message);
    }
    process.exit(0);
}

check();
