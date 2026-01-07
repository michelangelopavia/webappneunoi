const { TransazioneNEU } = require('./models');

async function verify() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: { causale: { [require('sequelize').Op.like]: '%Scadenza 2025%' } }
        });
        console.log(`Created ${trans.length} expiration transactions.`);
        let total = 0;
        trans.forEach(t => {
            console.log(`User ID ${t.da_utente_id}: ${t.importo} NEU`);
            total += t.importo;
        });
        console.log(`TOTAL EXPIRED: ${total}`);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

verify();
