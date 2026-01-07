const { User } = require('./models');

async function checkNames() {
    try {
        const names = [
            'Michelangelo Pavia',
            'Beppe Castellucci',
            'Giulia Geraci',
            'Rosa Guagliardo',
            'Andrea Foschini',
            'Riccardo Buccheri',
            'Alexandra D\'Onofrio',
            'Clara Failla',
            'Giada Saguto',
            'Simone Di Giovanni',
            'Rafaela Pascoal',
            'Lucrezia Mannino',
            'Flavia Arato',
            'Barbara Moavero',
            'Luisa Tuttolomondo',
            'Giuseppe Mazzola',
            'Helen Hecker',
            'Martina Consolo',
            'Amrita Mishra',
            'Antonio Marchi'
        ];
        for (const name of names) {
            const user = await User.findOne({ where: { full_name: name } });
            if (user) {
                console.log(`${name}: ID ${user.id}, Saldo ${user.saldo_neu}`);
            } else {
                console.log(`${name}: NOT FOUND`);
            }
        }
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
checkNames();
