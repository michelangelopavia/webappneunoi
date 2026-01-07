const { User } = require('./models');
const sequelize = require('./database');

async function inspectUser() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { email: 'sgiangra82@gmail.com' } });
        if (user) {
            console.log('User found:', user.email);
            console.log('Role:', user.role);
            console.log('Roles:', user.roles);
            console.log('Tipo Utente:', user.tipo_utente);
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectUser();
