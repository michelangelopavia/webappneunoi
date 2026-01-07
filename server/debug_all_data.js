
const { User, AbbonamentoUtente, ProfiloCoworker } = require('./models');
const sequelize = require('./database');
const fs = require('fs');
sequelize.options.logging = false;

async function debug() {
    let output = '';
    try {
        const allAbb = await AbbonamentoUtente.findAll();
        output += `=== Tutti gli Abbonamenti (${allAbb.length}) ===\n`;
        allAbb.forEach(a => {
            output += `- ID: ${a.id}, UserID: ${a.user_id}, Nome: ${a.profilo_nome_completo}, Tipo: ${a.tipo_abbonamento_nome}, Scadenza: ${a.data_scadenza}, Stato: ${a.stato}\n`;
        });

        const allUsers = await User.findAll();
        output += `\n=== Tutti gli Utenti (${allUsers.length}) ===\n`;
        allUsers.forEach(u => {
            output += `- ID: ${u.id}, Email: ${u.email}, Nome: ${u.full_name}\n`;
        });

        fs.writeFileSync('debug_all_data.txt', output);
        console.log('Done');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

debug();
