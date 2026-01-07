const sequelize = require('./database');
const models = require('./models');

async function fixRiccardoDate() {
    try {
        console.log('Fixing Riccardo Subscription Date...');

        // Find Riccardo's first carnet (ID 101 from previous inspection)
        // Or search dynamic if needed.
        const sub = await models.AbbonamentoUtente.findOne({
            where: {
                id: 101, // We identified this ID earlier
                profilo_coworker_id: 204
            }
        });

        if (!sub) {
            console.error('Subscription 101 not found.');
            return;
        }

        console.log(`Current start date: ${sub.data_inizio}`);

        // Update to 2025-05-21
        // Using "2025-05-21" string is fine, Sequelize handles it.
        // Let's set it to valid date
        await sub.update({
            data_inizio: '2025-05-21'
        });

        console.log(`New start date: ${sub.data_inizio}`);

        // Run Reconciliation
        console.log('Re-running reconciliation...');
        require('./fix_reconcile_carnets');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixRiccardoDate();
