const { TurnoHost } = require('./models');

async function checkMissingNEU() {
    try {
        const turni = await TurnoHost.findAll();
        let missingCount = 0;
        let missingHours = 0;
        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2025) {
                if ((t.neu_guadagnati || 0) === 0 && (t.ore_lavorate || 0) > 0) {
                    missingCount++;
                    missingHours += t.ore_lavorate;
                    console.log(`ID: ${t.id}, Hours: ${t.ore_lavorate}, User: ${t.utente_nome}`);
                }
            }
        });
        console.log(`Found ${missingCount} shifts with missing NEU (${missingHours} hours).`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkMissingNEU();
