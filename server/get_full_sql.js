const sequelize = require('./database');
const fs = require('fs');
async function check() {
    const [res] = await sequelize.query("SELECT sql FROM sqlite_master WHERE name='AbbonamentoUtentes'");
    fs.writeFileSync('table_sql.txt', res[0].sql);
    process.exit(0);
}
check();
