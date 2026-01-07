const { User, TransazioneNEU } = require('./models');

async function revert() {
    try {
        const trans = await TransazioneNEU.findAll({
            where: { causale: { [require('sequelize').Op.like]: '%Scadenza 2025%' } }
        });
        console.log(`Reverting ${trans.length} transactions...`);
        for (const t of trans) {
            const user = await User.findByPk(t.da_utente_id);
            if (user) {
                const newBalance = (user.saldo_neu || 0) + t.importo;
                await user.update({ saldo_neu: newBalance });
                console.log(`Restored ${t.importo} to ${user.full_name}. New balance: ${newBalance}`);
            }
            await t.destroy();
        }
        console.log('Revert completed.');
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
revert();
