const models = require('./models');
const { Op } = require('sequelize');

async function findDuplicates() {
    const allTrans = await models.TransazioneNEU.findAll({
        order: [['data_transazione', 'ASC']]
    });

    console.log(`Checking ${allTrans.length} transactions for potential duplicates...`);

    const seen = new Set();
    const duplicates = [];

    allTrans.forEach(t => {
        // Create a key based on attributes that should be unique-ish
        const key = `${t.da_utente_id}-${t.a_utente_id}-${t.importo}-${new Date(t.data_transazione).toISOString()}-${t.tipo}-${t.causale}`;
        if (seen.has(key)) {
            duplicates.push(t);
        } else {
            seen.add(key);
        }
    });

    console.log(`Found ${duplicates.length} potential duplicates.`);
    if (duplicates.length > 0) {
        console.log('Sample duplicates:');
        duplicates.slice(0, 5).forEach(d => {
            console.log(`ID: ${d.id}, User: ${d.da_utente_id}->${d.a_utente_id}, Amount: ${d.importo}, Date: ${d.data_transazione}, Causale: ${d.causale}`);
        });
    }

    // Check for "pieno" import artifacts
    const pienoTrans = allTrans.filter(t => t.causale?.includes('Importato'));
    console.log(`Transactions with "Importato" in causale: ${pienoTrans.length}`);
}

findDuplicates().catch(console.error);
