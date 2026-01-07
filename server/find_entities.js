const { ProfiloCoworker } = require('./models');
const { Op } = require('sequelize');

async function findEntities() {
    try {
        const p = await ProfiloCoworker.findAll({
            where: {
                [Op.or]: [
                    { first_name: { [Op.like]: '%Neu%' } },
                    { last_name: { [Op.like]: '%Neu%' } },
                    { first_name: { [Op.like]: '%Rewild%' } },
                    { last_name: { [Op.like]: '%Sicily%' } }
                ]
            }
        });
        console.log('--- POTENTIAL ENTITIES ---');
        p.forEach(x => {
            console.log(`ID: ${x.id}, Name: ${x.first_name} ${x.last_name}, Genere: ${x.genere}`);
        });
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
findEntities();
