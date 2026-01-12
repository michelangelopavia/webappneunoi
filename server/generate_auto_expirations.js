const { User, TransazioneNEU, TurnoHost, DichiarazioneVolontariato } = require('./models');
const { Op } = require('sequelize');
const { safeRecalcUser } = require('./utils/safe_recalc');

const EXPIRE_DATE_STR = '2025-12-31';
// Usiamo una data specifica per le transazioni di scadenza
const EXPIRE_TIMESTAMP = new Date('2025-12-31T23:59:59');

async function generateExpirations() {
    try {
        const users = await User.findAll();
        console.log(`--- ANALISI SCADENZE PER ${users.length} UTENTI ---`);

        // Helper per capire l'anno associativo e la scadenza
        const getExpiryKey = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = d.getMonth();
            let startYear = (month >= 9) ? year : year - 1;
            return `${startYear + 1}-12-31`;
        };

        for (const user of users) {
            // 1. Pulizia: Rimuoviamo eventuali transazioni di scadenza precedenti per questo utente e questa data
            // per evitare doppioni se lo script viene rilanciato
            await TransazioneNEU.destroy({
                where: {
                    da_utente_id: user.id,
                    tipo: 'scadenza',
                    data_transazione: {
                        [Op.between]: [new Date('2025-12-31T00:00:00'), new Date('2025-12-31T23:59:59')]
                    }
                }
            });

            // 2. Raccogliamo guadagni e spese (escludendo scadenze appena rimosse)
            const hosts = await TurnoHost.findAll({ where: { utente_id: user.id } });
            const vols = await DichiarazioneVolontariato.findAll({ where: { user_id: user.id, confermato: true } });
            const transEarns = await TransazioneNEU.findAll({
                where: { a_utente_id: user.id, tipo: { [Op.notIn]: ['turno_host', 'volontariato'] } }
            });
            const transSpends = await TransazioneNEU.findAll({
                where: { da_utente_id: user.id, tipo: { [Op.ne]: 'scadenza' } }
            });

            // 3. Calcolo Buckets
            const buckets = {};
            const add = (amount, date) => {
                if (!amount || amount <= 0) return;
                const key = getExpiryKey(date);
                buckets[key] = (buckets[key] || 0) + amount;
            };

            hosts.forEach(h => add(h.neu_guadagnati, h.data_inizio));
            vols.forEach(e => add(e.neu_guadagnati, e.data_dichiarazione));
            transEarns.forEach(e => add(e.importo, e.data_transazione));

            // 4. Simulazione Spese (FIFO)
            const sortedSpends = transSpends.sort((a, b) => new Date(a.data_transazione) - new Date(b.data_transazione));
            const sortedKeys = Object.keys(buckets).sort();

            for (const spend of sortedSpends) {
                let toSpend = spend.importo || 0;
                const spendDate = new Date(spend.data_transazione);

                for (const key of sortedKeys) {
                    if (toSpend <= 0) break;
                    if (spendDate <= new Date(key)) {
                        const available = buckets[key];
                        const take = Math.min(toSpend, available);
                        buckets[key] -= take;
                        toSpend -= take;
                    }
                }
            }

            // 5. Verifichiamo il residuo nel bucket 2025-12-31
            const expiredAmount = buckets['2025-12-31'] || 0;

            if (expiredAmount > 0) {
                const roundedAmount = Math.round(expiredAmount * 100) / 100;
                await TransazioneNEU.create({
                    da_utente_id: user.id,
                    a_utente_id: null,
                    importo: roundedAmount,
                    tipo: 'scadenza',
                    causale: `Scadenza NEU non utilizzati (Anno Associativo precedente)`,
                    data_transazione: EXPIRE_TIMESTAMP
                });
                console.log(`[SCADENZA] ${user.full_name}: -${roundedAmount} NEU`);
            }

            // 6. Ricalcolo finale per allineare il campo saldo_neu dell'utente
            await safeRecalcUser(user.id);
        }

        console.log('--- OPERAZIONE COMPLETATA ---');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

generateExpirations();
