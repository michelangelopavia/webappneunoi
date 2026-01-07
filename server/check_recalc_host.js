const { TurnoHost } = require('./models');
const { calculateNEU } = require('./utils/neu_calculator');

async function checkRecalc() {
    try {
        const turni = await TurnoHost.findAll();
        let m = 0, s = 0, e = 0, tot = 0;

        turni.forEach(t => {
            const d = new Date(t.data_inizio);
            if (d.getFullYear() === 2025) {
                const res = calculateNEU(t.data_inizio, t.data_fine);
                m += res.oreStandard * 2.5;
                s += res.oreSerali * 4;
                e += res.oreExtra * 6;
                tot += res.neuTotali;
            }
        });

        console.log('Recalculated 2025:');
        console.log(`Mattina: ${m}`);
        console.log(`Sera: ${s}`);
        console.log(`Extra: ${e}`);
        console.log(`Total: ${tot}`);
    } catch (err) { console.error(err); }
    finally { process.exit(); }
}
checkRecalc();
