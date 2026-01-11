const models = require('./models');
const { Op } = require('sequelize');

async function debugInflatedStats() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const trans = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            tipo: 'pagamento_associazione'
        },
        include: [
            { model: models.User, as: 'DaUtente', attributes: ['email', 'full_name'] }
        ]
    });

    console.log(`--- ANALYSIS OF 2025 PAYMENTS (Total: ${trans.length}) ---`);

    // 1. Group by User to see who "paid" the most
    const userTotals = {};
    trans.forEach(t => {
        const name = t.DaUtente ? t.DaUtente.full_name : 'Sconosciuto';
        if (!userTotals[name]) userTotals[name] = { total: 0, count: 0 };
        userTotals[name].total += (t.importo || 0);
        userTotals[name].count += 1;
    });

    const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1].total - a[1].total);
    console.log("\nTop 10 Users by Payment:");
    sortedUsers.slice(0, 10).forEach(([name, data]) => {
        console.log(`${name}: ${data.total} NEU (${data.count} transazioni)`);
    });

    // 2. Fuzzy Duplicate Check (Same Day, Same Amount, Same User)
    console.log("\n--- Probabili Duplicati (Stesso Giorno, Stesso Importo, Stesso Socio) ---");
    const fuzzySeen = new Set();
    const potentialDupes = [];

    trans.sort((a, b) => new Date(a.data_transazione) - new Date(b.data_transazione)).forEach(t => {
        const dateDay = new Date(t.data_transazione).toISOString().split('T')[0];
        const key = `${t.da_utente_id}-${t.importo}-${dateDay}`;

        if (fuzzySeen.has(key)) {
            potentialDupes.push(t);
        } else {
            fuzzySeen.add(key);
        }
    });

    console.log(`Trovati ${potentialDupes.length} sospetti duplicati.`);
    potentialDupes.slice(0, 10).forEach(d => {
        console.log(`SocioID: ${d.da_utente_id}, Importo: ${d.importo}, Giorno: ${new Date(d.data_transazione).toISOString().split('T')[0]}, Causale: ${d.causale}`);
    });

    // 3. Impact of coworking@neunoi.it on Host Stats
    const hostUser = await models.User.findOne({ where: { email: 'coworking@neunoi.it' } });
    if (hostUser) {
        const turniHostUser = await models.TurnoHost.findAll({
            where: {
                utente_id: hostUser.id,
                data_inizio: { [Op.between]: [start, end] }
            }
        });
        console.log(`\nTurni effettuati da coworking@neunoi.it: ${turniHostUser.length}`);
    }
}

debugInflatedStats().catch(console.error);
