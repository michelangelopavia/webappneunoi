const { User, TurnoHost, DichiarazioneVolontariato, TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function audit() {
    try {
        const userId = 11;
        const user = await User.findByPk(userId);
        console.log(`AUDIT PER: ${user.full_name} (ID: ${userId})`);

        const hosts = await TurnoHost.findAll({ where: { utente_id: userId } });
        const vols = await DichiarazioneVolontariato.findAll({ where: { user_id: userId, confermato: true } });
        const trans = await TransazioneNEU.findAll({
            where: {
                [Op.or]: [{ da_utente_id: userId }, { a_utente_id: userId }]
            },
            order: [['data_transazione', 'ASC']]
        });

        console.log('\n--- 1. HOSTING EARNINGS ---');
        let totalHost = 0;
        hosts.forEach(h => {
            totalHost += h.neu_guadagnati;
            console.log(`${h.data_inizio.toISOString().split('T')[0]} | +${h.neu_guadagnati}`);
        });
        console.log(`TOTALE HOSTING: ${totalHost}`);

        console.log('\n--- 2. VOLUNTEERING EARNINGS ---');
        let totalVol = 0;
        vols.forEach(v => {
            totalVol += v.neu_guadagnati;
            console.log(`${v.data_dichiarazione.toISOString().split('T')[0]} | +${v.neu_guadagnati}`);
        });
        console.log(`TOTALE VOLONTARIATO: ${totalVol}`);

        console.log('\n--- 3. TRANSACTIONS (MANUAL/TRANSFERS) ---');
        let totalTransPlus = 0;
        let totalTransMinus = 0;
        trans.forEach(t => {
            const date = t.data_transazione instanceof Date ? t.data_transazione.toISOString().split('T')[0] : t.data_transazione;
            if (t.a_utente_id === userId) {
                totalTransPlus += t.importo;
                console.log(`${date} | +${t.importo} | ${t.causale || t.descrizione} | ID: ${t.id}`);
            } else {
                totalTransMinus += t.importo;
                console.log(`${date} | -${t.importo} | ${t.causale || t.descrizione} | ID: ${t.id}`);
            }
        });
        console.log(`TOTALE TRANS IN: ${totalTransPlus}`);
        console.log(`TOTALE TRANS OUT: ${totalTransMinus}`);

        console.log('\n--- RIEPILOGO FINALE ---');
        console.log(`Entrate: ${totalHost} (Host) + ${totalVol} (Vol) + ${totalTransPlus} (Trans) = ${totalHost + totalVol + totalTransPlus}`);
        console.log(`Uscite: ${totalTransMinus}`);
        console.log(`Saldo Matematico: ${(totalHost + totalVol + totalTransPlus) - totalTransMinus}`);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

audit();
