const sequelize = require('./database');
const { Op } = require('sequelize');
const models = require('./models');

async function inspectClara() {
    try {
        console.log('Inspecting Clara Failla...');

        // 1. Find Profile
        const profile = await models.ProfiloCoworker.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('first_name')),
                'clara' // Assuming 'Clara Failla'
            )
        });

        // Better: search by full string concatenation if needed, or loosely
        const profiles = await models.ProfiloCoworker.findAll();
        const clara = profiles.find(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes('clara failla'));

        if (!clara) {
            console.log('Clara Failla not found');
            return;
        }

        console.log(`Clara Profile ID: ${clara.id}`);

        // 2. Get Subscriptions
        const subs = await models.AbbonamentoUtente.findAll({
            where: {
                profilo_coworker_id: clara.id
            },
            order: [['data_inizio', 'ASC']]
        });

        console.log('\nSubscriptions:');
        subs.forEach(s => {
            console.log(`- ID ${s.id}: ${s.tipo_abbonamento_nome} (${s.data_inizio} to ${s.data_scadenza})`);
            console.log(`  Stato: ${s.stato}, Active: ${s.attivo}`);
            console.log(`  Ingressi: ${s.ingressi_usati} / ${s.ingressi_totali}`);
        });

        // 3. Get Ingressi linked to her
        const ingressi = await models.IngressoCoworking.findAll({
            where: {
                profilo_coworker_id: clara.id,
                tipo_ingresso: 'carnet'
            },
            order: [['data_ingresso', 'ASC']]
        });

        console.log(`\nIngressi Carnet (${ingressi.length}):`);
        let totalConsumed = 0;
        ingressi.forEach(i => {
            const consumati = i.ingressi_consumati || (i.durata === 'mezza_giornata' ? 0.5 : 1);
            totalConsumed += consumati;
            console.log(`- ID ${i.id}: ${i.data_ingresso} (${consumati}) -> Linked to Abb ID: ${i.abbonamento_id}`);
        });

        console.log(`\nTotal Consumed from Ingressi: ${totalConsumed}`);

    } catch (error) {
        console.error(error);
    }
}

inspectClara();
