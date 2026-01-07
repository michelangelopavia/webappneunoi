
const { ProfiloCoworker } = require('./models');

async function testSort() {
    try {
        const field = 'created_date';
        console.log(`Sorting by: ${field}`);
        const items = await ProfiloCoworker.findAll({
            order: [[field, 'DESC']]
        });
        console.log('Success! Found:', items.length);
    } catch (err) {
        console.error('FAILED to sort:', err.message);
    }
}

testSort();
