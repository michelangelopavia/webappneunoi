const { TaskNotifica } = require('./models');
const sequelize = require('./database');

async function fixTasks() {
    try {
        const tasks = await TaskNotifica.findAll();
        for (const t of tasks) {
            let updated = false;
            if (!t.stato) {
                t.stato = 'attivo';
                updated = true;
            }
            if (!t.tipo) {
                t.tipo = 'task_manuale';
                updated = true;
            }
            if (updated) {
                await t.save();
                console.log(`Updated task #${t.id}`);
            }
        }
        console.log('Data fix completed');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

fixTasks();
