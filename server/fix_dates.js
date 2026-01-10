const { TransazioneNEU, DichiarazioneVolontariato } = require('./models');
const { Op } = require('sequelize');

async function fixDates() {
    console.log('Fixing dates for transactions and declarations...');

    const transactions = await TransazioneNEU.findAll();
    for (const t of transactions) {
        const d = new Date(t.data_transazione);
        if (!isNaN(d.getTime())) {
            const iso = d.toISOString();
            if (t.data_transazione !== iso) {
                console.log(`Updating Transazione #${t.id}: ${t.data_transazione} -> ${iso}`);
                await t.update({ data_transazione: iso });
            }
        }
    }

    const declarations = await DichiarazioneVolontariato.findAll();
    for (const d of declarations) {
        if (d.data_dichiarazione) {
            const dateObj = new Date(d.data_dichiarazione);
            if (!isNaN(dateObj.getTime())) {
                const iso = dateObj.toISOString();
                if (d.data_dichiarazione !== iso) {
                    console.log(`Updating Dichiarazione #${d.id}: ${d.data_dichiarazione} -> ${iso}`);
                    await d.update({ data_dichiarazione: iso });
                }
            } else {
                // If it's something like "2024/25", use createdAt
                console.log(`Fixing invalid date for Dichiarazione #${d.id}: ${d.data_dichiarazione} -> ${d.createdAt.toISOString()}`);
                await d.update({ data_dichiarazione: d.createdAt.toISOString() });
            }
        } else {
            await d.update({ data_dichiarazione: d.createdAt.toISOString() });
        }
    }

    console.log('Finished fixing dates.');
    process.exit(0);
}

fixDates();
