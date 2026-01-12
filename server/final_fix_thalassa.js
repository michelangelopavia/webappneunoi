const { User, TransazioneNEU } = require('./models');
const { safeRecalcUser } = require('./utils/safe_recalc');

async function finalFix() {
    try {
        const userId = 11;

        // Fix transaction 212: from In to Out
        const t212 = await TransazioneNEU.findByPk(212);
        if (t212) {
            console.log('Fixing 212: setting da_utente_id=11 and a_utente_id=null (Spending)');
            await t212.update({
                da_utente_id: userId,
                a_utente_id: null
            });
        }

        // Remove any other strange associations I might have made
        // and check 119 (should be Vol +5, so a_utente_id=11)
        const t119 = await TransazioneNEU.findByPk(119);
        if (t119) {
            console.log('Confirming 119: +5 NEU (Earnings)');
            await t119.update({ a_utente_id: userId, da_utente_id: null });
        }

        // Run re-calculation
        const res = await safeRecalcUser(userId);
        console.log('FINAL RECALC RESULT:', JSON.stringify(res, null, 2));

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
finalFix();
