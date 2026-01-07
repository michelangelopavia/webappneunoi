const sequelize = require('../database');
const { User, DichiarazioneVolontariato } = require('../models');
const { Op } = require('sequelize');

const getAssociativeYearRange = (refDate = new Date()) => {
    const date = new Date(refDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    let startYear = (month >= 9) ? year : year - 1;
    const startDate = new Date(startYear, 9, 1, 0, 0, 0);
    const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59);
    return { startDate, endDate };
};

async function run() {
    try {
        console.log('--- RECALCULATING VOLUNTEERING HOURS FOR ASSOCIATIVE YEAR ---');
        const { startDate, endDate } = getAssociativeYearRange();
        console.log(`Current Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        const users = await User.findAll();
        for (const user of users) {
            const sum = await DichiarazioneVolontariato.sum('ore', {
                where: {
                    user_id: user.id,
                    confermato: true,
                    data_dichiarazione: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            });

            const totalHours = sum || 0;
            await user.update({ ore_volontariato_anno: totalHours });
            console.log(`User ${user.id} (${user.full_name}): ${totalHours} hours`);
        }

        console.log('--- DONE ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during recalculation:', err);
        process.exit(1);
    }
}

run();
