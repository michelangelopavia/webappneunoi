const { ProfiloCoworker, IngressoCoworking, AbbonamentoUtente } = require('./models');
const { Op } = require('sequelize');

async function checkData2025() {
    try {
        const pCount = await ProfiloCoworker.count({
            where: {
                data_compilazione: { [Op.between]: ['2025-01-01', '2025-12-31'] }
            }
        });
        const pCountAlt = await ProfiloCoworker.count({
            where: {
                [Op.or]: [
                    { created_date: { [Op.between]: ['2025-01-01', '2025-12-31'] } } // if it exists
                ]
            }
        }).catch(() => 'no created_date field');

        const iCount = await IngressoCoworking.count({
            where: {
                data_ingresso: { [Op.between]: ['2025-01-01', '2025-12-31'] }
            }
        });

        const aCount = await AbbonamentoUtente.count({
            where: {
                data_inizio: { [Op.between]: ['2025-01-01', '2025-12-31'] }
            }
        });

        // Check if there are profiles with data_compilazione in 2024
        const p2024 = await ProfiloCoworker.count({
            where: {
                data_compilazione: { [Op.between]: ['2024-01-01', '2024-12-31'] }
            }
        });

        console.log({
            profiles2025_by_compilazione: pCount,
            profiles2025_by_created: pCountAlt,
            ingressi2025: iCount,
            abbonamenti2025: aCount,
            profiles2024_by_compilazione: p2024
        });

        const sampleP = await ProfiloCoworker.findOne();
        if (sampleP) {
            console.log('Sample profile fields:', Object.keys(sampleP.dataValues));
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkData2025();
