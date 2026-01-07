const sequelize = require('./database');
const models = require('./models');

async function inspectRiccardo() {
    try {
        const riccardo = await models.ProfiloCoworker.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('first_name')),
                'riccardo'
            )
        });

        if (!riccardo) { console.log('Riccardo not found'); return; }

        console.log(`Riccardo ID: ${riccardo.id}`);

        const subs = await models.AbbonamentoUtente.findAll({
            where: { profilo_coworker_id: riccardo.id },
            order: [['data_inizio', 'ASC']]
        });

        console.log('--- SUBSCRIPTIONS ---');
        subs.forEach(s => {
            console.log(JSON.stringify({
                id: s.id,
                name: s.tipo_abbonamento_nome,
                start: s.data_inizio,
                total: s.ingressi_totali,
                used: s.ingressi_usati,
                remaining: s.ingressi_totali - s.ingressi_usati
            }));
        });

        const ingressi = await models.IngressoCoworking.findAll({
            where: { profilo_coworker_id: riccardo.id, tipo_ingresso: 'carnet' },
            order: [['data_ingresso', 'ASC']]
        });

        console.log(`--- INGRESSI (${ingressi.length}) ---`);
        ingressi.forEach(i => {
            console.log(`${i.data_ingresso.toISOString().split('T')[0]} - ${i.durata} - Consumed: ${i.ingressi_consumati}`);
        });

    } catch (e) {
        console.error(e);
    }
}
inspectRiccardo();
