const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const models = require('../models');
const sequelize = require('../database');
const { calculateNEU } = require('../utils/neu_calculator');
const { sendCheckInEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');

// VERSION MARKER - Updated 2026-02-08 22:00
const ENTITIES_VERSION = '2026-02-08-22:00-MYSQL-FIX';

// Test route to verify version
router.get('/version-check', (req, res) => {
    res.json({ version: ENTITIES_VERSION, timestamp: new Date().toISOString() });
});

// Generic handler middleware to get model
const getModel = (req, res, next) => {
    const { modelName } = req.params;
    const Model = models[modelName];
    if (!Model) {
        return res.status(404).json({ error: `Model ${modelName} not found` });
    }
    req.Model = Model;
    next();
};

// Middleware di autorizzazione e controllo accesso dati
const checkPermissions = (req, res, next) => {
    try {
        const { modelName } = req.params;
        const user = req.user;

        // MySQL stores JSON as string, SQLite as object - normalize it
        let roles = user?.roles || [user?.role];
        if (typeof roles === 'string') {
            try {
                roles = JSON.parse(roles);
            } catch {
                roles = [roles];
            }
        }
        if (!Array.isArray(roles)) {
            roles = [roles];
        }

        const isAdminOrHost = roles.some(r => ['admin', 'super_admin', 'host'].includes(r));

        // 1. Modelli sensibili accessibili solo ad Admin/Host
        const sensitiveModels = ['User', 'TransazioneNEU', 'OrdineCoworking', 'AbbonamentoUtente', 'SistemaSetting', 'AzioneVolontariato', 'AmbitoVolontariato', 'DichiarazioneVolontariato', 'IngressoCoworking', 'PrenotazioneSala'];

        if (sensitiveModels.includes(modelName) && !isAdminOrHost) {
            // Modelli che i soci possono LEGGERE liberamente (per dropdown e info)
            const memberReadModels = ['AzioneVolontariato', 'AmbitoVolontariato'];
            if (memberReadModels.includes(modelName) && (req.method === 'GET' || req.path.endsWith('/list') || req.path.endsWith('/filter'))) {
                return next();
            }

            // Eccezione: l'utente può accedere ai PROPRI dati
            const userOwnedModels = ['User', 'OrdineCoworking', 'AbbonamentoUtente', 'TransazioneNEU', 'DichiarazioneVolontariato', 'IngressoCoworking', 'PrenotazioneSala'];

            if (userOwnedModels.includes(modelName)) {
                // 1a. LIST (lista generica): Forziamo il filtraggio per evitare leak di altri utenti
                if (req.path.endsWith('/list')) {
                    // Per la lista semplice, non possiamo iniettare filtri facilmente in req.body
                    // perché Sequelize findAll non legge il body. Dobbiamo fallire e forzare l'uso di /filter
                    // EXCEPTION: Se è Transaction, permettiamo solo se l'utente è coinvolto?
                    // In realtà, il frontend usa .list() che chiama /list.
                    // Correggiamo: permettiamo il list ma il controller dovrà filtrare (o usiamo filter nel frontend)
                    // Per ora, convertiamo il list in un filter-like check se possibile?
                    // No, blocchiamo il list e assicuriamoci che il frontend usi filter (mieiNEU lo fa per i turni?)
                    // AGGIORNAMENTO: Permettiamo il passaggio ma logghiamo? No, meglio bloccare.
                    return res.status(403).json({ error: `Per motivi di sicurezza, usa il filtro (filter) per accedere ai tuoi dati di ${modelName}.` });
                }

                // 1b. FILTER: Iniettiamo il vincolo di proprietà
                if (req.path.endsWith('/filter')) {
                    if (modelName === 'TransazioneNEU') {
                        req.body[Op.or] = [{ da_utente_id: user.id }, { a_utente_id: user.id }];
                    } else {
                        const filterKey = (modelName === 'User') ? 'id' : 'user_id';
                        req.body[filterKey] = user.id;
                    }
                    return next();
                }

                // 1c. POST (Creazione): Forziamo l'utente corrente come proprietario
                if (req.method === 'POST') {
                    if (modelName === 'TransazioneNEU') {
                        req.body.da_utente_id = user.id;
                    } else if (modelName !== 'User') {
                        req.body.user_id = user.id;
                    }
                    return next();
                }

                // 1d. GET/PATCH/DELETE singolo: Verifichiamo la proprietà nel controller (passiamo avanti)
                if (req.params.id) {
                    return next();
                }
            }

            // Se non è prevista un'eccezione, blocchiamo
            return res.status(403).json({ error: `Accesso negato al modello ${modelName}.` });
        }

        // 2. Protezione Campi Sensibili (Mass Assignment)
        if (['POST', 'PATCH', 'PUT'].includes(req.method) && !isAdminOrHost) {
            let restrictedFields = ['role', 'roles', 'saldo_neu', 'status', 'neu_guadagnati', 'approvata', 'confermato', 'email', 'user_id', 'numero_ricevuta'];

            // Se l'utente sta creando una propria risorsa (es. Volontariato), 
            // non dobbiamo cancellargli il user_id perché serve al controller, 
            // ma ci assicuriamo che sia il SUO (già fatto sopra nel punto 1c)
            const userOwnedModels = ['User', 'OrdineCoworking', 'AbbonamentoUtente', 'TransazioneNEU', 'DichiarazioneVolontariato'];
            if (req.method === 'POST' && userOwnedModels.includes(modelName)) {
                restrictedFields = restrictedFields.filter(f => f !== 'user_id');
            }

            restrictedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    delete req.body[field];
                }
            });
        }

        next();
    } catch (error) {
        console.error('[checkPermissions ERROR]', error);
        res.status(500).json({ error: 'Permission check failed', details: error.message });
    }
};

// Route pubblica per ProfiloCoworker (Guest Check-in)
router.post('/ProfiloCoworker/filter', (req, res, next) => {
    // Se l'utente è autenticato, lasciamo che se ne occupi la rotta standard sotto
    if (req.headers.authorization) {
        return next('route');
    }
    next();
}, async (req, res, next) => {
    // Limited public access for check-in: only allow searching by email
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email richiesta per ricerca profilo.' });
    }
    const keys = Object.keys(req.body).filter(k => !k.startsWith('_'));
    if (keys.length > 1 || keys[0] !== 'email') {
        return res.status(403).json({ error: 'Filtri non autorizzati per accesso pubblico.' });
    }
    req.params.modelName = 'ProfiloCoworker';
    next();
}, getModel, async (req, res) => {
    try {
        const items = await req.Model.findAll({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), req.body.email.toLowerCase().trim()),
            limit: 1,
            attributes: ['id', 'first_name', 'last_name', 'email'] // Don't leak too much
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/ProfiloCoworker', (req, res, next) => {
    req.params.modelName = 'ProfiloCoworker';
    next();
}, getModel, async (req, res) => {
    // Handler identico al create generico ma senza auth per il primo inserimento
    // (In realtà il socio/coworker viene creato dall'host di solito, 
    // ma supportiamo l'auto-compilazione del profilo)
    try {
        const data = { ...req.body };

        // Collega automaticamente all'utente se l'email esiste già
        if (!data.user_id && data.email) {
            const user = await models.User.findOne({ where: { email: data.email.toLowerCase().trim() } });
            if (user) data.user_id = user.id;
        }

        const item = await req.Model.create(data);

        // Invia email di benvenuto (non bloccante)
        sendCheckInEmail(item).catch(e => console.error('[EMAIL-FAIL]', e));

        // Audit Log (senza utente loggato se guest)
        await logAudit({
            req,
            azione: 'create_guest_checkin',
            modello: 'ProfiloCoworker',
            riferimento_id: item.id,
            dati_nuovi: item
        });

        res.json(item);
    } catch (error) {
        console.error('[CHECKIN-ERROR]', error);
        res.status(400).json({ error: error.message || 'Errore durante la creazione del profilo' });
    }
});

// Tutte le altre rotte richiedono autenticazione
router.use(authMiddleware);

// LIST /api/entities/:modelName/list
router.get('/:modelName/list', getModel, checkPermissions, async (req, res) => {
    try {
        const { sort, limit, offset, include } = req.query;
        const options = {};

        if (sort) {
            const desc = sort.startsWith('-');
            let field = desc ? sort.substring(1) : sort;
            if (field === 'created_date') field = 'createdAt';
            options.order = [[field, desc ? 'DESC' : 'ASC']];
        }
        if (limit) options.limit = parseInt(limit);
        if (offset) options.offset = parseInt(offset);

        // Disable include=all for MySQL - it causes issues with foreign keys
        const sequelize = require('../database');
        if (include === 'all' && sequelize.getDialect() !== 'mysql') {
            options.include = { all: true };
        }

        const items = await req.Model.findAll(options);
        res.json(items);
    } catch (error) {
        console.error(`[ENTITIES-LIST-ERROR] Model: ${req.params.modelName}`, error);
        res.status(500).json({ error: 'Something went wrong!', details: error.message, sql: error.sql });
    }
});

// FILTER /api/entities/:modelName/filter
router.post('/:modelName/filter', getModel, checkPermissions, async (req, res) => {
    try {
        const { sort, limit, offset, include } = req.query;
        const parseFilters = (filters) => {
            const newFilters = {};
            for (const key in filters) {
                if (key === '_or') {
                    newFilters[Op.or] = filters[key].map(parseFilters);
                    continue;
                }
                if (key === '_and') {
                    newFilters[Op.and] = filters[key].map(parseFilters);
                    continue;
                }

                const value = filters[key];
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const newObj = {};
                    let hasOps = false;
                    for (const opKey in value) {
                        if (opKey === '_like') { newObj[Op.like] = value[opKey]; hasOps = true; }
                        else if (opKey === '_ilike') { newObj[Op.like] = value[opKey]; hasOps = true; }
                        else if (opKey === '_gt') { newObj[Op.gt] = value[opKey]; hasOps = true; }
                        else if (opKey === '_gte') { newObj[Op.gte] = value[opKey]; hasOps = true; }
                        else if (opKey === '_lt') { newObj[Op.lt] = value[opKey]; hasOps = true; }
                        else if (opKey === '_lte') { newObj[Op.lte] = value[opKey]; hasOps = true; }
                        else if (opKey === '_ne') { newObj[Op.ne] = value[opKey]; hasOps = true; }
                        else if (opKey === '_in') { newObj[Op.in] = value[opKey]; hasOps = true; }
                        else { newObj[opKey] = value[opKey]; }
                    }
                    if (hasOps) { newFilters[key] = newObj; }
                    else { newFilters[key] = parseFilters(value); }
                } else {
                    newFilters[key] = value;
                }
            }
            return newFilters;
        };

        const whereClause = parseFilters(req.body);
        const options = { where: whereClause };

        if (sort) {
            const desc = sort.startsWith('-');
            let field = desc ? sort.substring(1) : sort;
            if (field === 'created_date') field = 'createdAt';
            options.order = [[field, desc ? 'DESC' : 'ASC']];
        }
        if (limit) options.limit = parseInt(limit);
        if (offset) options.offset = parseInt(offset);

        // Disable include=all for MySQL - it causes issues with foreign keys
        const sequelize = require('../database');
        if (include === 'all' && sequelize.getDialect() !== 'mysql') {
            options.include = { all: true };
        }

        const items = await req.Model.findAll(options);
        res.json(items);
    } catch (error) {
        console.error(`[ENTITIES-FILTER-ERROR] Model: ${req.params.modelName}`, error);
        res.status(500).json({ error: 'Something went wrong!', details: error.message, sql: error.sql });
    }
});

// GET /api/entities/:modelName/:id
router.get('/:modelName/:id', getModel, checkPermissions, async (req, res) => {
    try {
        const { include } = req.query;
        const options = {};
        if (include === 'all') options.include = { all: true };
        const item = await req.Model.findByPk(req.params.id, options);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Verifica proprietà finale per utenti non admin
        const roles = req.user.roles || [req.user.role];
        const isAdminOrHost = roles.some(r => ['admin', 'super_admin', 'host'].includes(r));
        const { modelName } = req.params;
        const isOwner = (modelName === 'User' && item.id === req.user.id) ||
            (item.user_id && item.user_id === req.user.id) ||
            (item.utente_id && item.utente_id === req.user.id) ||
            (modelName === 'TransazioneNEU' && (item.da_utente_id === req.user.id || item.a_utente_id === req.user.id));

        if (!isAdminOrHost && !isOwner) {
            return res.status(403).json({ error: 'Accesso negato a risorsa di un altro utente.' });
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/entities/:modelName
router.post('/:modelName', getModel, checkPermissions, async (req, res) => {
    try {
        const { modelName } = req.params;
        const data = { ...req.body };

        // Helper for robust name-based matching
        const matchUserByName = async (name) => {
            if (!name) return null;
            const nameToMatch = name.trim().toLowerCase();
            let user = await models.User.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('full_name')), nameToMatch)
            });
            if (user) return user.id;

            const parts = nameToMatch.split(/\s+/);
            if (parts.length >= 2) {
                const cmd1 = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
                const cmd2 = `${parts.slice(1).join(' ')} ${parts[0]}`;
                for (const cand of [cmd1, cmd2]) {
                    user = await models.User.findOne({
                        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('full_name')), cand)
                    });
                    if (user) return user.id;
                }
            }
            return null;
        };

        const matchAmbitoByName = async (name) => {
            if (!name) return null;
            const item = await models.AmbitoVolontariato.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('nome')), name.trim().toLowerCase())
            });
            return item ? item.id : null;
        };

        const matchProfiloCoworkerByEmail = async (email) => {
            if (!email) return null;
            return await models.ProfiloCoworker.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.trim().toLowerCase())
            });
        };

        const matchTipoAbbonamentoByName = async (name) => {
            if (!name) return null;
            return await models.TipoAbbonamento.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('nome')), name.trim().toLowerCase())
            });
        };

        // --- Special Logic for DichiarazioneVolontariato ---
        if (modelName === 'DichiarazioneVolontariato') {
            // INTEGRATED SMART MATCH
            if (!data.user_id && data.utente_nome) {
                data.user_id = await matchUserByName(data.utente_nome);
            }
            if (!data.ambito_id && data.ambito_nome) {
                data.ambito_id = await matchAmbitoByName(data.ambito_nome);
            }

            const { user_id, azione_id } = data;
            let neuEarned = 0;
            let causale = 'Volontariato generico';

            if (azione_id) {
                const action = await models.AzioneVolontariato.findByPk(azione_id);
                if (!action) throw new Error('Azione di volontariato non trovata');
                neuEarned = action.valore_neu;
                causale = `Volontariato: ${action.titolo}`;
            }

            if (!user_id) throw new Error('Utente non identificato');
            const user = await models.User.findByPk(user_id);
            if (!user) throw new Error('Utente non trovato');

            const item = await req.Model.create({
                ...data,
                neu_guadagnati: neuEarned,
                confermato: true
            });

            if (neuEarned > 0) {
                await models.TransazioneNEU.create({
                    da_utente_id: null,
                    a_utente_id: user_id,
                    importo: neuEarned,
                    tipo: 'volontariato',
                    causale: causale,
                    data_transazione: data.data_dichiarazione || new Date().toISOString(),
                    riferimento_dichiarazione_id: item.id
                });
            }

            const { safeRecalcUser } = require('../utils/safe_recalc');
            await safeRecalcUser(user_id);
            return res.json(item);
        }

        // --- Default creation for other entities ---
        const dataToInsert = { ...data };

        // ID fields cleanup: strictly validate and normalize
        Object.keys(dataToInsert).forEach(key => {
            if (key.endsWith('_id') || key === 'id') {
                let val = dataToInsert[key];
                if (typeof val === 'string') val = val.trim();

                if (val === '' || val === null || val === undefined) {
                    dataToInsert[key] = null;
                } else {
                    const num = Number(val);
                    if (!isNaN(num) && val !== '' && num !== 0) {
                        dataToInsert[key] = num;
                    } else {
                        dataToInsert[key] = null;
                    }
                }
            }
        });

        if (modelName === 'User' && dataToInsert.password_hash && !dataToInsert.password_hash.startsWith('$2')) {
            dataToInsert.password_hash = await bcrypt.hash(dataToInsert.password_hash, 10);
        }

        if (['ProfiloSocio', 'ProfiloCoworker'].includes(modelName) && !dataToInsert.user_id && dataToInsert.email) {
            const user = await models.User.findOne({ where: { email: dataToInsert.email } });
            if (user) dataToInsert.user_id = user.id;
        }

        if (modelName === 'AbbonamentoUtente') {
            if (!dataToInsert.profilo_coworker_id && dataToInsert.email) {
                const p = await matchProfiloCoworkerByEmail(dataToInsert.email);
                if (p) {
                    dataToInsert.profilo_coworker_id = p.id;
                    if (!dataToInsert.user_id) dataToInsert.user_id = p.user_id;
                }
            }
        }

        if (modelName === 'OrdineCoworking') {
            const orderDate = dataToInsert.data_ordine ? new Date(dataToInsert.data_ordine) : new Date();
            const yearStart = new Date(orderDate.getFullYear(), 0, 1);
            const yearEnd = new Date(orderDate.getFullYear(), 11, 31, 23, 59, 59);
            const lastOrder = await models.OrdineCoworking.findOne({
                where: { data_ordine: { [Op.between]: [yearStart, yearEnd] } },
                order: [['numero_ricevuta', 'DESC']]
            });
            dataToInsert.numero_ricevuta = lastOrder && lastOrder.numero_ricevuta ? lastOrder.numero_ricevuta + 1 : 1;
        }

        if (modelName === 'TurnoHost' && dataToInsert.data_inizio && dataToInsert.data_fine) {
            const stats = calculateNEU(dataToInsert.data_inizio, dataToInsert.data_fine);
            if (!dataToInsert.ore_lavorate) dataToInsert.ore_lavorate = stats.oreTotali;
            if (!dataToInsert.neu_guadagnati && dataToInsert.utente_id) {
                const user = await models.User.findByPk(dataToInsert.utente_id);
                const isAssoc = user && (user.role === 'associazione' || (user.roles && user.roles.includes('associazione')));
                dataToInsert.neu_guadagnati = isAssoc ? 0 : stats.neuTotali;
            }
        }

        const item = await req.Model.create(dataToInsert);

        // Post-creation hooks
        if (modelName === 'TurnoHost' && item.utente_id && item.neu_guadagnati > 0) {
            const user = await models.User.findByPk(item.utente_id);
            if (user) await user.update({ saldo_neu: (user.saldo_neu || 0) + item.neu_guadagnati });
        }

        if (modelName === 'TransazioneNEU' && item.importo > 0) {
            const { safeRecalcUser } = require('../utils/safe_recalc');
            if (item.da_utente_id) await safeRecalcUser(item.da_utente_id);
            if (item.a_utente_id) await safeRecalcUser(item.a_utente_id);
        }

        if (['ProfiloCoworker', 'IngressoCoworking'].includes(modelName)) sendCheckInEmail(item);

        // Audit Log
        await logAudit({
            req,
            azione: 'create',
            modello: modelName,
            riferimento_id: item.id,
            dati_nuovi: item
        });

        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/entities/:modelName/:id
router.patch('/:modelName/:id', getModel, checkPermissions, async (req, res) => {
    try {
        const { modelName, id } = req.params;
        const item = await req.Model.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Verifica proprietà per utenti non admin
        const roles = req.user.roles || [req.user.role];
        const isAdminOrHost = roles.some(r => ['admin', 'super_admin', 'host'].includes(r));

        const isOwner = (modelName === 'User' && item.id === req.user.id) ||
            (item.user_id && item.user_id === req.user.id) ||
            (item.utente_id && item.utente_id === req.user.id);

        if (!isAdminOrHost && !isOwner) {
            return res.status(403).json({ error: 'Accesso negato: non puoi modificare risorse di altri utenti.' });
        }

        const oldData = { ...item.toJSON() };

        if (modelName === 'DichiarazioneVolontariato') {
            const userId = req.body.user_id || item.user_id;
            await item.update(req.body);
            const trans = await models.TransazioneNEU.findOne({ where: { riferimento_dichiarazione_id: id } });
            if (trans) {
                await trans.update({
                    importo: item.neu_guadagnati,
                    a_utente_id: item.user_id,
                    data_transazione: item.data_dichiarazione || item.createdAt
                });
            } else if (item.neu_guadagnati > 0) {
                await models.TransazioneNEU.create({
                    da_utente_id: null,
                    a_utente_id: item.user_id,
                    importo: item.neu_guadagnati,
                    tipo: 'volontariato',
                    causale: `Volontariato (Rettifica)`,
                    data_transazione: item.data_dichiarazione || item.createdAt,
                    riferimento_dichiarazione_id: item.id
                });
            }
            const { safeRecalcUser } = require('../utils/safe_recalc');
            await safeRecalcUser(userId);

            const reloaded = await item.reload();
            await logAudit({
                req,
                azione: 'update',
                modello: modelName,
                riferimento_id: id,
                dati_precedenti: oldData,
                dati_nuovi: reloaded
            });
            return res.json(reloaded);
        }

        await item.update(req.body);
        await logAudit({
            req,
            azione: 'update',
            modello: modelName,
            riferimento_id: id,
            dati_precedenti: oldData,
            dati_nuovi: item
        });
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/entities/:modelName/:id
router.delete('/:modelName/:id', getModel, checkPermissions, async (req, res) => {
    try {
        const { modelName, id } = req.params;
        const item = await req.Model.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Verifica proprietà per utenti non admin
        const roles = req.user.roles || [req.user.role];
        const isAdminOrHost = roles.some(r => ['admin', 'super_admin', 'host'].includes(r));

        const isOwner = (modelName === 'User' && item.id === req.user.id) ||
            (item.user_id && item.user_id === req.user.id) ||
            (item.utente_id && item.utente_id === req.user.id);

        if (!isAdminOrHost && !isOwner) {
            return res.status(403).json({ error: 'Accesso negato: non puoi eliminare risorse di altri utenti.' });
        }

        const usersToSync = [];
        if (item.user_id) usersToSync.push(item.user_id);
        if (item.utente_id) usersToSync.push(item.utente_id);
        if (item.da_utente_id) usersToSync.push(item.da_utente_id);
        if (item.a_utente_id) usersToSync.push(item.a_utente_id);

        if (modelName === 'DichiarazioneVolontariato') {
            await models.TransazioneNEU.destroy({ where: { riferimento_dichiarazione_id: id } });
        }

        // --- GESTIONE CASCATA MANUALE PER USER (Evita Foreign Key Constraints) ---
        if (modelName === 'User') {
            console.log(`[DELETE] Eliminazione a cascata per utente ID: ${id}`);

            // 1. Elimina profili collegati
            await models.ProfiloSocio.destroy({ where: { user_id: id } });
            // Per il ProfiloCoworker, lo scolleghiamo dall'utente invece di eliminarlo,
            // così manteniamo lo storico dei check-in ma l'utente "account" sparisce.
            await models.ProfiloCoworker.update({ user_id: null, stato: 'ospite' }, { where: { user_id: id } });

            // 2. Elimina transazioni se sono di test (o scollega se critiche)
            // Tipicamente per un'app di gestione, se elimini l'utente elimini le sue transazioni NEU libere
            await models.TransazioneNEU.destroy({ where: { [Op.or]: [{ da_utente_id: id }, { a_utente_id: id }] } });

            // 3. Elimina altri dati proprietari
            await models.AbbonamentoUtente.destroy({ where: { user_id: id } });
            await models.OrdineCoworking.destroy({ where: { user_id: id } });
            await models.IngressoCoworking.destroy({ where: { user_id: id } });
            await models.PrenotazioneSala.destroy({ where: { user_id: id } });
            await models.DichiarazioneVolontariato.destroy({ where: { user_id: id } });
            await models.TaskNotifica.destroy({ where: { assegnatario_id: id } });
            await models.TurnoHost.destroy({ where: { utente_id: id } });
        }

        const oldData = { ...item.toJSON() };
        await item.destroy();

        await logAudit({
            req,
            azione: 'delete',
            modello: modelName,
            riferimento_id: id,
            dati_precedenti: oldData
        });

        if (usersToSync.length > 0 && modelName !== 'User') {
            const { safeRecalcUser } = require('../utils/safe_recalc');
            for (const uid of [...new Set(usersToSync)]) {
                if (uid !== parseInt(id)) { // Non ricalcolare se l'utente non esiste più
                    await safeRecalcUser(uid);
                }
            }
        }
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
