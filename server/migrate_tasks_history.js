const sequelize = require('./database');
const { DataTypes } = require('sequelize');

async function migrate() {
    const queryInterface = sequelize.getQueryInterface();

    console.log('Starting migration for TaskNotifica storico and motivo_abbandono...');

    const tableInfo = await queryInterface.describeTable('TaskNotificas');

    if (!tableInfo['motivo_abbandono']) {
        console.log('Adding motivo_abbandono to TaskNotificas...');
        await queryInterface.addColumn('TaskNotificas', 'motivo_abbandono', {
            type: DataTypes.TEXT,
            allowNull: true
        });
    }

    if (!tableInfo['storico']) {
        console.log('Adding storico to TaskNotificas...');
        await queryInterface.addColumn('TaskNotificas', 'storico', {
            type: DataTypes.JSON,
            allowNull: true
        });
    }

    if (!tableInfo['is_collettivo']) {
        console.log('Adding is_collettivo to TaskNotificas...');
        await queryInterface.addColumn('TaskNotificas', 'is_collettivo', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        });
    }

    console.log('Migration complete!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
