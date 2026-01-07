const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function checkAnyExpiration() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: {
                [Op.or]: [
                    { tipo: { [Op.like]: '%scad%' } },
                    { causale: { [Op.like]: '%scad%' } }
                ]
            }
        });
        console.log(`Found ${trans.length} potential expiration transactions.`);
        trans.forEach(t => console.log(`${t.data_transazione}: Type=${t.tipo}, Amount=${t.importo}, Causale=${t.causale}`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAnyExpiration();
