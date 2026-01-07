const { TurnoHost } = require('./models');
const { Op } = require('sequelize');

async function checkLate2024() {
    try {
        const turni = await TurnoHost.findAll({
            where: {
                data_inizio: { [Op.between]: ['2024-10-01', '2024-12-31 23:59:59'] }
            }
        });
        const h = turni.reduce((sum, t) => sum + (t.ore_lavorate || 0), 0);
        console.log(`Hours in Oct-Dec 2024: ${h}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLate2024();
