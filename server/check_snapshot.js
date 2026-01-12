const { User, TransazioneNEU, OrdineCoworking, AbbonamentoUtente, ProfiloCoworker } = require('./models');

async function snapshot() {
    try {
        const counts = {
            utenti: await User.count(),
            ordini: await OrdineCoworking.count(),
            abbonamenti: await AbbonamentoUtente.count(),
            profilo_coworker: await ProfiloCoworker.count(),
            transazioni_neu: await TransazioneNEU.count()
        };
        console.log('--- SNAPSHOT DATABASE APPENA CARICATO ---');
        console.log(JSON.stringify(counts, null, 2));

        // Controllo specifico Alexandra
        const alex = await User.findOne({ where: { email: 'thalassamu@gmail.com' } });
        if (alex) {
            console.log('\n--- DATI ALEXANDRA NEL DB CARICATO ---');
            console.log(`Saldo: ${alex.saldo_neu} NEU`);
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
snapshot();
