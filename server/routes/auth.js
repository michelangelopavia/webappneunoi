const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sequelize = require('../database');
const { User, ProfiloCoworker } = require('../models');
const authMiddleware = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[LOGIN] Tentativo di accesso per: ${email}`);

        // Case-insensitive search
        const user = await User.scope('withPassword').findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                email.toLowerCase().trim()
            )
        });

        if (!user) {
            console.warn(`[LOGIN] Utente non trovato: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Since we are migrating, we might not have passwords. 
        // If password_hash is null, we might allow login or require password reset.
        // For now, let's assume a simple check or a default password for migrated users?
        // Let's implement standard check:
        const isValid = await bcrypt.compare(password, user.password_hash || '');
        console.log(`[LOGIN] Utente trovato: ${user.full_name}, Validazione password: ${isValid}`);

        if (!isValid) {
            console.warn(`[LOGIN] Password errata per: ${email}`);
            await logAudit({
                req,
                azione: 'failed_login',
                modello: 'User',
                riferimento_id: user.id,
                dati_nuovi: { email }
            });
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        // Verifica se l'email è verificata
        if (!user.email_verified) {
            console.warn(`[LOGIN] Email non verificata per: ${email}`);
            return res.status(403).json({
                error: 'Devi verificare il tuo indirizzo email prima di poter accedere. Controlla la tua casella di posta.',
                requires_verification: true
            });
        }

        // Verifica stato approvazione
        if (user.status !== 'approvato') {
            console.warn(`[LOGIN] Utente non approvato: ${email} (Stato: ${user.status})`);
            const statusMessages = {
                'in_attesa': 'Il tuo account è in attesa di approvazione da parte di un amministratore.',
                'sospeso': 'Il tuo account è stato sospeso. Contatta l\'amministrazione.'
            };
            return res.status(403).json({
                error: statusMessages[user.status] || 'Accesso non autorizzato'
            });
        }

        console.log(`[LOGIN] Accesso autorizzato per: ${email}`);

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });

        await logAudit({
            req,
            azione: 'login',
            modello: 'User',
            riferimento_id: user.id
        });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
    res.json(req.user);
});

// POST /auth/register (Simple version)
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        console.log(`[AUTH-REG] Tentativo registrazione per: ${email}`);

        // Password Complexity Check
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            console.log(`[AUTH-REG] Password non valida per: ${email}`);
            return res.status(400).json({ error: 'La password deve contenere almeno 8 caratteri, tra cui almeno una lettera e un numero.' });
        }

        const existingUser = await User.scope('withPassword').findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.toLowerCase().trim())
        });

        if (existingUser) {
            console.log(`[AUTH-REG] Utente già esistente: ${email}`);
            if (existingUser.email_verified) {
                return res.status(400).json({ error: 'Questo indirizzo email è già registrato e verificato. Prova ad accedere.' });
            }

            // Se non è verificato, rigeneriamo il token e rinviamo la mail
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await existingUser.update({
                verification_token: verificationToken,
                verification_token_expires: verificationTokenExpires
            });

            console.log(`[AUTH-REG] Rinviata mail di verifica a: ${email}`);
            return await sendVerificationAndRespond(existingUser, verificationToken, res);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

        console.log(`[AUTH-REG] Creazione nuovo utente: ${email}`);
        const user = await User.create({
            email: email.toLowerCase().trim(),
            password_hash: hashedPassword,
            full_name,
            role: 'coworker',
            roles: ['coworker'],
            tipo_utente: 'coworker',
            status: 'in_attesa',
            email_verified: false,
            verification_token: verificationToken,
            verification_token_expires: verificationTokenExpires
        });

        // Auto-create or Sync ProfiloCoworker
        const existingProfile = await ProfiloCoworker.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.toLowerCase().trim())
        });

        if (existingProfile) {
            console.log(`[AUTH-REG] ProfiloCoWorker esistente trovato per: ${email}, unione in corso...`);
            if (!existingProfile.user_id) {
                await existingProfile.update({
                    user_id: user.id,
                    stato: 'iscritto'
                });

                // ALSO LINK EXISTING SUBSCRIPTIONS AND ORDERS
                const { AbbonamentoUtente, OrdineCoworking } = require('../models');
                await AbbonamentoUtente.update(
                    { user_id: user.id },
                    { where: { profilo_coworker_id: existingProfile.id, user_id: null } }
                );
                await OrdineCoworking.update(
                    { user_id: user.id },
                    { where: { profilo_coworker_id: existingProfile.id, user_id: null } }
                );
            }
        } else {
            console.log(`[AUTH-REG] Creazione nuovo ProfiloCoWorker per: ${email}`);
            await ProfiloCoworker.create({
                user_id: user.id,
                email: email,
                first_name: full_name.split(' ')[0],
                last_name: full_name.split(' ').slice(1).join(' '),
                stato: 'iscritto',
                data_compilazione: new Date()
            });
        }

        return await sendVerificationAndRespond(user, verificationToken, res);
    } catch (error) {
        console.error('[AUTH-REG-ERROR] Errore critico:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(400).json({ error: error.message || 'Errore interno durante la registrazione' });
    }
});

// Helper per invio email verifica e risposta uniforme
function sendVerificationAndRespond(user, verificationToken, res) {
    const { sendEmail } = require('../utils/email');
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://app.neunoi.it'}/VerifyEmail?token=${verificationToken}`;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://app.neunoi.it/logo-red.png" alt="neu [nòi]" style="height: 50px;">
            </div>
            <h2 style="color: #053c5e; text-align: center;">Benvenuto in neu [nòi]!</h2>
            <p>Ciao <strong>${user.full_name}</strong>,</p>
            <p>Grazie per esserti registrato. Per attivare il tuo account e confermare la tua email, clicca sul pulsante qui sotto:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #1f7a8c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verifica il mio account</a>
            </div>
            <p style="font-size: 14px; color: #666;">Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
            <p style="font-size: 14px; color: #1f7a8c; word-break: break-all;">${verifyUrl}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Questo link scadrà tra 24 ore. Se non hai richiesto tu questa iscrizione, puoi ignorare questo messaggio.</p>
        </div>
    `;

    // Invio asincrono (non attendiamo il risultato per rispondere al client)
    sendEmail({ to: user.email, subject: 'Verifica il tuo account - neu [nòi]', html: html })
        .then(() => console.log(`[AUTH-ASYNC] Email inviata a ${user.email}`))
        .catch(err => console.error(`[AUTH-ASYNC-ERROR] Fallito invio a ${user.email}:`, err.message));

    return res.json({
        message: 'Account creato con successo! Controlla la tua casella di posta (e lo spam) per il link di verifica.',
        requires_verification: true
    });
}

// GET /auth/verify-email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token mancante' });

        const user = await User.scope('withPassword').findOne({
            where: {
                verification_token: token,
                verification_token_expires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Token non valido o scaduto' });
        }

        await user.update({
            email_verified: true,
            verification_token: null,
            verification_token_expires: null
        });

        await logAudit({
            req,
            azione: 'email_verified',
            modello: 'User',
            riferimento_id: user.id
        });

        res.json({ message: 'Email verificata con successo! Ora puoi accedere (previa approvazione admin).' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /auth/update
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { full_name, telefono } = req.body;
        await req.user.update({
            full_name: full_name || req.user.full_name,
            telefono: telefono || req.user.telefono
        });
        res.json({ message: 'Profilo aggiornato con successo', user: req.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Password Complexity Check
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: 'La nuova password deve contenere almeno 8 caratteri, tra cui almeno una lettera e un numero.' });
        }

        // Verifica password attuale
        const userWithPass = await User.scope('withPassword').findByPk(req.user.id);
        const isValid = await bcrypt.compare(currentPassword, userWithPass.password_hash || '');
        if (!isValid) {
            return res.status(401).json({ error: 'Password attuale non corretta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await req.user.update({ password_hash: hashedPassword });

        await logAudit({
            req,
            azione: 'change_password',
            modello: 'User',
            riferimento_id: req.user.id
        });

        res.json({ message: 'Password aggiornata con successo' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /auth/resend-verification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email richiesta' });

        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                email.toLowerCase().trim()
            )
        });

        if (!user) {
            // Per sicurezza non diciamo se l'utente esiste
            return res.json({ message: 'Se l\'email è presente nei nostri sistemi, riceverai un nuovo link di verifica.' });
        }

        if (user.email_verified) {
            return res.status(400).json({ error: 'Questo account è già stato verificato.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await user.update({
            verification_token: verificationToken,
            verification_token_expires: verificationTokenExpires
        });

        const { sendEmail } = require('../utils/email');
        const verifyUrl = `${process.env.FRONTEND_URL || 'https://app.neunoi.it'}/VerifyEmail?token=${verificationToken}`;

        const html = `
            <h2>Verifica il tuo account - neu [nòi]</h2>
            <p>Ciao ${user.full_name},</p>
            <p>Hai richiesto un nuovo link di verifica per il tuo account. Clicca sul link qui sotto per procedere:</p>
            <p><a href="${verifyUrl}" style="background-color: #053c5e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verifica Email</a></p>
            <p>Il link scadrà tra 24 ore.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Nuovo link di verifica account - neu [nòi]',
            html: html
        });

        await logAudit({
            req,
            azione: 'resend_verification',
            modello: 'User',
            riferimento_id: user.id
        });

        res.json({ message: 'Se l\'email è presente nei nostri sistemi, riceverai un nuovo link di verifica.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email richiesta' });

        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                email.toLowerCase()
            )
        });

        if (!user) {
            // Per sicurezza non diciamo se l'utente esiste, ma rispondiamo OK
            return res.json({ message: 'Se l\'email è presente nei nostri sistemi, riceverai le istruzioni tra pochi istanti.' });
        }

        // Genera token di reset (valido 1 ora)
        const resetToken = jwt.sign(
            { userId: user.id, purpose: 'password_reset' },
            process.env.JWT_SECRET || 'supersecret',
            { expiresIn: '1h' }
        );

        // Invia email
        const { sendEmail } = require('../utils/email');
        const resetUrl = `${process.env.FRONTEND_URL || 'https://app.neunoi.it'}/ResetPassword?token=${resetToken}`;

        const html = `
            <h2>Reset della Password - neu [nòi]</h2>
            <p>Ciao ${user.full_name},</p>
            <p>Abbiamo ricevuto una richiesta di reset della password per il tuo account.</p>
            <p>Per procedere, clicca sul link qui sotto:</p>
            <p><a href="${resetUrl}" style="background-color: #053c5e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>Se il pulsante non funziona, copia e incolla questo indirizzo nel tuo browser:</p>
            <p>${resetUrl}</p>
            <p>Il link scadrà tra un'ora.</p>
            <p>Se non hai richiesto tu il reset, ignora questa email.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Reset Password - neu [nòi]',
            html: html
        });

        res.json({ message: 'Se l\'email è presente nei nostri sistemi, riceverai le istruzioni tra pochi istanti.' });
    } catch (error) {
        console.error('[FORGOT-PASSWORD] Error:', error);
        res.status(500).json({ error: 'Errore durante l\'invio dell\'email di reset' });
    }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token e nuova password richiesti' });

        // Password Complexity Check
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: 'La nuova password deve contenere almeno 8 caratteri, tra cui almeno una lettera e un numero.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        if (decoded.purpose !== 'password_reset') throw new Error('Token non valido per il reset');

        const user = await User.findByPk(decoded.userId);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password_hash: hashedPassword });

        res.json({ message: 'Password aggiornata con successo. Ora puoi effettuare il login.' });
    } catch (error) {
        console.error('[RESET-PASSWORD] Error:', error);
        res.status(400).json({ error: 'Token scaduto o non valido' });
    }
});

// POST /auth/admin-trigger-reset (Triggered by Admin for a user)
router.post('/admin-trigger-reset', authMiddleware, async (req, res) => {
    try {
        // Check if requester is admin
        const requesterRoles = req.user.roles || [req.user.role];
        if (!requesterRoles.some(r => ['admin', 'super_admin'].includes(r))) {
            return res.status(403).json({ error: 'Accesso negato. Solo gli amministratori possono forzare il reset.' });
        }

        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'ID utente richiesto' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        // Genera token di reset (valido 1 ora)
        const resetToken = jwt.sign(
            { userId: user.id, purpose: 'password_reset' },
            process.env.JWT_SECRET || 'supersecret',
            { expiresIn: '1h' }
        );

        // Invia email
        const { sendEmail } = require('../utils/email');
        const resetUrl = `${process.env.FRONTEND_URL || 'https://app.neunoi.it'}/ResetPassword?token=${resetToken}`;

        const html = `
            <h2>Reset della Password - neu [nòi]</h2>
            <p>Ciao ${user.full_name},</p>
            <p>Un amministratore di neu [nòi] ha avviato una procedura di reset della password per il tuo account.</p>
            <p>Per impostare una nuova password, clicca sul link qui sotto:</p>
            <p><a href="${resetUrl}" style="background-color: #053c5e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>Se il pulsante non funziona, copia e incolla questo indirizzo nel tuo browser:</p>
            <p>${resetUrl}</p>
            <p>Il link scadrà tra un'ora.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Re-impostazione Password - neu [nòi]',
            html: html
        });

        res.json({ message: `Email di reset inviata con successo a ${user.email}` });
    } catch (error) {
        console.error('[ADMIN-TRIGGER-RESET] Error:', error);
        res.status(500).json({ error: 'Errore durante l\'invio dell\'email di reset' });
    }
});

module.exports = router;
