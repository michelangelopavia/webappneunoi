const { TurnoHost, TransazioneNEU, DichiarazioneVolontariato } = require('./models');
const { Op } = require('sequelize');

async function checkHostTransactions() {
    try {
        console.log('--- SEARCHING FOR HOST TRANSACTIONS IN 2025 ---');
        const transHost = await TransazioneNEU.findAll({
            where: {
                [Op.and]: [
                    { data_transazione: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] } },
                    {
                        [Op.or]: [
                            { tipo: { [Op.like]: '%host%' } },
                            { causale: { [Op.like]: '%host%' } }
                        ]
                    }
                ]
            }
        });
        console.log(`Found ${transHost.length} transactions related to 'host' in 2025.`);
        transHost.forEach(t => console.log(`Type: ${t.tipo}, Amount: ${t.importo}, Causale: ${t.causale}`));

        console.log('\n--- CHECKING ALL 2025 TRANSACTION TYPES (UNIQUE) ---');
        const types = await TransazioneNEU.findAll({
            attributes: [[require('./database').fn('DISTINCT', require('./database').col('tipo')), 'tipo']],
            where: {
                data_transazione: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] }
            }
        });
        types.forEach(t => console.log(t.tipo));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkHostTransactions();
