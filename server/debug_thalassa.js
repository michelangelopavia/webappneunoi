const { User, TransazioneNEU } = require('./models');
const { Op } = require('sequelize');

async function debug() {
    try {
        const user = await User.findOne({ where: { email: 'thalassamu@gmail.com' } });
        const trans = await TransazioneNEU.findAll({
            where: {
                [Op.or]: [{ da_utente_id: user.id }, { a_utente_id: user.id }]
            },
            order: [['data_transazione', 'ASC']]
        });

        console.log(`Alexandra D'Onofrio (ID: ${user.id})`);
        let runningTotal = 0;
        trans.forEach(t => {
            const amount = t.a_utente_id === user.id ? t.importo : -t.importo;
            runningTotal += amount;
            console.log(`${t.data_transazione.toISOString().split('T')[0]} | ${amount > 0 ? '+' : ''}${amount} | ${t.descrizione || t.causale} | Running: ${runningTotal}`);
        });

        const { safeRecalcUser } = require('./utils/safe_recalc');
        const res = await safeRecalcUser(user.id);
        console.log('\nRecalc result:', JSON.stringify(res, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
debug();
