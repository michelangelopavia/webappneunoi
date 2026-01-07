const sequelize = require('./database');
const { AbbonamentoUtente, TipoAbbonamento } = require('./models');

async function fix() {
    try {
        const abbonamenti = await AbbonamentoUtente.findAll();
        const tipi = await TipoAbbonamento.findAll();
        const tipiMap = new Map(tipi.map(t => [t.id, t]));

        for (const abb of abbonamenti) {
            const tipo = tipiMap.get(abb.tipo_abbonamento_id);
            if (!tipo) continue;

            const targetOre = (tipo.ore_sale_incluse || 0) + (tipo.crediti_sala || 0);

            if ((abb.ore_sale_totali || 0) < targetOre) {
                console.log(`Fixing abbonamento ${abb.id} for ${abb.profilo_nome_completo}: setting ore_sale_totali to ${targetOre}`);
                await abb.update({ ore_sale_totali: targetOre });
            }
        }
        console.log('Finished fixing abbonamenti');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fix();
