const { TurnoHost, TransazioneNEU, DichiarazioneVolontariato, User } = require('./models');

async function checkLuisa() {
    try {
        const user = await User.findOne({ where: { full_name: { [require('sequelize').Op.like]: '%Luisa%' } } });
        if (!user) { console.log('Luisa not found'); return; }
        console.log(`Luisa found: ID ${user.id}, Name ${user.full_name}`);

        const turni = await TurnoHost.findAll({ where: { utente_id: user.id } });
        const trans = await TransazioneNEU.findAll({ where: { [require('sequelize').Op.or]: [{ a_utente_id: user.id }, { da_utente_id: user.id }] } });
        const dich = await DichiarazioneVolontariato.findAll({ where: { user_id: user.id } });

        console.log('-- EARNINGS --');
        turni.forEach(t => console.log(`${t.data_inizio}: ${t.neu_guadagnati} (Host)`));
        dich.forEach(d => console.log(`${d.data_dichiarazione}: ${d.neu_guadagnati} (Volont)`));
        trans.filter(t => t.a_utente_id === user.id && t.tipo !== 'turno_host').forEach(t => console.log(`${t.data_transazione}: ${t.importo} (${t.tipo})`));

        console.log('-- EXPENSES --');
        trans.filter(t => t.da_utente_id === user.id).forEach(t => console.log(`${t.data_transazione}: ${t.importo} (${t.tipo})`));

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkLuisa();
