const models = require('./models');
const { Op } = require('sequelize');

async function compareHostCalculations() {
    const year = 2025;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const turni = await models.TurnoHost.findAll({
        where: { data_inizio: { [Op.between]: [start, end] } }
    });

    const festivita = {
        2024: ['2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25', '2024-05-01', '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'],
        2025: ['2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26']
    };

    let totalFrontend = 0;
    let totalDB = 0;

    turni.forEach(t => {
        totalDB += (t.neu_guadagnati || 0);

        const inizio = new Date(t.data_inizio);
        const fine = new Date(t.data_fine);
        if (isNaN(inizio) || isNaN(fine) || fine <= inizio) return;

        let h_standard = 0, h_serale = 0, h_weekend = 0;
        let curr = new Date(inizio);
        while (curr < fine) {
            const day = curr.getDay();
            const isWeekend = day === 0 || day === 6;
            const dStr = curr.toISOString().split('T')[0];
            const isFest = festivita[curr.getFullYear()]?.includes(dStr);
            const hDec = curr.getHours() + curr.getMinutes() / 60;

            const step = 60000;
            const next = new Date(curr.getTime() + step);
            const actualNext = next > fine ? fine : next;
            const orePezzo = (actualNext - curr) / 3600000;

            if (isWeekend || isFest) {
                h_weekend += orePezzo * 6;
            } else {
                if (hDec >= 9 && hDec < 18.5) {
                    h_standard += orePezzo * 2.5;
                } else if (hDec >= 18.5 && hDec < 20.5) {
                    h_serale += orePezzo * 4;
                } else {
                    h_weekend += orePezzo * 6;
                }
            }
            curr = next;
        }
        totalFrontend += (h_standard + h_serale + h_weekend);
    });

    console.log(`TOTAL DB NEU for ${year}: ${totalDB}`);
    console.log(`TOTAL FE NEU for ${year}: ${totalFrontend}`);
}

compareHostCalculations().catch(console.error);
