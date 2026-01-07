const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const SalaRiunioni = sequelize.define('SalaRiunioni', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING },
    capienza: { type: DataTypes.INTEGER },
    tariffa_oraria: { type: DataTypes.FLOAT },
    attiva: { type: DataTypes.BOOLEAN, defaultValue: true },
    solo_staff: { type: DataTypes.BOOLEAN, defaultValue: false } // Check if this field exists or was implied
});

async function checkRooms() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const rooms = await SalaRiunioni.findAll();
        console.log(`Found ${rooms.length} rooms:`);
        rooms.forEach(r => {
            console.log(`- ID: ${r.id}, Nome: ${r.nome}, Attiva: ${r.attiva}, SoloStaff: ${r.solo_staff}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkRooms();
