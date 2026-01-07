const { TaskNotifica } = require('./models');
const sequelize = require('./database');

async function inspectTasks() {
    try {
        const tasks = await TaskNotifica.findAll({ limit: 5 });
        console.log('--- TaskNotifica Records (first 5) ---');
        tasks.forEach(t => {
            console.log(JSON.stringify(t.toJSON(), null, 2));
        });
        console.log('--------------------------------------');

        // Check columns
        const tableInfo = await sequelize.query("PRAGMA table_info(TaskNotificas);");
        console.log('--- Columns in TaskNotificas ---');
        tableInfo[0].forEach(col => console.log(` - ${col.name} (${col.type})`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

inspectTasks();
