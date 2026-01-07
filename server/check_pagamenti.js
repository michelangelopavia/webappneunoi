const { TransazioneNEU } = require('./models');

async function checkPagamenti() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: { tipo: 'pagamento_associazione' }
        });
        const causali = {};
        trans.forEach(t => {
            causali[t.causale] = (causali[t.causale] || 0) + t.importo;
        });
        console.log(JSON.stringify(causali, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPagamenti();
