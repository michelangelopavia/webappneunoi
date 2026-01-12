require('dotenv').config();
const { sendEmail } = require('./server/utils/email');

async function test() {
    console.log('Test invio email in corso...');
    try {
        await sendEmail({
            to: 'test@example.com',
            subject: 'Test Email gestional',
            text: 'Se ricevi questa mail, il sistema SMTP funziona correttamente.'
        });
        console.log('TEST COMPLETATO: Email inviata!');
    } catch (e) {
        console.error('TEST FALLITO:', e.message);
    }
}

test();
