const { DichiarazioneVolontariato, AzioneVolontariato } = require('./models');

async function checkActions() {
    try {
        const dichs = await DichiarazioneVolontariato.findAll({
            include: [{ model: AzioneVolontariato }]
        });
        const byAction = {};
        dichs.forEach(d => {
            const title = d.AzioneVolontariato?.titolo || 'Sconosciuto';
            byAction[title] = (byAction[title] || 0) + (d.neu_guadagnati || 0);
        });
        console.log('--- NEU BY ACTION (ALL TIME) ---');
        console.log(byAction);

        const byAction2025 = {};
        dichs.forEach(d => {
            const date = new Date(d.data_dichiarazione);
            if (date.getFullYear() === 2025) {
                const title = d.AzioneVolontariato?.titolo || 'Sconosciuto';
                byAction2025[title] = (byAction2025[title] || 0) + (d.neu_guadagnati || 0);
            }
        });
        console.log('\n--- NEU BY ACTION (2025) ---');
        console.log(byAction2025);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkActions();
