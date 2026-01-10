const { TaskNotifica } = require('./models');
const sequelize = require('./database');

async function run() {
    console.log('Updating existing collective tasks...');
    const tasks = await TaskNotifica.findAll({
        where: {
            destinatario_tipo: 'collettivo'
        }
    });

    for (const task of tasks) {
        if (!task.is_collettivo) {
            console.log(`Updating task: ${task.titolo}`);
            await task.update({ is_collettivo: true });
        }
    }

    console.log('Update complete!');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
