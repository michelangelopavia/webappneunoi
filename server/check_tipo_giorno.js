const { TurnoHost } = require('./models');

async function checkTipoGiorno() {
    try {
        const turni = await TurnoHost.findAll({ limit: 20 });
        console.log('--- Sample tipo_giorno ---');
        turni.forEach(t => console.log(`Tipo: ${t.tipo_giorno}, NEU: ${t.neu_guadagnati}, Hours: ${t.ore_lavorate}`));

        const counts = {};
        const all = await TurnoHost.findAll();
        all.forEach(t => counts[t.tipo_giorno] = (counts[t.tipo_giorno] || 0) + 1);
        console.log('\n--- Counts by tipo_giorno ---');
        console.log(counts);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkTipoGiorno();
