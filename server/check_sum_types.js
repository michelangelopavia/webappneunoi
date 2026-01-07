const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function checkSumTypes() {
    try {
        const trans2025 = await TransazioneNEU.findAll({
            where: {
                data_transazione: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] }
            }
        });
        const byType = {};
        trans2025.forEach(t => {
            const key = t.tipo || 'null';
            byType[key] = (byType[key] || 0) + (t.importo || 0);
        });
        console.log(JSON.stringify(byType, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSumTypes();
