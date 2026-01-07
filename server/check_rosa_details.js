const { TurnoHost, TransazioneNEU, User } = require('./models');

async function checkRosa() {
    try {
        const user = await User.findByPk(5);
        console.log(`Rosa found: ID ${user.id}, Name ${user.full_name}, Saldo: ${user.saldo_neu}`);

        const turni = await TurnoHost.findAll({ where: { utente_id: user.id } });
        const trans = await TransazioneNEU.findAll({ where: { [require('sequelize').Op.or]: [{ a_utente_id: user.id }, { da_utente_id: user.id }] } });

        console.log('-- EARNINGS (pre-2026) --');
        let earnOld = 0;
        let earnNew = 0;

        const process = (amt, date) => {
            const d = new Date(date);
            const annoScadenza = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
            if (annoScadenza <= 2025) {
                earnOld += amt;
                console.log(`OLD: ${date} - ${amt}`);
            } else {
                earnNew += amt;
                console.log(`NEW: ${date} - ${amt}`);
            }
        };

        turni.forEach(t => process(t.neu_guadagnati || 0, t.data_inizio));
        trans.filter(t => t.a_utente_id === user.id && t.tipo !== 'turno_host').forEach(t => process(t.importo || 0, t.data_transazione));

        console.log('-- EXPENSES (pre-2026) --');
        let exp = 0;
        trans.filter(t => t.da_utente_id === user.id && t.tipo !== 'scadenza').forEach(t => {
            exp += t.importo;
            console.log(`${t.data_transazione} - ${t.importo}`);
        });

        console.log(`Summary: Old Earned ${earnOld}, New Earned ${earnNew}, Total Exp ${exp}`);
        console.log(`Expected Expired: ${Math.max(0, earnOld - exp)}`);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkRosa();
