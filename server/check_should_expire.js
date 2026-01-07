const { User, TransazioneNEU, TurnoHost } = require('./models');

async function checkExpirationsByData() {
    try {
        const users = await User.findAll();
        console.log(`Checking ${users.length} users...`);

        let totalShouldBeExpired = 0;
        const oggi = new Date(); // Jan 2 2026

        for (const user of users) {
            // Logic from MieiNEU.jsx
            const turniUtente = await TurnoHost.findAll({ where: { utente_id: user.id } });
            const transazioniUtente = await TransazioneNEU.findAll({ where: { [require('sequelize').Op.or]: [{ a_utente_id: user.id }, { da_utente_id: user.id }] } });

            const earnings = [];
            turniUtente.forEach(t => {
                const d = new Date(t.data_inizio);
                const annoScadenza = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
                earnings.push({ amount: t.neu_guadagnati || 0, expiration: new Date(annoScadenza, 11, 31, 23, 59, 59) });
            });
            transazioniUtente.filter(t => t.a_utente_id === user.id && t.tipo !== 'turno_host').forEach(t => {
                const d = new Date(t.data_transazione);
                const annoScadenza = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
                earnings.push({ amount: t.importo || 0, expiration: new Date(annoScadenza, 11, 31, 23, 59, 59) });
            });

            const totalSpese = transazioniUtente.filter(t => t.da_utente_id === user.id).reduce((sum, t) => sum + (t.importo || 0), 0);

            earnings.sort((a, b) => a.expiration - b.expiration);
            let remainingExpenses = totalSpese;
            let expiredUnspent = 0;
            earnings.forEach(e => {
                const consumed = Math.min(e.amount, remainingExpenses);
                const unspent = e.amount - consumed;
                remainingExpenses -= consumed;
                if (e.expiration < oggi) {
                    expiredUnspent += unspent;
                }
            });
            if (expiredUnspent > 0) {
                console.log(`User ${user.full_name} (${user.id}): Should have expired ${expiredUnspent} NEU. Current saldo: ${user.saldo_neu}`);
                totalShouldBeExpired += expiredUnspent;
            }
        }
        console.log(`Total NEU that should be expired but might still be in balances: ${totalShouldBeExpired}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkExpirationsByData();
