const sequelize = require('./database');
const { Op } = require('sequelize');
const models = require('./models');

async function fixCarnetCapacity() {
    const transaction = await sequelize.transaction();
    try {
        console.log('Fixing Carnet Capacity...');

        // 1. Identify the correct capacity from TipoAbbonamento (ID 4)
        const carnetType = await models.TipoAbbonamento.findByPk(4);
        const correctMax = carnetType.numero_ingressi; // Should be 10 now
        console.log(`Correct max capacity for '${carnetType.nome}' (ID 4) is: ${correctMax}`);

        if (!correctMax) {
            console.error('Max capacity is 0 or null. Aborting.');
            return;
        }

        // 2. Update existing subscriptions of this type
        // Resetting 'ingressi_totali' to the correct value (10)
        // ONLY if it is currently different (e.g. 20)

        const [updatedCount] = await models.AbbonamentoUtente.update(
            { ingressi_totali: correctMax },
            {
                where: {
                    tipo_abbonamento_id: 4,
                    ingressi_totali: { [Op.ne]: correctMax }
                },
                transaction
            }
        );

        console.log(`Updated capacity for ${updatedCount} subscriptions.`);

        await transaction.commit();
        console.log('Capacity fix applied.');

        // 3. Now Run Reconciliation again to fix usage counters
        console.log('Re-running reconciliation...');
        require('./fix_reconcile_carnets');

    } catch (error) {
        await transaction.rollback();
        console.error('Error:', error);
    }
}

fixCarnetCapacity();
