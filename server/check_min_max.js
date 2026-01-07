const { TurnoHost } = require('./models');

async function checkMinMax() {
    try {
        const min = await TurnoHost.min('data_inizio');
        const max = await TurnoHost.max('data_inizio');
        console.log(`Min: ${min}, Max: ${max}`);

        const count = await TurnoHost.count();
        console.log(`Total count: ${count}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkMinMax();
