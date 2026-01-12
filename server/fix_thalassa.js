const { User, TransazioneNEU, ProfiloCoworker } = require('./models');

async function fixAndCheck() {
    try {
        const email = 'thalassamu@gmail.com';
        const user = await User.findOne({ where: { email } });
        if (!user) return console.log('User not found');

        console.log(`UTENTE: ${user.full_name} (ID: ${user.id})`);

        // Cerca la transazione dangling del 27/12/2025
        const t212 = await TransazioneNEU.findByPk(212);
        const tDate = t212?.data_transazione instanceof Date ? t212.data_transazione.toISOString() : String(t212?.data_transazione);

        if (t212 && tDate.includes('2025-12-27') && t212.a_utente_id === null) {
            console.log('Trovata transazione 212 dangling del 27/12. La associo ad Alexandra (ID 11) come entrata.');
            await t212.update({ a_utente_id: user.id });
        }

        // Ora ricalcoliamo
        const { safeRecalcUser } = require('./utils/safe_recalc');
        await safeRecalcUser(user.id);

        const updatedUser = await User.findByPk(user.id);
        console.log(`SALDO FINALE: ${updatedUser.saldo_neu} NEU`);
        console.log(`SALDO SCADENZA 2025: ${updatedUser.saldo_neu_scadenza} NEU`);

        const trans = await TransazioneNEU.findAll({
            where: {
                [require('sequelize').Op.or]: [
                    { da_utente_id: user.id },
                    { a_utente_id: user.id }
                ]
            },
            order: [['data_transazione', 'ASC']]
        });

        console.log('\n--- STORIA TRANSAZIONI ---');
        trans.forEach(t => {
            const date = t.data_transazione;
            const importo = t.a_utente_id === user.id ? `+${t.importo}` : `-${t.importo}`;
            console.log(`${date} | ${importo} | ${t.descrizione || t.causale || 'no desc'}`);
        });

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

fixAndCheck();
