const { TurnoHost } = require('./models');

async function check2026() {
    try {
        const turni = await TurnoHost.findAll();
        let h2026 = 0;
        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2026) h2026 += (t.ore_lavorate || 0);
        });
        console.log(`Hours in 2026: ${h2026}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

check2026();
