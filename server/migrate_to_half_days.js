const sequelize = require('./database');
const { Op } = require('sequelize');
const models = require('./models');

async function migrateToHalfDays() {
    const transaction = await sequelize.transaction();
    try {
        console.log('Migrating system to Half-Day Units (1 Unit = 1 Half Day)...');

        // 1. Update TipoAbbonamento (Carnet 20)
        // Set capacity to 20 instead of 10
        await models.TipoAbbonamento.update(
            { numero_ingressi: 20 },
            {
                where: { id: 4 }, // Carnet 20 1/2 giornate
                transaction
            }
        );
        console.log('Updated Carnet 20 configuration to 20 units.');

        // 2. Update IngressiCoworking
        // Convert existing 0.5 -> 1 and 1.0 -> 2
        // We trust 'durata' field as the source of truth

        await models.IngressoCoworking.update(
            { ingressi_consumati: 1 },
            {
                where: { durata: 'mezza_giornata' },
                transaction
            }
        );

        await models.IngressoCoworking.update(
            { ingressi_consumati: 2 },
            {
                where: { durata: 'giornata_intera' },
                transaction
            }
        );
        console.log('Updated Ingressi values (0.5->1, 1->2).');

        // 3. Update Existing Subscriptions (Carnet 20)
        // Update capacity to 20
        await models.AbbonamentoUtente.update(
            { ingressi_totali: 20 },
            {
                where: { tipo_abbonamento_id: 4 },
                transaction
            }
        );
        console.log('Updated existing carnet subscriptions capacity to 20.');

        // 4. Recalculate Usage for ALL Subscriptions
        // We fetch all active/relevant subscriptions and recalculate sum of linked ingressi

        const subs = await models.AbbonamentoUtente.findAll({
            where: { ingressi_totali: { [Op.gt]: 0 } }, // Only those that track quantity
            transaction
        });

        for (const sub of subs) {
            // Count total consumed from linked ingressi
            const totalUsed = await models.IngressoCoworking.sum('ingressi_consumati', {
                where: { abbonamento_id: sub.id },
                transaction
            });

            sub.ingressi_usati = totalUsed || 0;
            await sub.save({ transaction });
        }
        console.log(`Recalculated usage for ${subs.length} subscriptions.`);

        await transaction.commit();
        console.log('Migration successful!');

    } catch (error) {
        await transaction.rollback();
        console.error('Migration failed:', error);
    }
}

migrateToHalfDays();
