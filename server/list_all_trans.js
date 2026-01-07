const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function listAllTrans() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: {
                data_transazione: { [Op.gte]: '2025-01-01' }
            },
            order: [['data_transazione', 'ASC']]
        });
        console.log(`Transactions from 2025-01-01 (${trans.length}):`);
        trans.forEach(t => console.log(`${t.data_transazione}: Tipo=${t.tipo}, Amt=${t.importo}, Causale=${t.causale}`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

listAllTrans();
