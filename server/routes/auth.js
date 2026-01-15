const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sequelize = require('../database');
const { User, ProfiloCoworker } = require('../models');
const authMiddleware = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[LOGIN] Tentativo di accesso per: ${email}`);

        // Case-insensitive search
        const user = await User.findOne({
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
            return res.status(401).json({ error: 'Credenziali non valide' });
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
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password_hash: hashedPassword,
            full_name,
            role: 'coworker',
            roles: ['coworker'],
            tipo_utente: 'coworker',
            status: 'in_attesa'
        });

        // Auto-create or Sync ProfiloCoworker
        const existingProfile = await ProfiloCoworker.findOne({
            where: { email: email }
        });

        if (existingProfile) {
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
            await ProfiloCoworker.create({
                user_id: user.id,
                email: email,
                first_name: full_name.split(' ')[0],
                last_name: full_name.split(' ').slice(1).join(' '),
                stato: 'iscritto',
                data_compilazione: new Date()
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });
        res.json({ token, user });
    } catch (error) {
        res.status(400).json({ error: error.message });
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

        // Verifica password attuale
        const isValid = await bcrypt.compare(currentPassword, req.user.password_hash || '');
        if (!isValid) {
            return res.status(401).json({ error: 'Password attuale non corretta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await req.user.update({ password_hash: hashedPassword });

        res.json({ message: 'Password aggiornata con successo' });
    } catch (error) {
        res.status(400).json({ error: error.message });
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
