require('dotenv').config();
const sequelize = require('./database');
const models = require('./models');

async function testDB() {
    try {
        console.log('Testing database connection...');
        console.log('Dialect:', sequelize.getDialect());
        console.log('Database:', process.env.DB_NAME);

        await sequelize.authenticate();
        console.log('✓ Connection successful');

        console.log('\nTesting User count...');
        const userCount = await models.User.count();
        console.log('✓ User count:', userCount);

        console.log('\nTesting User findAll...');
        const users = await models.User.findAll({ limit: 1 });
        console.log('✓ Found users:', users.length);

        console.log('\nTesting ProfiloSocio findAll...');
        const profili = await models.ProfiloSocio.findAll({ limit: 1 });
        console.log('✓ Found profili:', profili.length);

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('SQL:', error.sql);
        console.error('Full error:', error);
    }
    process.exit(0);
}

testDB();
