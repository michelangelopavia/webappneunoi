const { User, TurnoHost, DichiarazioneVolontariato, TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

const getAssociativeYearRange = (refDate = new Date()) => {
    const date = new Date(refDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    let startYear = (month >= 9) ? year : year - 1;
    const startDate = new Date(startYear, 9, 1, 0, 0, 0);
    const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59);
    return { startYear, startDate, endDate };
};

async function explain() {
    try {
        const userId = 11;
        const hosts = await TurnoHost.findAll({ where: { utente_id: userId } });
        const vols = await DichiarazioneVolontariato.findAll({ where: { user_id: userId, confermato: true } });
        const transEarns = await TransazioneNEU.findAll({ where: { a_utente_id: userId, tipo: { [Op.notIn]: ['turno_host', 'volontariato'] } } });
        const transSpends = await TransazioneNEU.findAll({ where: { da_utente_id: userId } });

        const buckets = {};
        const add = (amount, date) => {
            if (!amount) return;
            const assoc = getAssociativeYearRange(date);
            const expiryDate = new Date(assoc.startYear + 1, 11, 31, 23, 59, 59);
            const key = expiryDate.toISOString().split('T')[0];
            buckets[key] = (buckets[key] || 0) + amount;
            console.log(`GUADAGNO: ${amount} del ${new Date(date).toISOString().split('T')[0]} -> Scade il ${key}`);
        };

        hosts.forEach(h => add(h.neu_guadagnati, h.data_inizio));
        vols.forEach(v => add(v.neu_guadagnati, v.data_dichiarazione));
        transEarns.forEach(t => add(t.importo, t.data_transazione));

        console.log('\nBuckets iniziali:', buckets);

        const sortedSpends = transSpends.sort((a, b) => new Date(a.data_transazione) - new Date(b.data_transazione));
        const sortedKeys = Object.keys(buckets).sort();

        for (const spend of sortedSpends) {
            let val = spend.importo;
            const spendDate = new Date(spend.data_transazione);
            console.log(`SPESA: ${val} del ${spendDate.toISOString().split('T')[0]}`);
            for (const key of sortedKeys) {
                if (val <= 0) break;
                if (spendDate <= new Date(key)) {
                    const take = Math.min(val, buckets[key]);
                    buckets[key] -= take;
                    val -= take;
                    console.log(`  Presi ${take} dal bucket ${key}. Rimasti nel bucket: ${buckets[key]}`);
                }
            }
        }

        console.log('\nBuckets finali:', buckets);

        const now = new Date('2026-01-12');
        let total = 0;
        for (const key in buckets) {
            if (new Date(key) >= now) {
                total += buckets[key];
            } else {
                console.log(`Bucket ${key} SCADUTO e rimosso.`);
            }
        }

        console.log(`\nSALDO FINALE CALCOLATO: ${total}`);

    } catch (e) { console.error(e); }
    process.exit(0);
}
explain();
