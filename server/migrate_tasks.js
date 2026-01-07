const sequelize = require('./database');

async function migrate() {
    try {
        const [results] = await sequelize.query("PRAGMA table_info(TaskNotificas)");
        const columns = results.map(r => r.name);

        const newColumns = [
            { name: 'tipo', type: 'TEXT' },
            { name: 'creato_da_id', type: 'INTEGER' },
            { name: 'creato_da_nome', type: 'TEXT' },
            { name: 'destinatario_id', type: 'INTEGER' },
            { name: 'destinatario_nome', type: 'TEXT' },
            { name: 'destinatario_tipo', type: 'TEXT' },
            { name: 'data_inizio', type: 'TEXT' },
            { name: 'data_fine', type: 'TEXT' },
            { name: 'priorita', type: 'TEXT' },
            { name: 'stato', type: 'TEXT' },
            { name: 'completato_da_id', type: 'INTEGER' },
            { name: 'completato_da_nome', type: 'TEXT' },
            { name: 'data_completamento', type: 'TEXT' },
            { name: 'riferimento_abbonamento_id', type: 'INTEGER' }
        ];

        for (const col of newColumns) {
            if (!columns.includes(col.name)) {
                console.log(`Adding ${col.name} to TaskNotificas...`);
                try {
                    await sequelize.query(`ALTER TABLE TaskNotificas ADD COLUMN ${col.name} ${col.type};`);
                } catch (e) {
                    console.error(`Failed to add ${col.name}:`, e.message);
                }
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }

        console.log('TaskNotifica migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
