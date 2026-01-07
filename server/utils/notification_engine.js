const { AbbonamentoUtente, TipoAbbonamento, User, NotificaAbbonamento } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

async function processNotifications() {
    console.log('[NOTIFICATION ENGINE] Starting check...');
    try {
        const today = new Date();
        const activeSubs = await AbbonamentoUtente.findAll({
            where: {
                attivo: true,
                stato: 'attivo',
                data_inizio: { [Op.lte]: today },
                data_scadenza: { [Op.gte]: today }
            },
            include: [{ model: TipoAbbonamento, as: 'TipoAbbonamento' }]
        });

        console.log(`[NOTIFICATION ENGINE] Checking ${activeSubs.length} active subscriptions`);

        for (const sub of activeSubs) {
            const tipo = sub.TipoAbbonamento;
            if (!tipo) continue;

            const user = await User.findByPk(sub.user_id);
            if (!user || !user.email) continue;

            let updatedInviate = sub.notifiche_inviate || { scadenza: [], ingressi: [], ore: [] };
            let needsUpdate = false;

            // 1. Check Expiry
            if (tipo.notifiche_scadenza && Array.isArray(tipo.notifiche_scadenza)) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expiry = new Date(sub.data_scadenza);
                expiry.setHours(0, 0, 0, 0);

                const diffTime = expiry - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                for (const notif of tipo.notifiche_scadenza) {
                    const soglia = parseInt(notif.giorni);
                    if (diffDays <= soglia && diffDays > 0 && !updatedInviate.scadenza?.includes(soglia)) {
                        await sendNotifEmail(user, sub, notif.testo, 'scadenza', { giorni_rimanenti: diffDays });
                        updatedInviate.scadenza = [...(updatedInviate.scadenza || []), soglia];
                        needsUpdate = true;
                    }
                }
            }

            // 2. Check Remaining Entries
            if (tipo.notifiche_ingressi && Array.isArray(tipo.notifiche_ingressi) && sub.ingressi_totali > 0) {
                const rimasti = sub.ingressi_totali - sub.ingressi_usati;
                for (const notif of tipo.notifiche_ingressi) {
                    const soglia = parseInt(notif.soglia);
                    if (rimasti <= soglia && rimasti >= 0 && !updatedInviate.ingressi?.includes(soglia)) {
                        await sendNotifEmail(user, sub, notif.testo, 'ingressi', { ingressi_rimanenti: rimasti });
                        updatedInviate.ingressi = [...(updatedInviate.ingressi || []), soglia];
                        needsUpdate = true;
                    }
                }
            }

            // 3. Check Remaining Ore Sale
            if (tipo.notifiche_ore && Array.isArray(tipo.notifiche_ore) && sub.ore_sale_totali > 0) {
                const rimaste = sub.ore_sale_totali - sub.ore_sale_usate;
                for (const notif of tipo.notifiche_ore) {
                    const soglia = parseFloat(notif.soglia);
                    if (rimaste <= soglia && rimaste >= 0 && !updatedInviate.ore?.includes(soglia)) {
                        await sendNotifEmail(user, sub, notif.testo, 'ore', { ore_rimanenti: rimaste });
                        updatedInviate.ore = [...(updatedInviate.ore || []), soglia];
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                await sub.update({ notifiche_inviate: updatedInviate });
            }
        }
        console.log('[NOTIFICATION ENGINE] Check completed.');
    } catch (error) {
        console.error('[NOTIFICATION ENGINE] ERROR:', error);
    }
}

async function sendNotifEmail(user, sub, template, tipo, vars) {
    let testo = template;
    testo = testo.replace(/{nome_utente}/g, user.full_name);
    testo = testo.replace(/{nome_abbonamento}/g, sub.tipo_abbonamento_nome || 'Abbonamento');
    testo = testo.replace(/{data_scadenza}/g, new Date(sub.data_scadenza).toLocaleDateString('it-IT'));

    if (vars.giorni_rimanenti !== undefined) testo = testo.replace(/{giorni_rimanenti}/g, vars.giorni_rimanenti);
    if (vars.ingressi_rimanenti !== undefined) testo = testo.replace(/{ingressi_rimanenti}/g, vars.ingressi_rimanenti);
    if (vars.ore_rimanenti !== undefined) testo = testo.replace(/{ore_rimanenti}/g, vars.ore_rimanenti);

    const htmlEmail = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Work Sans', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background-color: #053c5e; padding: 30px 20px; text-align: center; border-bottom: 4px solid #db222a; }
            .header img { height: 60px; }
            .content { padding: 40px 30px; color: #333; line-height: 1.6; }
            .footer { background-color: #053c5e; color: white; padding: 20px; text-align: center; font-size: 14px; border-top: 4px solid #db222a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/neunoi-prod/public/6948101ec07ecbe73edb9edc/c79cf77cd_neunoi_logo_bianco.png" alt="neu [nòi]">
            </div>
            <div class="content">
              ${testo.split('\n').map(p => `<p>${p}</p>`).join('')}
            </div>
            <div class="footer">
              <p>neu [nòi] spazio al lavoro APS</p>
              <p>via Alloro 64, 90133 Palermo</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Save internal notification record
    await NotificaAbbonamento.create({
        user_id: user.id,
        messaggio: testo.substring(0, 255),
        data_invio: new Date()
    });

    // Send actual email if SMTP is configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Neu Noi" <noreply@neunoi.it>',
                to: user.email,
                subject: `Notifica Abbonamento: ${sub.tipo_abbonamento_nome}`,
                html: htmlEmail
            });
            console.log(`[NOTIFICATION ENGINE] Email sent to ${user.email} for ${tipo} ${vars.giorni_rimanenti || vars.ingressi_rimanenti || vars.ore_rimanenti}`);
        } catch (err) {
            console.error('[NOTIFICATION ENGINE] Failed to send email:', err);
        }
    } else {
        console.log(`[NOTIFICATION ENGINE] SMTP not configured. Notification for ${user.email} logged but not sent.`);
    }
}

module.exports = { processNotifications };
