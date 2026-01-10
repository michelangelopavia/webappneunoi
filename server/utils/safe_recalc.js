const models = require('../models');
const { Op } = require('sequelize');

async function safeRecalcUser(userId) {
    const user = await models.User.findByPk(userId);
    if (!user) return null;

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

        return { startDate, endDate };
    };

    const { startDate, endDate } = getAssociativeYearRange();
    const totalHoursYear = volRecords
        .filter(d => {
            const dDate = new Date(d.data_dichiarazione || d.createdAt);
            return d.confermato && dDate >= startDate && dDate <= endDate;
        })
        .reduce((sum, d) => sum + (d.ore || 0), 0);

    // 2. DEFINE BUCKETS
    // Bucket Ancient: Pre-Oct 2024
    // Bucket A: Oct 1, 2024 -> Sep 30, 2025 (Expires Dec 31, 2025)
    // Bucket B: Oct 1, 2025 -> Sep 30, 2026 (Expires Dec 31, 2026)

    let bucketAncient = 0;
    let bucketA = 0;
    let bucketB = 0;

    // Dates (Adjusted for Italy Timezone UTC+2/UTC+1)
    const startA = new Date('2024-09-30T20:00:00Z');
    const splitDate = new Date('2025-09-30T20:00:00Z');
    const expiryA = new Date('2025-12-31T23:59:59Z');

    // Helper to Add Earnings
    const addEarning = (amount, dateStr) => {
        const d = new Date(dateStr || Date.now());
        const val = amount || 0;

        if (d < startA) {
            bucketAncient += val;
        } else if (d < splitDate) {
            bucketA += val;
        } else {
            bucketB += val;
        }
    };

    // Debug Aggregates
    let totalHostEarned = 0;
    let totalVolEarned = 0;
    let totalTransEarned = 0;

    hostEarns.forEach(e => {
        addEarning(e.neu_guadagnati, e.data_inizio || e.createdAt);
        totalHostEarned += (e.neu_guadagnati || 0);
    });
    volRecords.forEach(e => {
        addEarning(e.neu_guadagnati, e.data_dichiarazione || e.createdAt);
        totalVolEarned += (e.neu_guadagnati || 0);
    });
    transEarns.forEach(e => {
        addEarning(e.importo, e.data_transazione || e.createdAt);
        totalTransEarned += (e.importo || 0);
    });

    const initialBucketA = bucketA;
    const initialBucketB = bucketB;
    const initialBucketAncient = bucketAncient;

    // 3. PROCESS SPENDS SIMULATION
    const sortedSpends = transSpends.sort((a, b) => new Date(a.data_transazione) - new Date(b.data_transazione));

    let totalSpent = 0;

    for (const spend of sortedSpends) {
        const date = new Date(spend.data_transazione);
        let amount = spend.importo || 0;
        totalSpent += amount;

        const isAValid = date <= expiryA;

        const fromAncient = Math.min(amount, bucketAncient);
        bucketAncient -= fromAncient;
        amount -= fromAncient;

        if (isAValid) {
            const fromA = Math.min(amount, bucketA);
            bucketA -= fromA;
            amount -= fromA;
        }

        const fromB = Math.min(amount, bucketB);
        bucketB -= fromB;
        amount -= fromB;
    }

    // 4. FINAL RESULTS
    const now = new Date();
    const isAfterExpiryA = now > expiryA;

    const finalScadenza = Math.round(bucketB * 100) / 100;

    const finalTotal = isAfterExpiryA
        ? finalScadenza
        : Math.round((bucketAncient + bucketA + bucketB) * 100) / 100;

    await user.update({
        saldo_neu: finalTotal,
        saldo_neu_scadenza: finalScadenza,
        ore_volontariato_anno: totalHoursYear
    });

    return {
        id: userId,
        full_name: user.full_name,
        email: user.email,
        saldo_neu: finalTotal,
        saldo_neu_scadenza: finalScadenza,
        ore_volontariato_anno: totalHoursYear,
        debug: {
            initialBucketAncient,
            initialBucketA,
            initialBucketB,
            remainingBucketAncient: bucketAncient,
            remainingBucketA: bucketA,
            remainingBucketB: bucketB,
            totalSpent,
            isAfterExpiryA,
            totalHostEarned,
            totalVolEarned,
            totalTransEarned
        }
    };
}

module.exports = { safeRecalcUser };
