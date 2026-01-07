
const sequelize = require('./database');

async function checkSchema() {
    try {
        const queryInterface = sequelize.getQueryInterface();

        console.log('--- PrenotazioneSala Columns ---');
        const pCols = await queryInterface.describeTable('PrenotazioneSalas');
        console.log(Object.keys(pCols));

        console.log('\n--- AbbonamentoUtente Columns ---');
        const aCols = await queryInterface.describeTable('AbbonamentoUtentes');
        console.log(Object.keys(aCols));

        console.log('\n--- ProfiloCoworker Columns ---');
        const prCols = await queryInterface.describeTable('ProfiloCoworkers');
        console.log(Object.keys(prCols));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
