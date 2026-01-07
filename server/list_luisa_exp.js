const { TransazioneNEU, User } = require('./models');

async function listLuisaExp() {
    try {
        const user = await User.findByPk(15);
        const trans = await TransazioneNEU.findAll({ where: { da_utente_id: user.id } });
        console.log(`Luisa ID 15 Expenses (${trans.length}):`);
        trans.forEach(t => console.log(`${t.data_transazione}: ${t.importo} - ${t.causale}`));
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
listLuisaExp();
