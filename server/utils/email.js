const nodemailer = require('nodemailer');
const { SistemaSetting } = require('../models');

async function getTransporter() {
  // Gmail configuration defaults
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  console.log(`[EMAIL-CONFIG] Connecting to ${host} on port ${port} (secure: ${secure})`);

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER || 'webapp@neunoi.it',
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
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
  console.log('[EMAIL-DEBUG] Starting Comprehensive SMTP Connection Test (v2)...');
  const results = [];

  // 0. ENV CONFIG TEST (The most important one!)
  const envHost = process.env.SMTP_HOST;
  const envPort = parseInt(process.env.SMTP_PORT);
  const envSecure = process.env.SMTP_SECURE === 'true';
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;

  if (envHost && envPort) {
    try {
      const trans = nodemailer.createTransport({
        host: envHost,
        port: envPort,
        secure: envSecure,
        auth: { user: envUser, pass: envPass },
        tls: { rejectUnauthorized: false }, // Allow self-signed certs for localhost
        connectionTimeout: 5000, greetingTimeout: 3000
      });
      await trans.verify();
      results.push({ config: `ENV Config (${envHost}:${envPort})`, success: true });
    } catch (err) {
      results.push({ config: `ENV Config (${envHost}:${envPort})`, success: false, error: err.message, code: err.code });
    }
  }

  // 1. LOCALHOST DIRECT PORT 25 (Standard cPanel internal)
  try {
    const trans = nodemailer.createTransport({
      host: 'localhost',
      port: 25,
      secure: false, // Port 25 is never implicit SSL
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000, greetingTimeout: 3000
    });
    // For localhost port 25, we often don't need auth, or we need specific auth. 
    // Trying without auth first (common for internal lattice)
    await trans.verify();
    results.push({ config: 'Localhost:25 (No Auth)', success: true });
  } catch (err) {
    // If auth required error, that's actually a success connection-wise!
    if (err.code === 'EAUTH' || err.response?.includes('Authentication required')) {
      results.push({ config: 'Localhost:25 (Auth Req)', success: true, message: 'Connected but needs auth' });
    } else {
      results.push({ config: 'Localhost:25 (No Auth)', success: false, error: err.message, code: err.code });
    }
  }

  // 2. LOCALHOST PORT 587 (Submission)
  try {
    const trans = nodemailer.createTransport({
      host: 'localhost',
      port: 587,
      secure: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000
    });
    await trans.verify();
    results.push({ config: 'Localhost:587', success: true });
  } catch (err) {
    results.push({ config: 'Localhost:587', success: false, error: err.message, code: err.code });
  }

  // 3. EXTERNAL GMAIL (Control)
  try {
    const trans = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'test', pass: 'test' },
      connectionTimeout: 5000
    });
    await trans.verify();
  } catch (err) {
    if (err.code === 'EAUTH' || err.response?.includes('Username')) {
      results.push({ config: 'External Gmail (Outbound Check)', success: true });
    } else {
      results.push({ config: 'External Gmail (Outbound Check)', success: false, error: err.message });
    }
  }

  return {
    success: results.some(r => r.success),
    details: results,
    recommendation: results.some(r => r.success) ? 'Working config found!' : 'All connection attempts failed. Firewall likely blocking ports.'
  };
}

module.exports = {
  sendEmail,
  sendCheckInEmail,
  verifySmtpConnection
};
