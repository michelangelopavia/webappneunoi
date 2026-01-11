const models = require('./models');
const { Op } = require('sequelize');

async function checkTotals() {
    const year = 2025; // Let's check 2025
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const trans = await models.TransazioneNEU.findAll({
        where: { data_transazione: { [Op.between]: [start, end] } }
    });

    const turni = await models.TurnoHost.findAll({
        where: { data_inizio: { [Op.between]: [start, end] } }
    });

    const dich = await models.DichiarazioneVolontariato.findAll({
        where: { data_dichiarazione: { [Op.between]: [start, end] } }
    });

    console.log(`--- TOTALS FOR ${year} ---`);
    console.log(`Transazoni Totali: ${trans.length}`);
    console.log(`Turni Totali: ${turni.length}`);
    console.log(`Dichiarazioni Totali: ${dich.length}`);

    const neuHostDB = turni.reduce((s, t) => s + (t.neu_guadagnati || 0), 0);
    const neuDichDB = dich.reduce((s, d) => s + (d.neu_guadagnati || 0), 0);
    const neuCompiti = trans.filter(t => t.tipo === 'compito_specifico').reduce((s, t) => s + (t.importo || 0), 0);
    const neuVoto = trans.filter(t => t.tipo === 'voto_annuale').reduce((s, t) => s + (t.importo || 0), 0);

    console.log(`NEU da Turni (DB): ${neuHostDB}`);
    console.log(`NEU da Volontariato (DB): ${neuDichDB}`);
    console.log(`NEU da Compiti Specifici: ${neuCompiti}`);
    console.log(`NEU da Voto Annuale: ${neuVoto}`);

    const scambiati = trans.filter(t => t.tipo === 'trasferimento_soci' || t.tipo === 'pagamento_associazione').reduce((s, t) => s + (t.importo || 0), 0);
    console.log(`NEU Scambiati/Spesi (DB): ${scambiati}`);

    // Check for duplicates or anomalies
    const types = {};
    trans.forEach(t => {
        types[t.tipo] = (types[t.tipo] || 0) + (t.importo || 0);
    });
    console.log('--- Types BreakDown ---');
    console.log(JSON.stringify(types, null, 2));
}

checkTotals().catch(console.error);
