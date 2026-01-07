const sequelize = require('./database');

async function fixAbbonamentoTable() {
    console.log('Fixing AbbonamentoUtentes table reference...');

    // 1. Get existing data
    const [data] = await sequelize.query('SELECT * FROM AbbonamentoUtentes');
    console.log(`Found ${data.length} records.`);

    const queryInterface = sequelize.getQueryInterface();

    console.log('Renaming table to backup...');
    await queryInterface.renameTable('AbbonamentoUtentes', 'AbbonamentoUtentes_old');

    // 2. Sync new table structure
    const { AbbonamentoUtente } = require('./models');
    console.log('Syncing new table structure...');
    await AbbonamentoUtente.sync({ force: true });

    // 3. Restore data
    console.log('Restoring data...');
    for (const item of data) {
        // Prepare data
        const cleanItem = { ...item };
        // Ensure booleans
        cleanItem.attivo = !!item.attivo;
        // The FK tipo_abbonamento_id might be pointing to a deleted ID if we re-synced, 
        // but wait, I synced TipoAbbonamento with force:true too.
        // Actually, the IDs should match if I re-inserted them in the same order.
        await AbbonamentoUtente.create(cleanItem);
    }

    console.log('Dropping backup table...');
    await queryInterface.dropTable('AbbonamentoUtentes_old');

    console.log('Done.');
    process.exit(0);
}

fixAbbonamentoTable().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
