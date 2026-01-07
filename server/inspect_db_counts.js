const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const models = {
    DichiarazioneVolontariato: sequelize.define('DichiarazioneVolontariato', { id: { type: DataTypes.INTEGER, primaryKey: true } }),
    TurnoHost: sequelize.define('TurnoHost', { id: { type: DataTypes.INTEGER, primaryKey: true } }),
    TransazioneNEU: sequelize.define('TransazioneNEU', { id: { type: DataTypes.INTEGER, primaryKey: true } }),
    ProfiloCoworker: sequelize.define('ProfiloCoworker', { id: { type: DataTypes.INTEGER, primaryKey: true } }),
    IngressoCoworking: sequelize.define('IngressoCoworking', { id: { type: DataTypes.INTEGER, primaryKey: true } }),
    AbbonamentoUtente: sequelize.define('AbbonamentoUtente', { id: { type: DataTypes.INTEGER, primaryKey: true } })
};

async function countRecords() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        for (const [name, model] of Object.entries(models)) {
            const count = await model.count();
            console.log(`${name}: ${count} records`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

countRecords();
