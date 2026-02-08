const nodemailer = require('nodemailer');
const { SistemaSetting } = require('../models');

async function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587'); // Default to 587 for better cloud compatibility
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  console.log(`[EMAIL-CONFIG] Connecting to ${process.env.SMTP_HOST || 'mail.neunoi.it'} on port ${port} (secure: ${secure})`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.neunoi.it',
    port: port,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'coworking@neunoi.it',
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    }
  });
}

async function sendEmail({ to, subject, text, html, attachments }) {
  console.log(`[EMAIL] Tentativo invio a ${to} (Oggetto: ${subject})...`);
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
    console.log(`[EMAIL] Inviata con successo a ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[EMAIL-ERROR] Dettaglio errore:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    // Riduciamo l'errore per il client ma manteniamo il codice per debug
    const diag = error.code ? ` (${error.code})` : '';
    throw new Error(`${error.message}${diag}`);
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

async function verifySmtpConnection() {
  console.log('[EMAIL-DEBUG] Starting Comprehensive SMTP Connection Test...');
  const results = [];

  const commonAuth = {
    user: process.env.SMTP_USER || 'coworking@neunoi.it',
    pass: process.env.SMTP_PASS,
  };

  // 1. NEUNOI HOSTING - Port 587
  try {
    const trans = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.neunoi.it',
      port: 587,
      secure: false,
      auth: commonAuth,
      tls: { rejectUnauthorized: false, ciphers: 'SSLv3' },
      connectionTimeout: 5000, greetingTimeout: 3000
    });
    await trans.verify();
    results.push({ config: 'Neunoi 587 (STARTTLS)', success: true });
  } catch (err) {
    results.push({ config: 'Neunoi 587 (STARTTLS)', success: false, error: err.message, code: err.code });
  }

  // 2. NEUNOI HOSTING - Port 465
  try {
    const trans = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.neunoi.it',
      port: 465,
      secure: true,
      auth: commonAuth,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000, greetingTimeout: 3000
    });
    await trans.verify();
    results.push({ config: 'Neunoi 465 (SSL)', success: true });
  } catch (err) {
    results.push({ config: 'Neunoi 465 (SSL)', success: false, error: err.message, code: err.code });
  }

  // 3. NEUNOI HOSTING - Port 2525 (Alternative)
  try {
    const trans = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.neunoi.it',
      port: 2525,
      secure: false,
      auth: commonAuth,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000, greetingTimeout: 3000
    });
    await trans.verify();
    results.push({ config: 'Neunoi 2525 (Alt)', success: true });
  } catch (err) {
    results.push({ config: 'Neunoi 2525 (Alt)', success: false, error: err.message, code: err.code });
  }

  // 4. CONTROL TEST - Gmail (to check if Railway blocks ALL outbound SMTP)
  // We expect Auth failure here, NOT Timeout. If this Timeouts, Railway is blocking output.
  try {
    const trans = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'test', pass: 'test' }, // Invalid creds
      connectionTimeout: 5000
    });
    await trans.verify();
  } catch (err) {
    // If error is AUTH related, connection worked!
    if (err.code === 'EAUTH' || err.response?.includes('Username and Password not accepted')) {
      results.push({ config: 'Global Network Check (Gmail)', success: true, message: 'Railway allows outgoing SMTP (Connection OK)' });
    } else {
      results.push({ config: 'Global Network Check (Gmail)', success: false, error: err.message, code: err.code });
    }
  }

  const success = results.some(r => r.success && !r.config.includes('Global'));

  return {
    success: success,
    details: results,
    recommendation: success ? 'Found working config!' : results.find(r => r.config.includes('Global') && r.success) ? 'Railway network is OK, but Neunoi blocks these IPs.' : 'Railway is blocking ALL outgoing SMTP.'
  };
}

module.exports = {
  sendEmail,
  sendCheckInEmail,
  verifySmtpConnection
};
