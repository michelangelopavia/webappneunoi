
const { ProfiloCoworker } = require('./models');

async function cleanup() {
    // Delete profiles 1 and 2 which are confusing duplicates
    const deleted = await ProfiloCoworker.destroy({
        where: {
            id: [1, 2]
        }
    });
    console.log(`Deleted ${deleted} records.`);

    const remaining = await ProfiloCoworker.findAll();
    console.log('Remaining Profiles:');
    remaining.forEach(p => console.log(`- ${p.id}: ${p.email} (${p.first_name} ${p.last_name})`));
}

cleanup();
