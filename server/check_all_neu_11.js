const { User, TurnoHost, DichiarazioneVolontariato, TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function checkAll() {
    try {
        const userId = 11;
        const hosts = await TurnoHost.findAll({ where: { utente_id: userId } });
        const vols = await DichiarazioneVolontariato.findAll({ where: { user_id: userId } });
        const transA = await TransazioneNEU.findAll({ where: { a_utente_id: userId } });
        const transDa = await TransazioneNEU.findAll({ where: { da_utente_id: userId } });

        console.log('Alexandra D\'Onofrio (ID 11) - TUTTI I GUADAGNI:');
        hosts.forEach(h => console.log(`HOST: ${h.data_inizio} | +${h.neu_guadagnati}`));
        vols.forEach(v => console.log(`VOL: ${v.data_dichiarazione} | +${v.neu_guadagnati} (${v.confermato ? 'CONF' : 'PENDING'})`));
        transA.forEach(t => console.log(`TRANS+: ${t.data_transazione} | +${t.importo} (${t.causale})`));

        console.log('\nTUTTE LE USCITE:');
        transDa.forEach(t => console.log(`TRANS-: ${t.data_transazione} | -${t.importo} (${t.causale})`));

    } catch (e) { console.error(e); }
    process.exit(0);
}
checkAll();
