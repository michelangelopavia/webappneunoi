const { TurnoHost } = require('./models');

async function checkHostBreakdown() {
    try {
        const turni = await TurnoHost.findAll();
        const breakdown = {};
        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2025) {
                const key = t.tipo_giorno || 'null';
                if (!breakdown[key]) breakdown[key] = { hours: 0, neu: 0 };
                breakdown[key].hours += (t.ore_lavorate || 0);
                breakdown[key].neu += (t.neu_guadagnati || 0);
            }
        });
        console.log('Breakdown 2025:');
        console.log(JSON.stringify(breakdown, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkHostBreakdown();
