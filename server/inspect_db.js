
const { ProfiloCoworker } = require('./models');
const sequelize = require('./database');

async function checkProfiles() {
    try {
        const profiles = await ProfiloCoworker.findAll();
        console.log('--- ProfiloCoworker Records ---');
        profiles.forEach(p => {
            console.log(`ID: ${p.id}, Email: ${p.email}, Name: ${p.first_name} ${p.last_name}, UID: ${p.user_id}, Status: ${p.stato}`);
        });
        console.log('-------------------------------');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProfiles();
