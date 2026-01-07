const { TurnoHost, TransazioneNEU, DichiarazioneVolontariato } = require('./models');
const { Op } = require('sequelize');

async function debugMetrics() {
    try {
        console.log('--- TURNO HOST 2025 ---');
        const turni2025 = await TurnoHost.findAll({
            where: {
                data_inizio: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] }
            }
        });
        const totalNeuHost = turni2025.reduce((sum, t) => sum + (t.neu_guadagnati || 0), 0);
        console.log(`Count: ${turni2025.length}`);
        console.log(`Total NEU from TurnoHost.neu_guadagnati: ${totalNeuHost}`);

        console.log('\n--- TRANSAZIONI NEU 2025 ---');
        const trans2025 = await TransazioneNEU.findAll({
            where: {
                data_transazione: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] }
            }
        });
        console.log(`Total transactions in 2025: ${trans2025.length}`);

        const byType = {};
        trans2025.forEach(t => {
            byType[t.tipo] = (byType[t.tipo] || 0) + (t.importo || 0);
        });
        console.log('Sum by Type:', byType);

        console.log('\n--- SAMPLES OF TRANSACTIONS (First 10) ---');
        trans2025.slice(0, 10).forEach(t => console.log(`Type: ${t.tipo}, Amount: ${t.importo}, Causale: ${t.causale}`));

        console.log('\n--- DICHIARAZIONI VOLONTARIATO 2025 ---');
        const dich2025 = await DichiarazioneVolontariato.findAll({
            where: {
                data_dichiarazione: { [Op.between]: ['2025-01-01', '2025-12-31 23:59:59'] }
            }
        });
        const totalNeuDich = dich2025.reduce((sum, d) => sum + (d.neu_guadagnati || 0), 0);
        console.log(`Count: ${dich2025.length}`);
        console.log(`Total NEU from DichiarazioneVolontariato: ${totalNeuDich}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugMetrics();
