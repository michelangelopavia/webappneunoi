const { User, TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function check() {
    try {
        const user = await User.findOne({ where: { email: 'thalassamu@gmail.com' } });
        if (!user) return console.log('User not found');

        const trans = await TransazioneNEU.findAll({
            where: {
                [Op.or]: [{ da_utente_id: user.id }, { a_utente_id: user.id }]
            }
        });

        console.log(`UTENTE: ${user.full_name} (ID: ${user.id})`);
        console.log('--- TUTTE LE TRANSAZIONI ---');
        trans.forEach(t => {
            console.log(`ID: ${t.id} | Data: ${t.data_transazione} | Importo: ${t.importo} | Da: ${t.da_utente_id} | A: ${t.a_utente_id} | Desc: ${t.descrizione}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
