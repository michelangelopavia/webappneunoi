const { TaskNotifica } = require('./models');

async function verify() {
    try {
        const testTask = await TaskNotifica.create({
            tipo: 'task_manuale',
            titolo: 'VERIFICA FINALE',
            destinatario_tipo: 'host',
            stato: 'attivo'
        });
        console.log('Task creato:', JSON.stringify(testTask.toJSON(), null, 2));

        if (testTask.destinatario_tipo === 'host' && testTask.stato === 'attivo') {
            console.log('✅ VERIFICA SUPERATA: Campi salvati correttamente');
        } else {
            console.log('❌ VERIFICA FALLITA: Campi mancanti o errati');
        }

        await testTask.destroy();
    } catch (e) {
        console.error('Errore:', e.message);
    } finally {
        process.exit();
    }
}

verify();
