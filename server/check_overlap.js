const models = require('./models');
const { Op } = require('sequelize');

async function findSconosciutoOverlap() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const sconosciuti = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            da_utente_id: null,
            tipo: 'pagamento_associazione'
        }
    });

    const noti = await models.TransazioneNEU.findAll({
        where: {
            data_transazione: { [Op.between]: [start, end] },
            da_utente_id: { [Op.ne]: null },
            tipo: 'pagamento_associazione'
        },
        include: [{ model: models.User, as: 'DaUtente', attributes: ['full_name'] }]
    });

    console.log(`Checking coincidence between ${sconosciuti.length} sconosciuti and ${noti.length} noti...`);

    const matches = [];
    sconosciuti.forEach(s => {
        const sDay = new Date(s.data_transazione).toISOString().split('T')[0];
        const match = noti.find(n => {
            const nDay = new Date(n.data_transazione).toISOString().split('T')[0];
            return nDay === sDay && n.importo === s.importo;
        });
        if (match) {
            matches.push({ sconosciuto: s, noto: match });
        }
    });

    console.log(`Found ${matches.length} matches where amount and day are identical.`);
    matches.slice(0, 20).forEach(m => {
        console.log(`DAY: ${new Date(m.sconosciuto.data_transazione).toISOString().split('T')[0]}, AMOUNT: ${m.sconosciuto.importo}`);
        console.log(`  SCON: ID ${m.sconosciuto.id} - ${m.sconosciuto.causale}`);
        console.log(`  NOTO: ID ${m.noto.id} (${m.noto.DaUtente ? m.noto.DaUtente.full_name : '???'}) - ${m.noto.causale}`);
        console.log('---');
    });
}

findSconosciutoOverlap().catch(console.error);
