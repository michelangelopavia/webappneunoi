const { OrdineCoworking } = require('./models');
const sequelize = require('./database');
const { Op } = require('sequelize');

async function migrate() {
    try {
        console.log('Starting migration to add numero_ricevuta...');

        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('OrdineCoworkings');

        if (!tableInfo.numero_ricevuta) {
            await queryInterface.addColumn('OrdineCoworkings', 'numero_ricevuta', {
                type: require('sequelize').DataTypes.INTEGER,
                allowNull: true
            });
            console.log('Column numero_ricevuta added.');
        } else {
            console.log('Column numero_ricevuta already exists.');
        }

        // Optional: Populate existing orders with sequential numbers per year
        const orders = await OrdineCoworking.findAll({
            order: [['data_ordine', 'ASC']]
        });

        const years = {};
        for (const order of orders) {
            const year = new Date(order.data_ordine).getFullYear();
            if (!years[year]) years[year] = 0;
            years[year]++;

            await order.update({ numero_ricevuta: years[year] });
        }

        console.log(`Populated ${orders.length} orders with sequential numbers.`);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
