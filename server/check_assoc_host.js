const { TurnoHost } = require('./models');

async function checkAssocHost() {
    try {
        const turni = await TurnoHost.findAll();
        let assoc2425 = 0;
        const start = new Date(2024, 9, 1); // Oct 1 2024
        const end = new Date(2025, 8, 30, 23, 59, 59); // Sep 30 2025

        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d >= start && d <= end) assoc2425 += (t.neu_guadagnati || 0);
        });
        console.log(`Host NEU in Associative Year 2024/25: ${assoc2425}`);

        let assoc2526 = 0;
        const start2 = new Date(2025, 9, 1);
        const end2 = new Date(2026, 8, 30, 23, 59, 59);
        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d >= start2 && d <= end2) assoc2526 += (t.neu_guadagnati || 0);
        });
        console.log(`Host NEU in Associative Year 2025/26: ${assoc2526}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAssocHost();
