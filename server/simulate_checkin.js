
const { ProfiloCoworker, User } = require('./models');

async function simulateCheckIn() {
    const email = 'admin@neu.noi';
    console.log(`Simulating check-in for: ${email}`);

    // 1. Simulating filter
    const existing = await ProfiloCoworker.findAll({ where: { email } });
    console.log('Filter result length:', existing.length);

    if (existing.length > 0) {
        console.log('Error: Profile already exists (Simulated Toast)');
        return;
    }

    // 2. Simulating create
    try {
        const newProfile = await ProfiloCoworker.create({
            first_name: 'Michelangelo',
            last_name: 'Pavia',
            email: email,
            genere: 'maschio',
            data_nascita: '1980-01-01',
            citta_residenza: 'Palermo',
            privacy_accettata: true,
            data_accettazione_privacy: new Date().toISOString(),
            user_id: 1,
            stato: 'iscritto'
        });
        console.log('Successfully created profile:', newProfile.id);
    } catch (err) {
        console.error('Create failed:', err.message);
        if (err.errors) {
            err.errors.forEach(e => console.log('Validation error:', e.message, e.path));
        }
    }
}

simulateCheckIn();
