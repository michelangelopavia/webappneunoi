const { User } = require('./models');

async function checkID5() {
    try {
        const user = await User.findByPk(5);
        console.log(`User ID 5 is: ${user.full_name}`);
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
checkID5();
