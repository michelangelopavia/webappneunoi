const sequelize = require('./database');
const models = require('./models');

async function inspectClara() {
    try {
        const clara = await models.ProfiloCoworker.findOne({
            where: { id: 43 } // We know ID is 43 from previous run
        });

        if (!clara) { console.log('Clara not found'); return; }

        const subs = await models.AbbonamentoUtente.findAll({
            where: { profiling_coworker_id: 43 }, // Wait, field is profilo_coworker_id
            where: { profilo_coworker_id: 43 },
            order: [['data_inizio', 'ASC']]
        });

        console.log('--- SUBSCRIPTIONS ---');
        subs.forEach(s => {
            console.log(JSON.stringify({
                id: s.id,
                start: s.data_inizio,
                end: s.data_scadenza,
                total: s.ingressi_totali,
                used: s.ingressi_usati,
                remaining: s.ingressi_totali - s.ingressi_usati,
                status: s.stato,
                active: s.attivo
            }));
        });

        const ingressi = await models.IngressoCoworking.findAll({
            where: { profilo_coworker_id: 43, tipo_ingresso: 'carnet' },
            order: [['data_ingresso', 'ASC']]
        });

        console.log('--- INGRESSI ---');
        ingressi.forEach(i => {
            console.log(JSON.stringify({
                id: i.id,
                date: i.data_ingresso,
                consumed: i.ingressi_consumati,
                linked_to: i.abbonamento_id
            }));
        });

    } catch (e) {
        console.error(e);
    }
}
inspectClara();
