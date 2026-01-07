const { ProfiloCoworker } = require('./models');

async function updateEntities() {
    try {
        const affected = await ProfiloCoworker.update(
            { genere: 'ente giuridico' },
            {
                where: {
                    id: [42, 88] // IDs of Rewild Sicily and Neu Noi found earlier
                }
            }
        );
        console.log(`Updated ${affected[0]} profiles to 'ente giuridico'.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

updateEntities();
