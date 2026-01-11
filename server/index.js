const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const sequelize = require('./database');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error(`Caught exception: ${err}\n` + `Exception origin: ${origin}`);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
    'https://app.neunoi.it',
    'https://neunoi.it',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any neunoi.it subdomain or railway.app domain
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 ||
            origin.includes('neunoi.it') ||
            origin.includes('railway.app');

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.log('CORS Blocked for origin:', origin);
            return callback(new Error('CORS not allowed'), false);
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/coworking', require('./routes/coworking'));

app.get('/api/backup-database-neunoi', (req, res) => {
    const dbPath = process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite');
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, `backup_database_${new Date().toISOString().split('T')[0]}.sqlite`);
    } else {
        res.status(404).send('File database non trovato sul server');
    }
});

app.post('/api/users/:id/recalc', async (req, res) => {
    try {
        const { id } = req.params;
        const { safeRecalcUser } = require('./utils/safe_recalc');
        const result = await safeRecalcUser(id);
        if (!result) return res.status(404).json({ error: 'User not found' });
        res.json(result);
    } catch (e) {
        console.error('[RECALC-USER] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/run-safe-recalc-neunoi', async (req, res) => {
    try {
        const { User } = require('./models');
        const { safeRecalcUser } = require('./utils/safe_recalc');
        console.log('[RECALC] Starting safe balance recalculation...');
        const users = await User.findAll();
        const results = [];
        let count = 0;

        for (const user of users) {
            const result = await safeRecalcUser(user.id);
            results.push(result);
            count++;
        }

        res.send(`<h1>Ricalcolo Completo</h1><p>Processati ${count} utenti.</p><pre>${JSON.stringify(results, null, 2)}</pre>`);
    } catch (e) {
        console.error('[RECALC] Error:', e);
        res.status(500).send(`<h1>Errore</h1><pre>${e.message}</pre>`);
    }
});

app.get('/api/run-migration-neunoi', async (req, res) => {
    try {
        const { OrdineCoworking } = require('./models');
        const sequelize = require('./database');
        const { DataTypes } = require('sequelize');

        console.log('[MIGRATION] Starting migration via URL...');
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('OrdineCoworkings');

        if (!tableInfo.numero_ricevuta) {
            await queryInterface.addColumn('OrdineCoworkings', 'numero_ricevuta', {
                type: DataTypes.INTEGER,
                allowNull: true
            });
            console.log('[MIGRATION] Column added.');
        }

        const orders = await OrdineCoworking.findAll({ order: [['data_ordine', 'ASC']] });
        const years = {};
        for (const order of orders) {
            const year = new Date(order.data_ordine).getFullYear();
            if (!years[year]) years[year] = 0;
            years[year]++;
            await order.update({ numero_ricevuta: years[year] });
        }

        res.send(`<h1>Migrazione completata!</h1><p>Aggiornati ${orders.length} ordini con la numerazione sequenziale.</p>`);
    } catch (e) {
        console.error('[MIGRATION] Error:', e);
        res.status(500).send(`<h1>Errore durante la migrazione</h1><pre>${e.message}</pre>`);
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'Neu Noi Gestione Associazione API' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
const bcrypt = require('bcryptjs');
const { User } = require('./models');

sequelize.sync({ force: false }).then(async () => {
    console.log('Database synced');

    // Seed default admin if no users exist
    const userCount = await User.count();
    if (userCount === 0) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await User.create({
            email: 'admin@neu.noi',
            password_hash: hashedPassword,
            full_name: 'Admin NEU',
            role: 'super_admin',
            roles: ['super_admin', 'admin', 'socio'],
            saldo_neu: 0
        });
        console.log('Default admin created: admin@neu.noi / password123');
    }

    // Seed "Altro" Ambito if missing
    const { AmbitoVolontariato } = require('./models');
    const altroAmbito = await AmbitoVolontariato.findOne({ where: { nome: 'Altro' } });
    if (!altroAmbito) {
        await AmbitoVolontariato.create({
            nome: 'Altro',
            descrizione: 'Ambito generico per attività non categorizzate',
            attivo: true
        });
        console.log('Ambito "Altro" created');
    }

    // Seed default settings
    const { SistemaSetting } = require('./models');
    const checkinMail = await SistemaSetting.findOne({ where: { chiave: 'testo_mail_checkin' } });
    if (!checkinMail) {
        await SistemaSetting.create({
            chiave: 'testo_mail_checkin',
            valore: 'Gentile {nome},\n\nBenvenuto/a in neu [nòi]! Siamo felici di averti con noi oggi.\n\nIl tuo check-in è stato registrato correttamente.\n\nBuon lavoro!',
            descrizione: 'Testo della mail inviata al check-in. Usa {nome} per il nome completo.'
        });
        console.log('Default check-in email setting created');
    }

    const { processNotifications } = require('./utils/notification_engine');

    // Run notification check on startup
    processNotifications();

    // Run every 12 hours
    setInterval(processNotifications, 12 * 60 * 60 * 1000);

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
