const { User, TransazioneNEU, TurnoHost, DichiarazioneVolontariato } = require('./models');
const { Op } = require('sequelize');

async function applyExpiration() {
    try {
        const users = await User.findAll();
        const cutoffDate = new Date('2026-01-01T00:00:00');
        const referenceYear = 2025;

        console.log(`--- RETROACTIVE EXPIRATION PROCESS (FOR DEC 31, 2025) ---`);

        for (const user of users) {
            // Check if already applied for this year to avoid double subtraction
            const existing = await TransazioneNEU.findOne({
                where: {
                    da_utente_id: user.id,
                    a_utente_id: null,
                    tipo: { [Op.in]: ['scadenza', 'scadenza_neu'] },
                    causale: { [Op.like]: '%Scadenza 2025%' }
                }
            });

            if (existing) {
                console.log(`[SKIP] User ${user.full_name} already has an expiration transaction for 2025.`);
                continue;
            }

            // Calculation Logic (FIFO)
            const turniUtente = await TurnoHost.findAll({ where: { utente_id: user.id } });
            const transazioniUtente = await TransazioneNEU.findAll({
                where: {
                    [Op.and]: [
                        { [Op.or]: [{ a_utente_id: user.id }, { da_utente_id: user.id }] },
                        { data_transazione: { [Op.lt]: cutoffDate } } // Only consider stuff before 2026
                    ]
                }
            });
            const dichiarazioniUtente = await DichiarazioneVolontariato.findAll({ where: { user_id: user.id } });

            const earnings = [];

            // 1. From Host Shifts
            turniUtente.forEach(t => {
                const d = new Date(t.data_inizio);
                if (d >= cutoffDate) return;
                const annoScadenza = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
                earnings.push({
                    amount: t.neu_guadagnati || 0,
                    expiration: new Date(annoScadenza, 11, 31, 23, 59, 59),
                    source: `Shift ${t.id}`
                });
            });

            // 2. From Volunteering
            dichiarazioniUtente.forEach(d => {
                const date = new Date(d.data_dichiarazione);
                if (date >= cutoffDate) return;
                const annoScadenza = date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
                earnings.push({
                    amount: d.neu_guadagnati || 0,
                    expiration: new Date(annoScadenza, 11, 31, 23, 59, 59),
                    source: `Dichiarazione ${d.id}`
                });
            });

            // 3. From Transactions
            transazioniUtente.filter(t => t.a_utente_id === user.id && t.tipo !== 'turno_host' && t.tipo !== 'volontariato').forEach(t => {
                const d = new Date(t.data_transazione);
                const annoScadenza = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
                earnings.push({
                    amount: t.importo || 0,
                    expiration: new Date(annoScadenza, 11, 31, 23, 59, 59),
                    source: `Trans ${t.id}`
                });
            });

            // 4. Calculate Expenses (before Jan 1st 2026)
            const totalSpese = transazioniUtente.filter(t => t.da_utente_id === user.id).reduce((sum, t) => sum + (t.importo || 0), 0);

            earnings.sort((a, b) => a.expiration - b.expiration);

            let remainingExpenses = totalSpese;
            let expiredAmount = 0;

            earnings.forEach(e => {
                const consumed = Math.min(e.amount, remainingExpenses);
                const unspent = e.amount - consumed;
                remainingExpenses -= consumed;

                // If expiration was Dec 31, 2025 or earlier
                if (e.expiration.getFullYear() <= referenceYear) {
                    expiredAmount += unspent;
                }
            });

            if (expiredAmount > 0) {
                console.log(`[EXPIRING] User ${user.full_name} (${user.id}): ${expiredAmount} NEU expired.`);

                // Perform the subtraction
                const oldBalance = user.saldo_neu || 0;
                const newBalance = Math.max(0, oldBalance - expiredAmount);

                await user.update({ saldo_neu: newBalance });

                await TransazioneNEU.create({
                    da_utente_id: user.id,
                    a_utente_id: null, // To Association/System
                    importo: expiredAmount,
                    tipo: 'scadenza',
                    causale: `Sottrazione NEU scaduti il 31/12/2025 (Scadenza 2025)`,
                    data_transazione: new Date('2025-12-31T23:59:59')
                });

                console.log(`   Result: Balance ${oldBalance} -> ${newBalance}`);
            }
        }

        console.log('--- PROCESS COMPLETED ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

applyExpiration();
