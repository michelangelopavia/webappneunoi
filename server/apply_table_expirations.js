const { User, TransazioneNEU } = require('./models');

async function applyTableExpirations() {
    try {
        const expirations = [
            { id: 3, name: 'Beppe Castellucci', amount: 5 },
            { id: 11, name: 'Alexandra D\'Onofrio', amount: 84.25 },
            { id: 8, name: 'Clara Failla', amount: 22.75 },
            { id: 10, name: 'Rafaela Pascoal', amount: 10 },
            { id: 15, name: 'Luisa Tuttolomondo', amount: 32 }
        ];

        console.log('--- APPLYING TABLE-BASED EXPIRATIONS ---');
        for (const exp of expirations) {
            const user = await User.findByPk(exp.id);
            if (!user) {
                console.log(`[ERROR] User ${exp.name} (ID ${exp.id}) not found!`);
                continue;
            }

            const oldBalance = user.saldo_neu || 0;
            const newBalance = Math.round(Math.max(0, oldBalance - exp.amount) * 100) / 100;

            await user.update({ saldo_neu: newBalance });
            await TransazioneNEU.create({
                da_utente_id: user.id,
                a_utente_id: null,
                importo: exp.amount,
                tipo: 'scadenza',
                causale: `Sottrazione NEU scaduti il 31/12/2025 (Rif. Tabella 28/12)`,
                data_transazione: new Date('2025-12-31T23:59:59')
            });

            console.log(`[APPLIED] ${user.full_name}: Subtracted ${exp.amount}. Balance ${oldBalance} -> ${newBalance}`);
            if (oldBalance < exp.amount) {
                console.log(`   [WARNING] User had insufficient balance (${oldBalance} < ${exp.amount}). Capped at 0.`);
            }
        }
        console.log('--- COMPLETED ---');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

applyTableExpirations();
