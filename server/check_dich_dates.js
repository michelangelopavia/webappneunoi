const { DichiarazioneVolontariato } = require('./models');

async function checkDichDates() {
    try {
        const d = await DichiarazioneVolontariato.findAll();
        d.forEach(x => {
            console.log(`${x.data_dichiarazione}: ${x.neu_guadagnati}`);
        });
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
checkDichDates();
