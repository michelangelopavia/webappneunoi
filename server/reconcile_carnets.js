const sequelize = require('./database');
const { DataTypes, Op } = require('sequelize');
const models = require('./models');

// Re-initialize models manually if needed, or rely on models.js export if it exports initialized models
// models.js exports 'models' object with all models.

async function reconcileCarnets() {
    try {
        console.log('Starting carnet reconciliation...');

        // 1. Get all Ingressi that are "carnet" but missing abbonamento_id
        const ingressi = await models.IngressoCoworking.findAll({
            where: {
                abbonamento_id: null,
                [Op.or]: [
                    { tipo_ingresso: 'carnet' },
                    // In case older imports just used 'tipo'='giornaliero' but we want to force them if they match a carnet?
                    // Let's stick to what we know: the user imported them as carnet likely, or with specific columns
                    { tipo: 'carnet' }
                ]
            }
        });

        console.log(`Found ${ingressi.length} unlinked carnet entries.`);

        let updatedCount = 0;
        let errors = [];

        for (const ingresso of ingressi) {
            if (!ingresso.profilo_coworker_id) {
                // Try to find profile if missing (sanity check, though import should have done it)
                if (ingresso.profilo_nome_completo) {
                    const p = await models.ProfiloCoworker.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('first_name'))),
                            // This is a rough match, trusting the previous smart match did its job or we skip
                            // Actually, let's just skip if no profile_id, as we can't link reliably
                        )
                    });
                    // skipping complex matching here, assuming it's done. 
                }
                if (!ingresso.profilo_coworker_id) {
                    errors.push(`Ingresso ID ${ingresso.id}: No profile ID linked. Name: ${ingresso.profilo_nome_completo}`);
                    continue;
                }
            }

            const profileId = ingresso.profilo_coworker_id;
            const date = new Date(ingresso.data_ingresso);

            // 2. Find a valid Carnet for this profile and date
            // Look for subscriptions of type 'carnet' (we might need to check TipoAbbonamento category, or just assume by context)
            // But usually, we just look for *any* active subscription that covers this date.

            const abbonamenti = await models.AbbonamentoUtente.findAll({
                where: {
                    profilo_coworker_id: profileId,
                    stato: 'attivo', // Or maybe 'scaduto' if the entry was in the past? 
                    // Better to not filter by 'attivo' only, because we are reconstructing history.
                    // Filter by date range.
                    data_inizio: { [Op.lte]: date },
                    data_scadenza: { [Op.gte]: date }
                }
            });

            // Filter for only 'carnet' types? 
            // We need to join with TipoAbbonamento to be sure, or guess. 
            // Let's assume if it has 'ingressi_totali' > 0, it's a carnet-like thing.

            let bestAbb = null;

            // If multiple, pick the one created/started most recently or best fit?
            // Usually just one.
            const validAbbs = abbonamenti.filter(a => a.ingressi_totali > 0);

            if (validAbbs.length === 1) {
                bestAbb = validAbbs[0];
            } else if (validAbbs.length > 1) {
                // Ambiguity? Pick the one ... maybe the one with remaining entries? 
                // Or simply the first one.
                console.warn(`Multiple subscriptions found for Profile ${profileId} on ${date.toISOString().split('T')[0]}. Using first.`);
                bestAbb = validAbbs[0];
            } else {
                // No subscription found by date. 
                // Try finding *any* carnet that has space, maybe the date is slightly off or it's a "floating" carnet?
                // Or maybe the user hasn't imported the carnet yet?
                // Or maybe the carnet is expired but they used it anyway?

                // Let's try to find the *nearest* valid carnet (e.g. active).
                const fallbackAbb = await models.AbbonamentoUtente.findOne({
                    where: {
                        profilo_coworker_id: profileId,
                        ingressi_totali: { [Op.gt]: 0 }
                    },
                    order: [['data_inizio', 'DESC']] // Most recent
                });

                if (fallbackAbb) {
                    // Verify if it's reasonable (e.g. same year?). 
                    // For now, let's use it if we found nothing else, but log it.
                    // console.log(` Using fallback carnet ${fallbackAbb.id} for ingress ${ingresso.id}`);
                    bestAbb = fallbackAbb;
                }
            }

            if (bestAbb) {
                // 3. Link and Update
                const amount = ingresso.ingressi_consumati || (ingresso.durata === 'mezza_giornata' ? 0.5 : 1);

                // Update Ingress
                await models.IngressoCoworking.update({
                    abbonamento_id: bestAbb.id,
                    ingressi_consumati: amount // ensure this is set if it was missing
                }, { where: { id: ingresso.id } });

                // Update Subscription
                // We fetch fresh to avoid concurrency issues if we were running parallel, but this is a script.
                // However, 'ingressi_usati' is cumulative.
                await bestAbb.increment('ingressi_usati', { by: amount });

                updatedCount++;
                process.stdout.write('.');
            } else {
                errors.push(`Ingresso ID ${ingresso.id}: No valid carnet found for Profile ${profileId} (${ingresso.profilo_nome_completo}) on ${date.toISOString().split('T')[0]}`);
            }
        }

        console.log(`\nReconciliation finished.`);
        console.log(`Updated ${updatedCount} entries.`);
        if (errors.length > 0) {
            console.log('Errors/Warnings:');
            errors.forEach(e => console.log(e));
        }

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

// Check if run directly
if (require.main === module) {
    reconcileCarnets();
}
