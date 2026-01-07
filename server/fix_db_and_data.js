
const { User, AbbonamentoUtente, PrenotazioneSala, ProfiloCoworker } = require('./models');
const sequelize = require('./database');

async function fix() {
    try {
        console.log('--- Current Data in AbbonamentoUtente ---');
        const abbonamenti = await AbbonamentoUtente.findAll();
        for (const a of abbonamenti) {
            console.log(`ID: ${a.id}, user_id: ${a.user_id}, nome: "${a.profilo_nome_completo}"`);

            if (!a.user_id) {
                const user = await User.findOne({ where: { full_name: a.profilo_nome_completo } });
                if (user) {
                    console.log(`  -> Fixing ID ${a.id}: setting user_id to ${user.id}`);
                    await a.update({ user_id: user.id });
                } else {
                    console.log(`  -> Could not find user for "${a.profilo_nome_completo}"`);
                }
            }
        }

        console.log('\n--- Current Data in PrenotazioneSala ---');
        const bookings = await PrenotazioneSala.findAll();
        for (const b of bookings) {
            console.log(`ID: ${b.id}, user_id: ${b.user_id}, utente_nome: "${b.utente_nome}"`);
            if (!b.user_id) {
                // Try to find Michelangelo if it's likely him
                const miche = await User.findOne({ where: { full_name: 'Michelangelo Pavia' } });
                if (miche) {
                    console.log(`  -> Fixing Booking ID ${b.id}: setting user_id to ${miche.id}`);
                    await b.update({
                        user_id: miche.id,
                        utente_nome: 'Michelangelo Pavia',
                        sala_nome: 'Sala Riunioni',
                        tipo_utilizzo: 'riunione',
                        ore_credito_consumate: 6,
                        stato: 'confermata'
                    });
                }
            }
        }

        console.log('\nDone');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

fix();
