const models = require('./models');
const { Op } = require('sequelize');

async function checkHighScambi() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const trans = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            tipo: 'pagamento_associazione'
        },
        order: [['importo', 'DESC']]
    });

    console.log(`Found ${trans.length} payments to association.`);
    console.log('Top payments:');
    trans.slice(0, 20).forEach(t => {
        console.log(`ID: ${t.id}, Importo: ${t.importo}, Date: ${t.data_transazione}, Causale: ${t.causale}`);
    });
}

checkHighScambi().catch(console.error);
