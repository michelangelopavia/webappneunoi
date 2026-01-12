const { User, TurnoHost, DichiarazioneVolontariato, TransazioneNEU } = require('./models');

const getExpiry = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    let startYear = (month >= 9) ? year : year - 1;
    return `${startYear + 1}-12-31`;
};

async function check() {
    const userId = 11;
    const hosts = await TurnoHost.findAll({ where: { utente_id: userId } });
    const vols = await DichiarazioneVolontariato.findAll({ where: { user_id: userId, confermato: true } });
    const transA = await TransazioneNEU.findAll({ where: { a_utente_id: userId } });
    const transDa = await TransazioneNEU.findAll({ where: { da_utente_id: userId } });

    console.log('--- ENTRATE ---');
    const buckets = {};
    const processArr = (arr, dateField, importoField) => {
        arr.forEach(item => {
            const d = item[dateField];
            const exp = getExpiry(d);
            const val = item[importoField];
            buckets[exp] = (buckets[exp] || 0) + val;
            console.log(`Entrata: ${val} del ${d.toISOString().split('T')[0]} -> Scadenza ${exp}`);
        });
    };

    processArr(hosts, 'data_inizio', 'neu_guadagnati');
    processArr(vols, 'data_dichiarazione', 'neu_guadagnati');
    processArr(transA, 'data_transazione', 'importo'); // We will fix 212 soon, for now it's here

    console.log('\nBuckets Iniziali:', buckets);

    console.log('\n--- USCITE ---');
    let spent = 0;
    transDa.forEach(t => { spent += t.importo; console.log(`Spesa: ${t.importo} del ${t.data_transazione.toISOString().split('T')[0]}`); });
    // Add 212 manually as spending for this simulation
    console.log('Spesa (Simulata 212): 100 del 2025-12-27');
    spent += 100;

    console.log('\nTotale Speso:', spent);

    const keys = Object.keys(buckets).sort();
    let remainingSpent = spent;
    for (const key of keys) {
        const available = buckets[key];
        const take = Math.min(remainingSpent, available);
        buckets[key] -= take;
        remainingSpent -= take;
        console.log(`Usati ${take} dal bucket ${key}. Residuo bucket: ${buckets[key]}`);
    }

    console.log('\nSituazione Finale:');
    console.log(buckets);
}
check();
