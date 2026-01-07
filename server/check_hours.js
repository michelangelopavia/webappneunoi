const { TurnoHost } = require('./models');

async function checkHours() {
    try {
        const all = await TurnoHost.findAll();
        let h2025 = 0;
        all.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2025) h2025 += (t.ore_lavorate || 0);
        });
        console.log(`Total hours in 2025: ${h2025}`);

        const countByYear = {};
        all.forEach(t => {
            const y = new Date(t.data_inizio).getFullYear();
            countByYear[y] = (countByYear[y] || 0) + (t.ore_lavorate || 0);
        });
        console.log('Hours by year:', countByYear);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkHours();
