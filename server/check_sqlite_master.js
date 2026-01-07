const sequelize = require('./database');
async function check() {
    const [res] = await sequelize.query("SELECT * FROM sqlite_master WHERE sql LIKE '%TipoAbbonamentos_old%'");
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}
check();
