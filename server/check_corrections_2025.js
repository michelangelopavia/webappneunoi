const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function checkAdminCorrections() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: {
                data_transazione: { [Op.between]: ['2025-01-01', '2026-01-05'] },
                tipo: 'correzione_admin'
            }
        });
        console.log(`Found ${trans.length} admin corrections.`);
        trans.forEach(t => console.log(`${t.data_transazione}: Amt=${t.importo}, Causale=${t.causale}`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAdminCorrections();
