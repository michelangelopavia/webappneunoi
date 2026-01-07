const sequelize = require('./server/database');
const m = require('./server/models');

async function migrate() {
    try {
        await sequelize.sync();
        console.log('Database synced');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
migrate();
