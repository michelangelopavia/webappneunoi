const sequelize = require('./database');
const fs = require('fs');

async function checkSchema() {
    try {
        const [results] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='ProfiloCoworkers'");
        if (results.length > 0) {
            fs.writeFileSync('schema_output.txt', results[0].sql);
        } else {
            fs.writeFileSync('schema_output.txt', "Table 'ProfiloCoworkers' not found");
        }
    } catch (e) {
        fs.writeFileSync('schema_output.txt', e.message);
    }
    process.exit(0);
}

checkSchema();
