const sequelize = require('./database');

async function migrate() {
    try {
        const [results] = await sequelize.query("PRAGMA table_info(ProfiloSocios)");
        const socioColumns = results.map(r => r.name);

        if (!socioColumns.includes('paese_residenza')) {
            console.log('Adding paese_residenza to ProfiloSocios...');
            await sequelize.query("ALTER TABLE ProfiloSocios ADD COLUMN paese_residenza TEXT;");
        }

        const [resultsCoworker] = await sequelize.query("PRAGMA table_info(ProfiloCoworkers)");
        const coworkerColumns = resultsCoworker.map(r => r.name);

        if (!coworkerColumns.includes('paese_residenza')) {
            console.log('Adding paese_residenza to ProfiloCoworkers...');
            await sequelize.query("ALTER TABLE ProfiloCoworkers ADD COLUMN paese_residenza TEXT;");
        }

        if (!coworkerColumns.includes('data_compilazione')) {
            console.log('Adding data_compilazione to ProfiloCoworkers...');
            await sequelize.query("ALTER TABLE ProfiloCoworkers ADD COLUMN data_compilazione DATETIME;");
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
