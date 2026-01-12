const { User, TransazioneNEU } = require('./models');
const { safeRecalcUser } = require('./utils/safe_recalc');

async function check() {
    try {
        const user = await User.findOne({
            where: { email: 'thalassamu@gmail.com' }
        });

        if (!user) {
            console.log('Utente thalassamu@gmail.com non trovato.');
            return;
        }

        console.log(`UTENTE: ${user.full_name} (ID: ${user.id})`);
        console.log(`Saldo attuale nel DB: ${user.saldo_neu} NEU`);

        const trans = await TransazioneNEU.findAll({
            where: {
                [require('sequelize').Op.or]: [
                    { da_utente_id: user.id },
                    { a_utente_id: user.id }
                ]
            },
            order: [['data_transazione', 'DESC']]
        });

        console.log(`\nTRANSAZIONI TROVATE (${trans.length}):`);
        trans.forEach(t => {
            let segno = '';
            if (t.a_utente_id === user.id) segno = '+';
            if (t.da_utente_id === user.id) segno = '-';
            const dateStr = t.data_transazione instanceof Date ? t.data_transazione.toISOString() : t.data_transazione;
            console.log(` - ${dateStr}: ${segno}${t.importo} (${t.descrizione || 'no desc'}) | ID: ${t.id}`);
        });

        console.log('\n--- ESEGUO RICALCOLO SALDO ---');
        const result = await safeRecalcUser(user.id);
        console.log('Risultato ricalcolo:', result);

        const userAggiornato = await User.findByPk(user.id);
        console.log(`\nSALDO DOPO RICALCOLO: ${userAggiornato.saldo_neu} NEU`);

    } catch (e) {
        console.error('Errore:', e.message);
    }
    process.exit(0);
}

check();
