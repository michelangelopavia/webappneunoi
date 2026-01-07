const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING }
});

async function getEmail() {
    try {
        await sequelize.authenticate();
        const user = await User.findByPk(2);
        if (user) {
            console.log(`Email for user 2: ${user.email}`);
        } else {
            console.log('User 2 not found');
        }
    } catch (error) {
        console.error(error);
    }
}

getEmail();
