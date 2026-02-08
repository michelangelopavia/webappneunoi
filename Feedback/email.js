/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure email transporter
// Use environment variables or fallback to Gmail
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

// Function to send email
async function sendEmail(to, subject, htmlContent) {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"neu [nòi]" <webapp@neunoi.it>',
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Function to verify SMTP connection (DIAGNOSTIC)
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

// Function to generate HTML template for emails
function getEmailTemplate(title, message, actionText = null, actionUrl = null) {
    // ... (Your standard template logic here, simplified for brevity but you can keep yours)
    const logoUrl = 'https://neunoi.it/wp-content/uploads/2022/03/logo-neu-noi-spazio-lavoro-condiviso.png'; // Public URL
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #E30613; }
            .header img { max-height: 60px; }
            .content { padding: 30px; }
            h1 { color: #E30613; font-size: 24px; margin-top: 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #E30613; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="neu [nòi]" />
            </div>
            <div class="content">
                <h1>${title}</h1>
                <p>${message.replace(/\n/g, '<br>')}</p>
                ${actionText && actionUrl ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Associazione di Promozione Sociale neu [nòi]. Tutti i diritti riservati.</p>
                <p>Via Ippolito Nievo 17, 00153 Roma (RM) | P.IVA 15003661005</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
  getTransporter,
  sendEmail,
  getEmailTemplate,
  verifySmtpConnection
};