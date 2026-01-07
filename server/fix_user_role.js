const { User } = require('./models');
const sequelize = require('./database');

async function fixUserRole() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { email: 'sgiangra82@gmail.com' } });
        if (user) {
            console.log('Fixing user:', user.email);
            // Verify roles
            let roles = user.roles || [];
            if (!Array.isArray(roles)) roles = [];

            // Ensure coworker is in roles
            if (!roles.includes('coworker')) {
                roles.push('coworker');
            }
            // Remove socio from roles if present
            roles = roles.filter(r => r !== 'socio');

            await user.update({
                role: 'coworker',    // Fix the primary role string
                roles: roles,        // Fix the roles array
                tipo_utente: 'coworker'
            });
            console.log('User updated to coworker.');
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

fixUserRole();
