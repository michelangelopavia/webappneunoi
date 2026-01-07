const { User, ProfiloCoworker } = require('./models');
const sequelize = require('./database');

async function inspectProfileConnect() {
    try {
        await sequelize.authenticate();

        console.log('--- USER ---');
        const user = await User.findOne({ where: { email: 'sgiangra82@gmail.com' } });
        if (user) {
            console.log(`ID: ${user.id}, Name: ${user.full_name}, Email: ${user.email}`);
        } else {
            console.log('User not found.');
        }

        console.log('\n--- PROFILO COWORKER ---');
        const profiles = await ProfiloCoworker.findAll({ where: { email: 'sgiangra82@gmail.com' } });
        if (profiles.length > 0) {
            profiles.forEach(p => {
                console.log(`ID: ${p.id}, Names: ${p.first_name} ${p.last_name}, Email: ${p.email}, UserID Linked: ${p.user_id}`);
            });
        } else {
            console.log('No ProfiloCoworker found with this email.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectProfileConnect();
