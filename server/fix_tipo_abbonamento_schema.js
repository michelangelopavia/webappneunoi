const sequelize = require('./database');

async function fixSchema() {
    console.log('Fixing TipoAbbonamentos schema...');

    // 1. Get existing data
    const [data] = await sequelize.query('SELECT * FROM TipoAbbonamentos');
    console.log(`Found ${data.length} records.`);

    // 2. Drop and Recreate (Sequelize sync will handle it if we use force:true)
    // But we want to keep the data.

    // Better: rename, sync, copy
    const queryInterface = sequelize.getQueryInterface();

    console.log('Renaming table...');
    await queryInterface.renameTable('TipoAbbonamentos', 'TipoAbbonamentos_old');

    // 3. Sync specific model
    const { TipoAbbonamento } = require('./models');
    console.log('Syncing new table structure...');
    await TipoAbbonamento.sync({ force: true });

    // 4. Copy data back
    console.log('Restoring data...');
    for (const item of data) {
        // Prepare data: ensure JSON fields are valid objects if possible, but they are null now anyway
        const cleanItem = { ...item };
        delete cleanItem.id; // Let it auto-increment or keep it? Keeping it is better.

        // Convert 'attivo' if it's 0/1 to boolean
        cleanItem.attivo = !!item.attivo;
        cleanItem.prezzo_libero = !!item.prezzo_libero;

        // Re-insert using model to ensure correct types
        await TipoAbbonamento.create(item); // Note: syncing with force:true created a new table.
    }

    console.log('Dropping backup table...');
    await queryInterface.dropTable('TipoAbbonamentos_old');

    console.log('Done.');
    process.exit(0);
}

fixSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
