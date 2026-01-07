const { OrdineCoworking } = require('./models');
const sequelize = require('./database');

async function fixOrdersLink() {
    try {
        await sequelize.authenticate();
        
        // Target: User 23, Profile 223
        const result = await OrdineCoworking.update(
            { user_id: 23 },
            { 
                where: { 
                    profilo_coworker_id: 223,
                    user_id: null 
                } 
            }
        );

        console.log(`Updated ${result[0]} orders to link to User 23.`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fixOrdersLink();
