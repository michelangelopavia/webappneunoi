const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function check() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: {
                importo: 100,
                data_transazione: {
                    [Op.gte]: new Date('2025-12-01')
                }
            }
        });
        console.log(`Trovate ${trans.length} transazioni da 100 NEU a Dicembre 2025`);
        trans.forEach(t => {
            console.log(`ID: ${t.id}, Data: ${t.data_transazione}, Da: ${t.da_utente_id}, A: ${t.a_utente_id}, Desc: ${t.descrizione}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
