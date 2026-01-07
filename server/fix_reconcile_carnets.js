const sequelize = require('./database');
const { DataTypes, Op } = require('sequelize');
const models = require('./models');

async function fixReconcileCarnets() {
    const transaction = await sequelize.transaction();
    try {
        console.log('Starting IMPROVED carnet reconciliation...');

        // 1. RESET STEP: Clear previous reconciliation data to avoid double counting
        console.log('Resetting counters and links...');
        await models.IngressoCoworking.update(
            { abbonamento_id: null },
            { where: { tipo_ingresso: 'carnet' }, transaction }
        );

        // Reset ingressi_usati only for carnet subscriptions (those with ingressi_totali > 0)
        // We can safely reset all active/expired ones that are likely carnets.
        await models.AbbonamentoUtente.update(
            { ingressi_usati: 0 },
            {
                where: {
                    ingressi_totali: { [Op.gt]: 0 }
                },
                transaction
            }
        );

        console.log('Reset complete. Starting matching...');

        // 2. Fetch all carnet entries sorted by date
        const ingressi = await models.IngressoCoworking.findAll({
            where: { tipo_ingresso: 'carnet' },
            order: [['data_ingresso', 'ASC']],
            transaction
        });

        // 3. Process each entry
        let updatedCount = 0;
        let unmatchedCount = 0;

        // Cache subscriptions by user to reduce DB calls
        const subsCache = {};

        for (const ingresso of ingressi) {
            if (!ingresso.profilo_coworker_id) {
                console.warn(`Skipping Ingresso ${ingresso.id}: No profile linked.`);
                continue;
            }

            const userId = ingresso.profilo_coworker_id; // Using profile_id as key

            // Fetch/Cache subscriptions for this profile
            if (!subsCache[userId]) {
                subsCache[userId] = await models.AbbonamentoUtente.findAll({
                    where: {
                        profilo_coworker_id: userId,
                        ingressi_totali: { [Op.gt]: 0 }
                    },
                    order: [['data_scadenza', 'ASC'], ['data_inizio', 'ASC']], // FIFO by expiration
                    transaction
                });
            }

            const subs = subsCache[userId];
            const entryDate = new Date(ingresso.data_ingresso);
            // entryDate at 00:00 or current time? 
            // DB stores date string usually YYYY-MM-DD for comparison, or ISO.
            // Sequelize DATE compares as timestamps. 
            // Ingressi data_ingresso is DATE. Abbonamento data_inizio/scadenza are DATE.
            // Ensuring strict day comparison.

            const entryDay = new Date(entryDate).setHours(0, 0, 0, 0);

            // Find valid subscription
            // Criteria: 
            // 1. Date covers entry
            // 2. Subscription has capacity

            const amount = ingresso.ingressi_consumati || (ingresso.durata === 'mezza_giornata' ? 0.5 : 1);

            let bestAbb = null;

            for (const sub of subs) {
                const start = new Date(sub.data_inizio).setHours(0, 0, 0, 0);
                const end = new Date(sub.data_scadenza).setHours(23, 59, 59, 999);

                // Check Date
                if (entryDay >= start && entryDay <= end) {
                    // Check Capacity
                    // We must track 'ingressi_usati' in memory because we are in a loop and DB isn't updated instantly visible without reload/refetch
                    // But here 'sub' is a JS object instance from the list, so if we update it, it persists in the list for next iteration!
                    const used = sub.ingressi_usati || 0;
                    const total = sub.ingressi_totali || 0;

                    if (used + amount <= total) {
                        bestAbb = sub;
                        break; // Found the first valid one (FIFO by expiration due to sort)
                    }
                }
            }

            if (bestAbb) {
                // Link
                ingresso.abbonamento_id = bestAbb.id;
                await ingresso.save({ transaction });

                // Update Subscription (both in Memory and DB for final commit)
                bestAbb.ingressi_usati = (bestAbb.ingressi_usati || 0) + amount;
                await bestAbb.save({ transaction });

                updatedCount++;
            } else {
                unmatchedCount++;
                // console.log(`No valid subscription for Profile ${userId} on ${new Date(entryDate).toLocaleDateString()}`);
            }
        }

        await transaction.commit();
        console.log(`Reconciliation finished.`);
        console.log(`Matched: ${updatedCount}`);
        console.log(`Unmatched: ${unmatchedCount}`);

    } catch (error) {
        await transaction.rollback();
        console.error('Fatal error:', error);
    }
}

fixReconcileCarnets();
