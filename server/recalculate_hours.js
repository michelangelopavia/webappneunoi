const { User, DichiarazioneVolontariato } = require('./models');
const sequelize = require('./database');

async function recalculateHours() {
    try {
        console.log('Starting hours recalculation...');
        const users = await User.findAll();

        for (const user of users) {
            const declarations = await DichiarazioneVolontariato.findAll({
                where: {
                    user_id: user.id,
                    confermato: true
                }
            });

            const totalHours = declarations.reduce((sum, d) => sum + (d.ore || 0), 0);

            await user.update({ ore_volontariato_anno: totalHours });
            console.log(`Updated user ${user.email}: ${totalHours} hours`);
        }

        console.log('Recalculation complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error during recalculation:', error);
        process.exit(1);
    }
}

recalculateHours();
