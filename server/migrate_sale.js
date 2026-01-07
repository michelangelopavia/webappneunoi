const sequelize = require('./database');
const { SalaRiunioni } = require('./models');

async function migrate() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('SalaRiunionis');

        if (!tableInfo.descrizione) {
            await queryInterface.addColumn('SalaRiunionis', 'descrizione', { type: require('sequelize').DataTypes.TEXT });
            console.log('Added descrizione to SalaRiunionis');
        }
        if (!tableInfo.colore) {
            await queryInterface.addColumn('SalaRiunionis', 'colore', { type: require('sequelize').DataTypes.STRING });
            console.log('Added colore to SalaRiunionis');
        }
        if (!tableInfo.tipi_utilizzo) {
            await queryInterface.addColumn('SalaRiunionis', 'tipi_utilizzo', { type: require('sequelize').DataTypes.JSON });
            console.log('Added tipi_utilizzo to SalaRiunionis');
        }
        if (!tableInfo.solo_staff) {
            await queryInterface.addColumn('SalaRiunionis', 'solo_staff', { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: false });
            console.log('Added solo_staff to SalaRiunionis');
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
