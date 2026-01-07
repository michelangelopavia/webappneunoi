const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const AbbonamentoUtente = sequelize.define('AbbonamentoUtente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER }
});

async function fixData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Update ID 2
        const [updated] = await AbbonamentoUtente.update({ user_id: 2 }, {
            where: { id: 2 }
        });

        console.log(`Updated ${updated} record(s).`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fixData();
