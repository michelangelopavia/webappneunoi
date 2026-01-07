const { AbbonamentoUtente, ProfiloCoworker } = require('./models');
const sequelize = require('./database');

async function fixSubscriptionsLink() {
    try {
        await sequelize.authenticate();

        // Target: User 23, Profile 223
        const result = await AbbonamentoUtente.update(
            { user_id: 23 },
            {
                where: {
                    profilo_coworker_id: 223,
                    user_id: null
                }
            }
        );

        console.log(`Updated ${result[0]} subscriptions to link to User 23.`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fixSubscriptionsLink();
