const models = require('../models');
const { Op } = require('sequelize');

async function safeRecalcUser(userId) {
    const user = await models.User.findByPk(userId);
    if (!user) return null;

    const now = new Date();

    // 1. GATHER DATA
    const hostEarns = await models.TurnoHost.findAll({ where: { utente_id: userId } });
    const volRecords = await models.DichiarazioneVolontariato.findAll({ where: { user_id: userId } });
    const transEarns = await models.TransazioneNEU.findAll({
        where: {
            a_utente_id: userId,
            tipo: { [Op.notIn]: ['turno_host', 'volontariato'] }
        }
    });
    const transSpends = await models.TransazioneNEU.findAll({ where: { da_utente_id: userId } });

    // --- RECALCULATE VOLUNTEER HOURS (ASSOCIATIVE YEAR) ---
    const getAssociativeYearRange = (refDate = new Date()) => {
        const date = new Date(refDate);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed, 9 = October

        let startYear = (month >= 9) ? year : year - 1;
        const startDate = new Date(startYear, 9, 1, 0, 0, 0); // Oct 1st
        const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59); // Sept 30th

        return { startYear, startDate, endDate };
    };

    const currentAssoc = getAssociativeYearRange(now);
    const totalHoursYear = volRecords
        .filter(d => {
            const dDate = new Date(d.data_dichiarazione || d.createdAt);
            return d.confermato && dDate >= currentAssoc.startDate && dDate <= currentAssoc.endDate;
        })
        .reduce((sum, d) => sum + (d.ore || 0), 0);

    // 2. DEFINE DYNAMIC BUCKETS
    // Rule: Earnings in Assoc Year X/X+1 expire on Dec 31, X+1.
    // We group all earnings by their Expiry Date.

    const earningsByExpiry = {}; // { 'YYYY-MM-DD': amount }

    const addEarningToBucket = (amount, dateStr) => {
        if (!amount || amount <= 0) return;
        const d = new Date(dateStr);
        const assoc = getAssociativeYearRange(d);
        // Expiry is Dec 31 of (startYear + 1)
        const expiryDate = new Date(assoc.startYear + 1, 11, 31, 23, 59, 59);
        const expiryKey = expiryDate.toISOString().split('T')[0];

        earningsByExpiry[expiryKey] = (earningsByExpiry[expiryKey] || 0) + amount;
    };

    hostEarns.forEach(e => addEarningToBucket(e.neu_guadagnati, e.data_inizio || e.createdAt));
    volRecords.forEach(e => addEarningToBucket(e.neu_guadagnati, e.data_dichiarazione || e.createdAt));
    transEarns.forEach(e => addEarningToBucket(e.importo, e.data_transazione || e.createdAt));

    // 3. PROCESS SPENDS SIMULATION (FIFO by Expiry)
    const sortedSpends = transSpends.sort((a, b) => new Date(a.data_transazione) - new Date(b.data_transazione));
    const sortedExpiryKeys = Object.keys(earningsByExpiry).sort(); // Ascending dates

    for (const spend of sortedSpends) {
        const spendDate = new Date(spend.data_transazione);
        let amountToSpend = spend.importo || 0;

        for (const expiryKey of sortedExpiryKeys) {
            if (amountToSpend <= 0) break;

            const expiryDate = new Date(expiryKey);
            // Can only spend from this bucket if it wasn't expired at spend time
            if (spendDate <= expiryDate) {
                const available = earningsByExpiry[expiryKey];
                const take = Math.min(amountToSpend, available);
                earningsByExpiry[expiryKey] -= take;
                amountToSpend -= take;
            }
        }
    }

    // 4. CALCULATE FINAL BALANCES
    let totalBalance = 0;
    let nextExpiryAmount = 0;
    let nextExpiryDate = null;

    // Filter out already expired buckets relative to "NOW"
    const aliveBuckets = sortedExpiryKeys
        .filter(key => new Date(key) >= now)
        .map(key => ({ date: key, amount: earningsByExpiry[key] }));

    aliveBuckets.forEach(b => {
        totalBalance += b.amount;
    });

    if (aliveBuckets.length > 0) {
        nextExpiryAmount = aliveBuckets[0].amount;
        nextExpiryDate = aliveBuckets[0].date;
    }

    const finalTotal = Math.round(totalBalance * 100) / 100;
    const finalScadenza = Math.round(nextExpiryAmount * 100) / 100;

    await user.update({
        saldo_neu: finalTotal,
        saldo_neu_scadenza: finalScadenza,
        ore_volontariato_anno: totalHoursYear
    });

    return {
        id: userId,
        full_name: user.full_name,
        saldo_neu: finalTotal,
        saldo_neu_scadenza: finalScadenza,
        prossima_scadenza: nextExpiryDate,
        ore_volontariato_anno: totalHoursYear
    };
}

module.exports = { safeRecalcUser };
