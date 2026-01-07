const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function fixPasswords() {
    try {
        const users = await User.findAll();
        let fixed = 0;

        for (const user of users) {
            if (user.password_hash && !user.password_hash.startsWith('$2')) {
                console.log(`Hashing password for: ${user.email}`);
                const hashed = await bcrypt.hash(user.password_hash, 10);
                await user.update({ password_hash: hashed });
                fixed++;
            }
        }

        console.log(`Successfully fixed ${fixed} passwords.`);
        process.exit(0);
    } catch (error) {
        console.error('Error fixing passwords:', error);
        process.exit(1);
    }
}

fixPasswords();
