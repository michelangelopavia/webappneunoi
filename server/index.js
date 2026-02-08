const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const sequelize = require('./database');
const models = require('./models');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error(`Caught exception: ${err}\n` + `Exception origin: ${origin}`);
});

const app = express();

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
}
app.set('trust proxy', 1); // Trust Railway implementation
const PORT = process.env.PORT || 3000;
const helmet = require('helmet');

if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set! Using default secret is insecure for production.');
}
const rateLimit = require('express-rate-limit');

// Basic Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*", "http://*"],
            connectSrc: ["'self'", "https://*", "http://*"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Auth Middleware and Admin Check for index.js routes
const authMiddleware = require('./middleware/auth');
const adminOnly = (req, res, next) => {
    const roles = req.user?.roles || [req.user?.role];
    if (roles.some(r => ['admin', 'super_admin'].includes(r))) {
        return next();
    }
    res.status(403).json({ error: 'Accesso negato. Solo amministratori.' });
};

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

// Rate limiters for specific routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 register/forgot-password requests per hour
    message: 'Too many accounts created from this IP, please try again after an hour.'
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.'
});

// Routes
app.use('/auth/login', loginLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/forgot-password', authLimiter);

app.use('/auth', require('./routes/auth'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/coworking', require('./routes/coworking'));

// Multer for DB restoration
const multer = require('multer');
const upload = multer({ dest: 'uploads/temp/' });

app.post('/api/admin/restore-db', authMiddleware, adminOnly, upload.single('database'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

        const dbPath = process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite');
        const tempPath = req.file.path;

        console.log(`[RESTORE] Tentativo ripristino DB da: ${tempPath} a ${dbPath}`);

        // Robust close/replace
        await sequelize.close();

        // Backup current (just in case)
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, `${dbPath}.bak`);
        }

        // Replace
        fs.copyFileSync(tempPath, dbPath);
        fs.unlinkSync(tempPath);

        // Re-open
        await sequelize.authenticate();

        console.log('[RESTORE] Database ripristinato con successo');
        res.json({ message: 'Database ripristinato. Il server potrebbe necessitare di un riavvio per ricaricare tutti i dati.' });

        // Trigger exit to let Process Manager (Railway) restart it with new data connection
        setTimeout(() => process.exit(0), 1000);

    } catch (e) {
        console.error('[RESTORE] Errore critico:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/test-email-connection', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { verifySmtpConnection } = require('./utils/email');
        const result = await verifySmtpConnection();

        res.json({
            timestamp: new Date().toISOString(),
            debug_info: {
                host: process.env.SMTP_HOST || 'using-default',
                port: process.env.SMTP_PORT || 'using-default',
                secure_env_value: process.env.SMTP_SECURE,
                user: process.env.SMTP_USER || 'using-default'
            },
            connection_result: result
        });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

app.get('/api/backup-database-neunoi', authMiddleware, adminOnly, (req, res) => {
    const dbPath = process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite');
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, `backup_database_${new Date().toISOString().split('T')[0]}.sqlite`);
    } else {
        res.status(404).send('File database non trovato sul server');
    }
});

app.post('/api/users/:id/recalc', authMiddleware, adminOnly, async (req, res) => {
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

app.get('/api/run-safe-recalc-neunoi', authMiddleware, adminOnly, async (req, res) => {
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

app.get('/api/run-migration-neunoi', (req, res, next) => {
    // In local development, bypass auth and admin checks to allow browser-trigger
    if (process.env.NODE_ENV !== 'production') return next();
    return authMiddleware(req, res, (err) => {
        if (err) return next(err);
        adminOnly(req, res, next);
    });
}, async (req, res) => {
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

        // 2. Verifica utenti esistenti (Email Verification Migration)
        const { User } = require('./models');
        const { logAudit } = require('./utils/audit');
        const updatedUsersCount = await User.update(
            { email_verified: true },
            { where: { email_verified: false } }
        );

        await logAudit({
            req,
            azione: 'migration_verify_existing_users',
            modello: 'User',
            riferimento_id: 0,
            dati_nuovi: { count: updatedUsersCount[0] }
        });

        res.send(`<h1>Migrazione completata!</h1>
            <p>Aggiornati ${orders.length} ordini con la numerazione sequenziale.</p>
            <p>Verificati ${updatedUsersCount[0]} utenti esistenti.</p>`);
    } catch (e) {
        console.error('[MIGRATION] Error:', e);
        res.status(500).send(`<h1>Errore durante la migrazione</h1><pre>${e.message}</pre>`);
    }
});

app.get('/api/system-diag', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { User, AbbonamentoUtente, OrdineCoworking, ProfiloSocio, ProfiloCoworker, TransazioneNEU } = require('./models');
        const counts = {
            users: await User.count().catch(() => -1),
            subscriptions: await AbbonamentoUtente.count().catch(() => -1),
            orders: await OrdineCoworking.count().catch(() => -1),
            soci: await ProfiloSocio.count().catch(() => -1),
            coworkers: await ProfiloCoworker.count().catch(() => -1),
            transactions: await TransazioneNEU.count().catch(() => -1)
        };

        res.json({
            status: 'online',
            db_dialect: sequelize.getDialect(),
            db_host: process.env.DB_HOST || 'localhost',
            db_name: process.env.DB_NAME || 'not set',
            db_storage_env: process.env.DB_STORAGE || 'not set',
            counts,
            env: process.env.NODE_ENV,
            time: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Public diagnostic endpoint (no auth required)
app.get('/api/health', async (req, res) => {
    try {
        const { User } = require('./models');
        const userCount = await User.count();

        res.json({
            status: 'ok',
            database: {
                dialect: sequelize.getDialect(),
                host: process.env.DB_HOST || 'not set',
                name: process.env.DB_NAME || 'not set',
                user: process.env.DB_USER || 'not set'
            },
            counts: {
                users: userCount
            },
            env: {
                NODE_ENV: process.env.NODE_ENV,
                DB_DIALECT: process.env.DB_DIALECT || 'not set'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            stack: error.stack
        });
    }
});

// Temporary diagnostic route to debug MySQL issues
app.get('/api/test-db', async (req, res) => {
    const results = [];
    try {
        results.push({ step: 'Connection info', dialect: sequelize.getDialect(), database: process.env.DB_NAME });

        await sequelize.authenticate();
        results.push({ step: 'Authenticate', status: 'success' });

        const userCount = await models.User.count();
        results.push({ step: 'User.count()', status: 'success', count: userCount });

        const users = await models.User.findAll({ limit: 1 });
        results.push({ step: 'User.findAll(limit:1)', status: 'success', found: users.length });

        const profili = await models.ProfiloSocio.findAll({ limit: 1 });
        results.push({ step: 'ProfiloSocio.findAll(limit:1)', status: 'success', found: profili.length });

        res.json({ success: true, results });
    } catch (error) {
        results.push({
            step: 'ERROR',
            message: error.message,
            sql: error.sql,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        res.status(500).json({ success: false, results, fullError: error.toString() });
    }
});

app.get('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.json({ message: 'Neu Noi Gestione Associazione API (Dev Mode)' });
    });
}

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

    console.log(`[DB] Using dialect: ${sequelize.getDialect()}`);

    // Manual SQL Migration (dialect aware)
    try {
        const dialect = sequelize.getDialect();
        if (dialect === 'sqlite') {
            const [results] = await sequelize.query("PRAGMA table_info(Users);");
            const columns = results.map(r => r.name);

            if (!columns.includes('email_verified')) {
                await sequelize.query("ALTER TABLE Users ADD COLUMN email_verified BOOLEAN DEFAULT 0;");
                console.log('[MIGRATION] Added email_verified');
            }
            if (!columns.includes('verification_token')) {
                await sequelize.query("ALTER TABLE Users ADD COLUMN verification_token TEXT;");
                console.log('[MIGRATION] Added verification_token');
            }
            if (!columns.includes('verification_token_expires')) {
                await sequelize.query("ALTER TABLE Users ADD COLUMN verification_token_expires DATETIME;");
                console.log('[MIGRATION] Added verification_token_expires');
            }
        } else if (dialect === 'mysql') {
            // MySQL usually handles migrations via sync(alter:true) or migrations, 
            // but we ensure columns exist if needed for this specific app state
            const [results] = await sequelize.query(`SHOW COLUMNS FROM Users`);
            const columns = results.map(r => r.Field);

            if (!columns.includes('email_verified')) {
                await sequelize.query("ALTER TABLE Users ADD COLUMN email_verified BOOLEAN DEFAULT 0");
            }
            // Add other columns similarly for MySQL if they were missing in the source
        }
    } catch (err) {
        console.warn('[MIGRATION] Column check/add failed:', err.message);
    }

    // Seed default admin ONLY if truly empty
    const userCount = await User.count();
    console.log(`[DB] Total users in database: ${userCount}`);

    if (userCount === 0) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await User.create({
            email: 'admin@neu.noi',
            password_hash: hashedPassword,
            full_name: 'Admin NEU',
            role: 'super_admin',
            roles: ['super_admin', 'admin', 'socio'],
            status: 'approvato',
            email_verified: true,
            saldo_neu: 0
        });
        console.log('Default admin created: admin@neu.noi / password123');
    } else {
        // Forza verifica per admin esistente se necessario (solo per sblocco locale)
        await User.update(
            { email_verified: true, status: 'approvato' },
            { where: { email: 'admin@neu.noi' } }
        );
        // Opzionale: sblocca tutti in locale se vuoi evitare noie
        if (process.env.NODE_ENV !== 'production') {
            await User.update({ email_verified: true }, { where: { email_verified: false } });
            console.log('[DEBUG] Tutti gli utenti locali sono stati segnati come verificati.');
        }
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

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }
});

module.exports = app;
