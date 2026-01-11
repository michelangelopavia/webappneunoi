const models = require('./models');
const { Op } = require('sequelize');

async function checkDoubleCounting() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const ordini = await models.OrdineCoworking.findAll({
        where: {
            data_ordine: { [Op.between]: [start, end] },
            metodo_pagamento: 'neu',
            stato_pagamento: 'pagato'
        }
    });

    const trans = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            tipo: 'pagamento_associazione'
        }
    });

    console.log(`Ordini pagati in NEU: ${ordini.length}, Totale: ${ordini.reduce((s, o) => s + (o.totale || 0), 0)}`);
    console.log(`Transazioni 'pagamento_associazione': ${trans.length}, Totale: ${trans.reduce((s, t) => s + (t.importo || 0), 0)}`);

    // Check if some orders have a corresponding transaction
    // The current logic creates a transaction with causale: `Pagamento ordine #${item.id}` or similar
}

checkDoubleCounting().catch(console.error);
