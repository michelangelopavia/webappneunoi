const { OrdineCoworking } = require('./models');
const sequelize = require('./database');

async function inspectOrdersLink() {
    try {
        await sequelize.authenticate();

        console.log('--- ORDERS FOR USER 23 / PROFILE 223 ---');
        const ordersUser = await OrdineCoworking.findAll({ where: { user_id: 23 } });
        const ordersProfile = await OrdineCoworking.findAll({ where: { profilo_coworker_id: 223 } });

        console.log(`Found ${ordersUser.length} orders by User ID 23`);

        console.log(`Found ${ordersProfile.length} orders by Profile ID 223`);
        ordersProfile.forEach(o => console.log(`[Profile Match] ID: ${o.id}, UserID: ${o.user_id}, Total: ${o.totale}, Date: ${o.data_ordine}`));

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectOrdersLink();
