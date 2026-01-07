const { DichiarazioneVolontariato } = require('./models');

async function checkAssocDich() {
    try {
        const dichs = await DichiarazioneVolontariato.findAll();
        let assoc2425 = 0;
        const start = new Date(2024, 9, 1);
        const end = new Date(2025, 8, 30, 23, 59, 59);
        dichs.forEach(d => {
            const date = new Date(d.data_dichiarazione);
            if (date >= start && date <= end) assoc2425 += (d.neu_guadagnati || 0);
        });
        console.log(`Dich NEU in Associative Year 2024/25: ${assoc2425}`);

        // Sum all
        let all = 0;
        dichs.forEach(d => all += (d.neu_guadagnati || 0));
        console.log(`All time: ${all}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAssocDich();
