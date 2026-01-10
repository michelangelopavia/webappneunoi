const { TransazioneNEU, User } = require('./models');

async function debug() {
    const lastTrans = await TransazioneNEU.findAll({
        order: [['id', 'DESC']],
        limit: 5
    });

    console.log('LATEST 5 TRANSACTIONS IN DB:');
    lastTrans.forEach(t => {
        console.log({
            id: t.id,
            tipo: t.tipo,
            importo: t.importo,
            date: t.data_transazione,
            a: t.a_utente_id,
            da: t.da_utente_id,
            ref: t.riferimento_dichiarazione_id
        });
    });
    process.exit(0);
}

debug();
