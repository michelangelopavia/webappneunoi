const sequelize = require('./database');

async function migrate() {
    try {
        console.log('Starting migration to add missing columns to IngressoCoworkings...');

        const queryInterface = sequelize.getQueryInterface();

        const columns = [
            { name: 'profilo_coworker_id', type: 'INTEGER' },
            { name: 'profilo_nome_completo', type: 'TEXT' },
            { name: 'abbonamento_id', type: 'INTEGER' },
            { name: 'tipo_ingresso', type: 'TEXT' },
            { name: 'durata', type: 'TEXT' },
            { name: 'ingressi_consumati', type: 'REAL' },
            { name: 'registrato_da', type: 'INTEGER' }
        ];

        for (const col of columns) {
            try {
                await sequelize.query(`ALTER TABLE IngressoCoworkings ADD COLUMN ${col.name} ${col.type};`);
                console.log(`Added column ${col.name}`);
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log(`Column ${col.name} already exists. Skipping.`);
                } else {
                    console.error(`Error adding column ${col.name}:`, error.message);
                }
            }
        }

        console.log('Migration completed.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
