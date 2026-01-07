const festivitaItaliane = {
    2024: [
        '2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25', '2024-05-01',
        '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'
    ],
    2025: [
        '2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-01',
        '2025-06-02', '2025-08-15', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26'
    ]
};

const isFestivo = (data) => {
    const anno = data.getFullYear();
    const dataStr = data.toISOString().split('T')[0];
    return festivitaItaliane[anno]?.includes(dataStr) || false;
};

/**
 * Calcola i NEU guadagnati per un turno host
 * @param {Date|string} dataInizio 
 * @param {Date|string} dataFine 
 * @returns {Object} { neuTotali, oreStandard, oreSerali, oreExtra, oreTotali }
 */
function calculateNEU(dataInizio, dataFine) {
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);

    if (isNaN(inizio) || isNaN(fine) || fine <= inizio) {
        return { neuTotali: 0, oreStandard: 0, oreSerali: 0, oreExtra: 0, oreTotali: 0 };
    }

    let oreStandard = 0;  // 9:00-18:30 lun-ven (2.5 NEU/h)
    let oreSerali = 0;    // 18:30-20:30 lun-ven (4 NEU/h)
    let oreExtra = 0;     // Weekend/festivi/altre (6 NEU/h)
    let neuTotali = 0;

    let currentTime = new Date(inizio);

    // Minute-by-minute calculation to handle overlapping windows
    while (currentTime < fine) {
        const giornoSettimana = currentTime.getDay();
        const isWeekend = giornoSettimana === 0 || giornoSettimana === 6;
        const isFest = isFestivo(currentTime);
        const ora = currentTime.getHours();
        const minuti = currentTime.getMinutes();
        const oraDecimale = ora + minuti / 60;

        const nextTime = new Date(currentTime.getTime() + 60000); // +1 minute
        const nextHourBound = nextTime > fine ? fine : nextTime;
        const minutiLavorati = (nextHourBound - currentTime) / 60000;
        const oreLavorate = minutiLavorati / 60;

        if (isWeekend || isFest) {
            oreExtra += oreLavorate;
            neuTotali += oreLavorate * 6;
        } else {
            if (oraDecimale >= 9 && oraDecimale < 18.5) {
                oreStandard += oreLavorate;
                neuTotali += oreLavorate * 2.5;
            } else if (oraDecimale >= 18.5 && oraDecimale < 20.5) {
                oreSerali += oreLavorate;
                neuTotali += oreLavorate * 4;
            } else {
                oreExtra += oreLavorate;
                neuTotali += oreLavorate * 6;
            }
        }

        currentTime = nextTime;
    }

    return {
        neuTotali: Math.round(neuTotali * 100) / 100,
        oreStandard: Math.round(oreStandard * 100) / 100,
        oreSerali: Math.round(oreSerali * 100) / 100,
        oreExtra: Math.round(oreExtra * 100) / 100,
        oreTotali: Math.round((oreStandard + oreSerali + oreExtra) * 100) / 100
    };
}

module.exports = { calculateNEU };
