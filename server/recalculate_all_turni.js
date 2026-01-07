const { TurnoHost, User } = require('./models');
const { calculateNEU } = require('./utils/neu_calculator');
const sequelize = require('./database');

async function recalculate() {
    try {
        console.log('--- NEU RECALCULATION START ---');

        // 1. Get all shifts
        const turni = await TurnoHost.findAll();
        console.log(`Analyzing ${turni.length} shifts...`);

        // Use a map to track user balance updates
        const userBalances = new Map();

        // 2. Recalculate each shift
        for (const turno of turni) {
            // Check if user is association
            const user = await User.findByPk(turno.utente_id);
            if (!user) continue;

            const isAssociation = user.role === 'associazione' || (user.roles && user.roles.includes('associazione'));

            const stats = calculateNEU(turno.data_inizio, turno.data_fine);
            const newNeu = isAssociation ? 0 : stats.neuTotali;

            if (turno.neu_guadagnati !== newNeu) {
                // Update shift
                await turno.update({
                    ore_lavorate: stats.oreTotali,
                    neu_guadagnati: newNeu
                });
            }

            // Accumulate balance
            const currentBalance = userBalances.get(user.id) || 0;
            userBalances.set(user.id, currentBalance + newNeu);
        }

        console.log('Recalculation of shifts completed.');
        console.log('Updating user balances...');

        // 3. Update User Balances (Add volunteering hours/etc if needed, but here we focus on fixing the import results)
        // Note: For a clean fix, we should sum all sources of NEU.
        // But for this emergency fix, we'll just update from shifts and assume other transactions are correct.

        for (const [userId, totalFromShifts] of userBalances) {
            // In this specific app, saldo_neu = sum(shifts) + sum(volunteering) + sum(transfers)
            // But Michelangelo asked to fix the "Host calculation". 
            // We'll update the user's total balance based on the new shift totals.

            const user = await User.findByPk(userId);
            if (!user) continue;

            // Recalculate total balance from all sources for safety
            const { TransazioneNEU, DichiarazioneVolontariato } = require('./models');

            // Sum other transactions (not shifts)
            const transactions = await TransazioneNEU.findAll({
                where: {
                    [sequelize.Sequelize.Op.or]: [
                        { da_utente_id: userId },
                        { a_utente_id: userId }
                    ],
                    tipo: { [sequelize.Sequelize.Op.ne]: 'turno_host' }
                }
            });

            let otherTotal = 0;
            transactions.forEach(t => {
                if (t.a_utente_id === userId) otherTotal += t.importo;
                if (t.da_utente_id === userId) otherTotal -= t.importo;
            });

            // Sum volunteering
            const volunteering = await DichiarazioneVolontariato.findAll({
                where: { user_id: userId, confermato: true }
            });
            const volTotal = volunteering.reduce((sum, v) => sum + (v.neu_guadagnati || 0), 0);

            const finalBalance = Math.round((totalFromShifts + otherTotal + volTotal) * 100) / 100;

            await user.update({ saldo_neu: finalBalance });
            console.log(`Updated User ${user.full_name}: ${finalBalance} NEU`);
        }

        console.log('--- RECALCULATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR DURING RECALCULATION:', error);
        process.exit(1);
    }
}

recalculate();
