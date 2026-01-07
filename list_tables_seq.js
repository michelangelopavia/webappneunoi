const sequelize = require('./server/database');

async function check() {
    try {
        const tables = await sequelize.getQueryInterface().showAllTables();
        console.log(tables);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
