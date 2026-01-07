const { DichiarazioneVolontariato, AzioneVolontariato } = require('./models');

async function checkDichiarazioni() {
    try {
        const dichs = await DichiarazioneVolontariato.findAll({
            include: [{ model: AzioneVolontariato }]
        });
        console.log('--- ALL DICHIARAZIONI CON NEU ---');
        dichs.forEach(d => {
            if (d.neu_guadagnati > 0) {
                console.log(`Date: ${d.data_dichiarazione}, NEU: ${d.neu_guadagnati}, Action: ${d.AzioneVolontariato?.titolo || 'N/A'}, Note: ${d.note}`);
            }
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkDichiarazioni();
