const { safeRecalcUser } = require('./utils/safe_recalc');
const models = require('./models');

async function debugRosa() {
    const result = await safeRecalcUser(5);
    console.log(JSON.stringify(result, null, 2));

    const trans = await models.TransazioneNEU.findAll({
        where: {
            [require('sequelize').Op.or]: [
                { a_utente_id: 5 },
                { da_utente_id: 5 }
            ]
        },
        order: [['data_transazione', 'ASC']]
    });

    console.log('\nTRANSACTIONS FOR ROSA:');
    trans.forEach(t => {
        console.log(`${t.data_transazione} | ${t.tipo} | ${t.importo} | ${t.da_utente_id ? 'OUT' : 'IN'} | ${t.causale}`);
    });

    process.exit(0);
}

debugRosa();
