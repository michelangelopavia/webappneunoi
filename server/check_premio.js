const { TransazioneNEU } = require('./models');

async function checkPremio() {
    try {
        const p = await TransazioneNEU.findAll({
            where: { tipo: 'premio_annuale' }
        });
        console.log(`Found ${p.length} premio_annuale transactions.`);
        let sum = 0;
        p.forEach(t => sum += t.importo);
        console.log(`Sum: ${sum}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPremio();
