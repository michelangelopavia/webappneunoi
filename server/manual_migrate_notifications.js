const sequelize = require('./database');
const { QueryInterface } = sequelize;

async function migrate() {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('TipoAbbonamentos');

    const newColumns = [
        { name: 'categoria', type: 'VARCHAR(255)' },
        { name: 'notifiche_scadenza', type: 'TEXT' }, // DataTypes.JSON in SQLite is TEXT
        { name: 'notifiche_ingressi', type: 'TEXT' },
        { name: 'notifiche_ore', type: 'TEXT' }
    ];

    for (const col of newColumns) {
        if (!tableInfo[col.name]) {
            console.log(`Adding column ${col.name} to TipoAbbonamentos...`);
            await queryInterface.addColumn('TipoAbbonamentos', col.name, {
                type: sequelize.Sequelize.JSON, // Use JSON so Sequelize knows how to handle it
                allowNull: true
            });
        }
    }

    const subInfo = await queryInterface.describeTable('AbbonamentoUtentes');
    if (!subInfo['notifiche_inviate']) {
        console.log(`Adding column notifiche_inviate to AbbonamentoUtentes...`);
        await queryInterface.addColumn('AbbonamentoUtentes', 'notifiche_inviate', {
            type: sequelize.Sequelize.JSON,
            allowNull: true
        });
    }

    console.log('Migration completed.');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
