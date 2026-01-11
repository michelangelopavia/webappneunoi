const models = require('./models');

async function checkEmptyTurni() {
    const turni = await models.TurnoHost.findAll({
        where: { neu_guadagnati: 0 }
    });
    console.log(`Found ${turni.length} TurnoHost records with 0 neu_guadagnati.`);
}

checkEmptyTurni().catch(console.error);
