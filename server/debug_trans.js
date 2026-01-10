const { TransazioneNEU, User } = require('./models');

async function debug() {
    // Let's find a user who has declarations
    const trans = await TransazioneNEU.findAll({
        order: [['id', 'DESC']],
        limit: 20
    });

    console.log('LAST 20 TRANSACTIONS:');
    trans.forEach(t => {
        console.log(`ID: ${t.id} | Tipo: ${t.tipo} | Importo: ${t.importo} | Date: ${t.data_transazione} | To: ${t.a_utente_id} | RefDich: ${t.riferimento_dichiarazione_id}`);
    });
    process.exit(0);
}

debug();
