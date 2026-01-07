const { AbbonamentoUtente } = require('./models');
const sequelize = require('./database');

async function inspectSubscriptions() {
    try {
        await sequelize.authenticate();

        console.log('--- SUBSCRIPTIONS FOR USER 23 / PROFILE 223 ---');
        const subsUser = await AbbonamentoUtente.findAll({ where: { user_id: 23 } });
        const subsProfile = await AbbonamentoUtente.findAll({ where: { profilo_coworker_id: 223 } });

        console.log(`Found ${subsUser.length} subscriptions by User ID 23`);
        subsUser.forEach(s => console.log(`[User Match] ID: ${s.id}, Type: ${s.tipo_abbonamento_nome}, Status: ${s.stato}, Active: ${s.attivo}`));

        console.log(`Found ${subsProfile.length} subscriptions by Profile ID 223`);
        subsProfile.forEach(s => console.log(`[Profile Match] ID: ${s.id}, UserID: ${s.user_id}, Type: ${s.tipo_abbonamento_nome}, Status: ${s.stato}, Active: ${s.attivo}`));

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectSubscriptions();
