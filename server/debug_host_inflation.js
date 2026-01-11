const models = require('./models');
const { Op } = require('sequelize');

async function debugHostInflation() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const turni = await models.TurnoHost.findAll({
        where: { data_inizio: { [Op.between]: [start, end] } },
        include: [{ model: models.User, attributes: ['email', 'full_name'] }]
    });

    const userStats = {};
    turni.forEach(t => {
        const email = t.User ? t.User.email : 'Sconosciuto';
        if (!userStats[email]) userStats[email] = { total: 0, count: 0 };
        userStats[email].total += (t.neu_guadagnati || 0);
        userStats[email].count += 1;
    });

    console.log(`--- HOST SHIFTS 2025 (Total: ${turni.length}) ---`);
    Object.entries(userStats).sort((a, b) => b[1].total - a[1].total).forEach(([email, data]) => {
        console.log(`${email}: ${data.total} NEU (${data.count} turni)`);
    });
}

debugHostInflation().catch(console.error);
