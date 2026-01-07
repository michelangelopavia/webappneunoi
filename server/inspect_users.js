
const { User } = require('./models');
const sequelize = require('./database');

async function checkUsers() {
    try {
        const users = await User.findAll();
        console.log('--- User Records ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}, Roles: ${JSON.stringify(u.roles)}`);
        });
        console.log('--------------------');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
