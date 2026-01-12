const { TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function check() {
    try {
        const count = await TransazioneNEU.count({
            where: {
                [Op.or]: [
                    { tipo: 'scadenza' },
                    { tipo: 'scadenza_neu' },
                    { causale: { [Op.like]: '%scadenza%' } },
                    { causale: { [Op.like]: '%scadut%' } }
                ]
            }
        });
        console.log(`Numero di transazioni di scadenza nel DB: ${count}`);

        if (count > 0) {
            const sum = await TransazioneNEU.sum('importo', {
                where: {
                    [Op.or]: [
                        { tipo: 'scadenza' },
                        { tipo: 'scadenza_neu' },
                        { causale: { [Op.like]: '%scadenza%' } },
                        { causale: { [Op.like]: '%scadut%' } }
                    ]
                }
            });
            console.log(`Totale NEU scaduti (somma importi): ${sum}`);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
