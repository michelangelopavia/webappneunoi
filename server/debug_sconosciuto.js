const models = require('./models');
const { Op } = require('sequelize');

async function debugSconosciuto() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const trans = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            tipo: 'pagamento_associazione',
            da_utente_id: null
        }
    });

    console.log(`--- SCONOSCIUTO TRANSACTIONS 2025 (${trans.length} total) ---`);
    trans.slice(0, 50).forEach(t => {
        console.log(`ID: ${t.id}, Importo: ${t.importo}, Data: ${t.data_transazione}, Causale: ${t.causale}`);
    });
}

debugSconosciuto().catch(console.error);
