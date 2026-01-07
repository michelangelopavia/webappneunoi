
const { User } = require('./models');
const sequelize = require('./database'); // Direct import of the instance

async function assignHostRole() {
    try {
        await sequelize.sync(); // Ensure connection
        const user = await User.findOne({ where: { email: 'admin@neu.noi' } });

        if (!user) {
            console.log('User admin@neu.noi not found.');
            return;
        }

        let roles = user.roles || [];
        // Ensure roles is an array
        if (typeof roles === 'string') {
            try { roles = JSON.parse(roles); } catch (e) { roles = []; }
        }

        if (!roles.includes('host')) {
            roles.push('host');
            // Sequelize update
            await User.update({ roles: roles }, { where: { id: user.id } });
            console.log(`Updated roles for ${user.email}:`, roles);
        } else {
            console.log(`User ${user.email} already has 'host' role.`);
        }

    } catch (error) {
        console.error('Error assigning role:', error);
    }
}

assignHostRole();
