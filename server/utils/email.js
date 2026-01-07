const nodemailer = require('nodemailer');
const { SistemaSetting } = require('../models');

async function getTransporter() {
    // We can use environment variables as primary source, 
    // but the user wants to set it up.
    // Let's use env vars for now as per image.

    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.neunoi.it',
        port: port,
        secure: secure,
        auth: {
            user: process.env.SMTP_USER || 'coworking@neunoi.it',
            pass: process.env.SMTP_PASS || 'n3un01_5p4z104ll4v0r0',
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
}

async function sendEmail({ to, subject, text, html, attachments }) {
    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"neu [nòi]" <coworking@neunoi.it>',
            to,
            subject,
            text,
            html,
            attachments
        });
        console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[EMAIL] Error sending email:', error);
        throw error;
    }
}

function getHtmlTemplate(content) {
    const logoUrl = 'https://www.h2oh.neunoi.it/wp-content/uploads/2025/03/neunoi_logo_bianco.png';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background-color: white; }
            .header { background-color: #053c5e; padding: 30px 20px; text-align: center; border-bottom: 4px solid #db222a; }
            .header img { width: 150px; height: auto; display: inline-block; }
            .content { padding: 40px 30px; color: #333; line-height: 1.2; font-size: 16px; }
            .footer { background-color: #053c5e; color: white; padding: 25px 20px; text-align: center; font-size: 13px; border-top: 4px solid #db222a; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="neu [nòi]">
            </div>
            <div class="content">
              ${content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br>').join('')}
            </div>
            <div class="footer">
              <p><strong>neu [nòi] spazio al lavoro APS</strong></p>
              <p>via Alloro 64, 90133 Palermo</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

async function sendCheckInEmail(data) {
    try {
        const { ProfiloCoworker, User, SistemaSetting } = require('../models');
        let email = data.email || data.profilo_email;
        let nome = data.full_name || data.profilo_nome_completo || (data.first_name ? `${data.first_name} ${data.last_name}` : 'Membro');

        // Se è un ingresso, cerchiamo il profilo per avere l'email
        if (!email && data.profilo_coworker_id) {
            const profile = await ProfiloCoworker.findByPk(data.profilo_coworker_id);
            if (profile) email = profile.email;
        }

        if (!email && data.user_id) {
            const user = await User.findByPk(data.user_id);
            if (user) email = user.email;
        }

        if (!email) {
            console.log('[EMAIL] No email found for check-in notification');
            return;
        }

        const template = await SistemaSetting.findOne({ where: { chiave: 'testo_mail_checkin' } });
        let rawContent = template ? template.valore : 'Gentile {nome},\n\nBenvenuto/a in neu [nòi]! Siamo felici di averti con noi oggi.\n\nIl tuo check-in è stato registrato correttamente.\n\nBuon lavoro!';

        // Personalizzazione base
        const finalContent = rawContent.replace(/{nome}/g, nome);

        await sendEmail({
            to: email,
            subject: 'Benvenuto in neu [nòi] - Check-in completato',
            html: getHtmlTemplate(finalContent)
        });
    } catch (error) {
        console.error('[EMAIL] Failed to send check-in email:', error);
    }
}

module.exports = {
    sendEmail,
    sendCheckInEmail
};
