const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function checkScadenza() {
    try {
        const expirations = await TransazioneNEU.findAll({
            where: {
                causale: { [Op.like]: '%cadenz%' }
            }
        });
        console.log('--- Transactions with "cadenz" in causale ---');
        expirations.forEach(e => console.log(`${e.tipo}: ${e.causale} (${e.importo}) - Date: ${e.data_transazione}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkScadenza();
