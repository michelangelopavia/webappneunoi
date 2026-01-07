const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const AbbonamentoUtente = sequelize.define('AbbonamentoUtente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    profilo_coworker_id: { type: DataTypes.INTEGER },
    tipo_abbonamento_nome: { type: DataTypes.STRING },
    data_inizio: { type: DataTypes.DATE },
    data_scadenza: { type: DataTypes.DATE },
    stato: { type: DataTypes.STRING },
    attivo: { type: DataTypes.BOOLEAN }
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING }
});

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find Michelangelo Pavia
        const user = await User.findOne({ where: { full_name: 'Michelangelo Pavia' } });
        if (!user) {
            console.log('User "Michelangelo Pavia" not found.');
            return;
        }
        console.log(`User found: ID ${user.id}, Name: ${user.full_name}`);

        // Find subscriptions
        const subs = await AbbonamentoUtente.findAll({ where: { user_id: user.id } });
        console.log(`Found ${subs.length} subscriptions for user ID ${user.id}:`);
        subs.forEach(sub => {
            console.log(`- ID: ${sub.id}, Tipo: ${sub.tipo_abbonamento_nome}, Stato: ${sub.stato}, Scadenza: ${sub.data_scadenza}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
