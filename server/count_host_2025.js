const { TurnoHost } = require('./models');
const { Op } = require('sequelize');

async function countHost() {
    try {
        const turni = await TurnoHost.findAll();
        let total2025 = 0;
        let morning = 0;
        let evening = 0;
        let weekend = 0;

        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2025) {
                total2025 += (t.neu_guadagnati || 0);
                if (t.tipo_giorno === 'settimanale_mattina') morning += t.ore_lavorate;
                else if (t.tipo_giorno === 'settimanale_sera') evening += t.ore_lavorate;
                else if (t.tipo_giorno === 'weekend') weekend += t.ore_lavorate;
            }
        });

        console.log('--- TURNO HOST 2025 STATS ---');
        console.log(`Total NEU: ${total2025}`);
        console.log(`Morning Hours: ${morning}`);
        console.log(`Evening Hours: ${evening}`);
        console.log(`Weekend Hours: ${weekend}`);

        // Try summing by different year
        let totalAll = 0;
        turni.forEach(t => totalAll += (t.neu_guadagnati || 0));
        console.log(`\nTotal NEU All Time Host: ${totalAll}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

countHost();
