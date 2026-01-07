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
    profilo_nome_completo: { type: DataTypes.STRING }, // Check this field too
    tipo_abbonamento_nome: { type: DataTypes.STRING },
    data_inizio: { type: DataTypes.DATE },
    data_scadenza: { type: DataTypes.DATE },
    stato: { type: DataTypes.STRING },
    attivo: { type: DataTypes.BOOLEAN }
});

const ProfiloCoworker = sequelize.define('ProfiloCoworker', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    first_name: { type: DataTypes.STRING },
    last_name: { type: DataTypes.STRING }
});

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const userID = 2; // Michelangelo Pavia

        // Check ProfiloCoworker
        const pc = await ProfiloCoworker.findOne({ where: { user_id: userID } });
        console.log(`ProfiloCoworker for user 2:`, pc ? pc.dataValues : 'Not found');

        // Check Abbonamento by Profilo ID if found
        if (pc) {
            const subsPC = await AbbonamentoUtente.findAll({ where: { profilo_coworker_id: pc.id } });
            console.log(`Found ${subsPC.length} subscriptions for ProfiloCoworker ID ${pc.id}`);
        }

        // List ALL active subscriptions to see who they belong to
        const allSubs = await AbbonamentoUtente.findAll({
            where: { stato: 'attivo' },
            limit: 10
        });
        console.log(`\nAll Active Subscriptions Sample:`);
        allSubs.forEach(s => {
            console.log(`- Sub ID ${s.id}: UserID=${s.user_id}, ProfiloID=${s.profilo_coworker_id}, Name=${s.profilo_nome_completo}, Type=${s.tipo_abbonamento_nome}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
