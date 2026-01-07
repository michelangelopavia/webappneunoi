const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const models = require('../models');
const sequelize = require('../database');
const { calculateNEU } = require('../utils/neu_calculator');
const { sendCheckInEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

// Generic handler middleware to get model
const getModel = (req, res, next) => {
    const { modelName } = req.params;
    // Map URL param to Model Name (e.g. 'users' -> 'User' or exact match)
    // Base44 client sends exact entity name usually? Let's assume it sends 'ProfiloSocio' etc.
    // If the URL is /api/entities/ProfiloSocio
    const Model = models[modelName];
    if (!Model) {
        return res.status(404).json({ error: `Model ${modelName} not found` });
    }
    req.Model = Model;
    next();
};

// Protect all entity routes EXCEPT ProfiloCoworker create and filter (needed for guest check-in)
router.use((req, res, next) => {
    const isPublicCheckIn = (req.path === '/ProfiloCoworker' || req.path === '/ProfiloCoworker/filter') && (req.method === 'POST');
    // Note: /api/entities/ProfiloCoworker/filter is a POST
    // /api/entities/ProfiloCoworker is a POST

    if (isPublicCheckIn) {
        return next();
    }

    return authMiddleware(req, res, next);
});

// LIST /api/entities/:modelName/list
// Supports ?sort=-created_at&limit=10&include=all
router.get('/:modelName/list', getModel, async (req, res) => {
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

        if (include === 'all') {
            options.include = { all: true };
        }

        const items = await req.Model.findAll(options);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FILTER /api/entities/:modelName/filter (POST to accept complex filters)
// Supports ?include=all
router.post('/:modelName/filter', getModel, async (req, res) => {
    try {
        const { include } = req.query;
        // Helper to parse operators like _like, _gt, etc.
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
                    // Check for operators inside the object
                    const newObj = {};
                    let hasOps = false;
                    for (const opKey in value) {
                        if (opKey === '_like') {
                            newObj[Op.like] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_ilike') {
                            // Postgres only properly, but map to like for generic
                            // SQLite matches case-insensitive by default for LIKE usually, but Op.like is safer standard
                            newObj[Op.like] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_gt') {
                            newObj[Op.gt] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_gte') {
                            newObj[Op.gte] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_lt') {
                            newObj[Op.lt] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_lte') {
                            newObj[Op.lte] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_ne') {
                            newObj[Op.ne] = value[opKey];
                            hasOps = true;
                        } else if (opKey === '_in') {
                            newObj[Op.in] = value[opKey];
                            hasOps = true;
                        } else {
                            newObj[opKey] = value[opKey];
                        }
                    }
                    if (hasOps) {
                        newFilters[key] = newObj;
                    } else {
                        newFilters[key] = parseFilters(value); // Recursive for nested JSON?
                    }
                } else {
                    newFilters[key] = value;
                }
            }
            return newFilters;
        };

        const whereClause = parseFilters(req.body);
        const options = { where: whereClause };

        if (include === 'all') {
            options.include = { all: true };
        }

        const items = await req.Model.findAll(options);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/entities/:modelName/:id
// Supports ?include=all
router.get('/:modelName/:id', getModel, async (req, res) => {
    try {
        const { include } = req.query;
        const options = {};
        if (include === 'all') {
            options.include = { all: true };
        }
        const item = await req.Model.findByPk(req.params.id, options);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/entities/:modelName
router.post('/:modelName', getModel, async (req, res) => {
    try {
        const { modelName } = req.params;

        // Helper for robust name-based matching
        const matchUserByName = async (name) => {
            if (!name) return null;
            const nameToMatch = name.trim();

            // 1. Direct match (case-insensitive)
            let user = await models.User.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('full_name')),
                    nameToMatch.toLowerCase()
                )
            });
            if (user) return user.id;

            // 2. Try reversal logic for multiple parts
            const parts = nameToMatch.split(/\s+/);
            if (parts.length >= 2) {
                // Try moving last part to front, or first part to end
                const cmd1 = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
                const cmd2 = `${parts.slice(1).join(' ')} ${parts[0]}`;

                for (const cand of [cmd1, cmd2]) {
                    user = await models.User.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.col('full_name')),
                            cand.toLowerCase()
                        )
                    });
                    if (user) return user.id;
                }
            }
            return null;
        };

        const matchAmbitoByName = async (name) => {
            if (!name) return null;
            const item = await models.AmbitoVolontariato.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('nome')),
                    name.trim().toLowerCase()
                )
            });
            return item ? item.id : null;
        };

        const matchProfiloCoworkerByEmail = async (email) => {
            if (!email) return null;
            return await models.ProfiloCoworker.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('email')),
                    email.trim().toLowerCase()
                )
            });
        };

        const matchTipoAbbonamentoByName = async (name) => {
            if (!name) return null;
            return await models.TipoAbbonamento.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('nome')),
                    name.trim().toLowerCase()
                )
            });
        };

        // Special logic for Volunteering Declaration
        if (modelName === 'DichiarazioneVolontariato') {
            const data = { ...req.body };

            // Logic to convert anno_associativo (e.g. "2025/26") to a representative date (Oct 1st 2025)
            if (data.anno_associativo && data.anno_associativo.includes('/')) {
                const startYear = parseInt(data.anno_associativo.split('/')[0]);
                if (!isNaN(startYear)) {
                    // Set to Oct 1st of the starting year
                    data.data_dichiarazione = new Date(startYear, 9, 1);
                }
            }

            // Ensure data_dichiarazione is not empty/null to avoid 1970 issue
            if (!data.data_dichiarazione || data.data_dichiarazione === '') {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const startYear = month >= 9 ? year : year - 1;
                data.data_dichiarazione = new Date(startYear, 9, 1);
                data.anno_associativo = `${startYear}/${(startYear + 1).toString().slice(-2)}`;
            }

            // INTEGRATED SMART MATCH: find user and ambito by name if ID missing
            if (!data.user_id && data.utente_nome) {
                const matchId = await matchUserByName(data.utente_nome);
                if (matchId) {
                    console.log(`[SMART MATCH] Found user ${matchId} for declaration import`);
                    data.user_id = matchId;
                } else {
                    console.warn(`[SMART MATCH] FAILED to find user for name: "${data.utente_nome}"`);
                }
            }
            if (!data.ambito_id && data.ambito_nome) {
                const matchId = await matchAmbitoByName(data.ambito_nome);
                if (matchId) {
                    console.log(`[SMART MATCH] Found ambito ${matchId} for declaration import`);
                    data.ambito_id = matchId;
                } else {
                    console.warn(`[SMART MATCH] FAILED to find ambito for name: "${data.ambito_nome}"`);
                }
            }

            const getAssociativeYearRange = (refDate = new Date()) => {
                const date = new Date(refDate);
                const year = date.getFullYear();
                const month = date.getMonth(); // 0-indexed, 9 = October

                let startYear = (month >= 9) ? year : year - 1;
                const startDate = new Date(startYear, 9, 1, 0, 0, 0); // Oct 1st
                const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59); // Sept 30th

                return { startDate, endDate };
            };

            const { user_id, azione_id, ambito_id, ore } = data;
            let neuEarned = 0;
            let causale = 'Volontariato generico';

            if (azione_id) {
                // 1. Fetch Action Value
                const action = await models.AzioneVolontariato.findByPk(azione_id);
                if (!action) throw new Error('Azione di volontariato non trovata');
                if (!action.attivo) throw new Error('Azione di volontariato non più attiva');

                neuEarned = action.valore_neu;
                causale = `Volontariato: ${action.titolo}`;
            }

            // 2. Credit User (if NEU are earned)
            if (!user_id) throw new Error('Utente non identificato (user_id o utente_nome richiesti)');
            const user = await models.User.findByPk(user_id);
            if (!user) throw new Error('Utente non trovato');

            if (neuEarned > 0) {
                const newBalance = (user.saldo_neu || 0) + neuEarned;
                await user.update({ saldo_neu: newBalance });

                // 3. Create Transaction
                await models.TransazioneNEU.create({
                    da_utente_id: null, // From Association
                    a_utente_id: user_id,
                    importo: neuEarned,
                    tipo: 'volontariato',
                    causale: causale,
                    data_transazione: data.data_dichiarazione || new Date()
                });
            }

            // 4. Create Declaration record
            const item = await req.Model.create({
                ...data,
                neu_guadagnati: neuEarned,
                confermato: true // Auto-confirm for now
            });

            // 5. RECALCULATE Total Hours for CURRENT ASSOCIATIVE YEAR
            const { startDate, endDate } = getAssociativeYearRange();
            const allUserDeclarationsInYear = await models.DichiarazioneVolontariato.findAll({
                where: {
                    user_id: user.id,
                    confermato: true,
                    data_dichiarazione: {
                        [sequelize.Sequelize.Op.between]: [startDate, endDate]
                    }
                }
            });
            const totalHoursYear = allUserDeclarationsInYear.reduce((sum, d) => sum + (d.ore || 0), 0);
            await user.update({ ore_volontariato_anno: totalHoursYear });

            return res.json(item);
        }

        // Default creation for other entities
        console.log(`[DEBUG] Creating ${modelName}:`, req.body);

        // Final guard for empty/invalid IDs in Sequelize/SQLite
        const dataToInsert = { ...req.body };
        Object.keys(dataToInsert).forEach(key => {
            const val = dataToInsert[key];
            if (key.endsWith('_id') || key === 'id') {
                if (val === '' || val === null || val === undefined) {
                    dataToInsert[key] = null;
                } else if (!isNaN(val) && val !== '') {
                    // Valid ID number, preserve it
                    dataToInsert[key] = Number(val);
                } else {
                    // Junk data (dates, letters), nullify
                    dataToInsert[key] = null;
                }
            }

            // Support comma-separated strings for 'roles' field (JSON array)
            if (key === 'roles' && typeof val === 'string' && val.includes(',')) {
                dataToInsert[key] = val.split(',').map(r => r.trim());
            } else if (key === 'roles' && typeof val === 'string' && val.trim() !== '') {
                // Single role string to array
                dataToInsert[key] = [val.trim()];
            }
        });

        // Automatically hash password if it's a User and password_hash is provided
        if (modelName === 'User' && dataToInsert.password_hash) {
            // Check if it's already a hash (bcrypt hashes usually start with $2a$ or $2b$)
            if (!dataToInsert.password_hash.startsWith('$2')) {
                console.log(`[AUTH] Hashing plain text password for user ${dataToInsert.email}`);
                dataToInsert.password_hash = await bcrypt.hash(dataToInsert.password_hash, 10);
            }
        }

        // SMART MATCH: If creating a profile and user_id is missing, try matching by email
        if (['ProfiloSocio', 'ProfiloCoworker'].includes(modelName) && !dataToInsert.user_id && dataToInsert.email) {
            const user = await models.User.findOne({ where: { email: dataToInsert.email } });
            if (user) {
                console.log(`[SMART MATCH] Found user ${user.id} for email ${dataToInsert.email}`);
                dataToInsert.user_id = user.id;
            }
        }

        // SMART MATCH for AbbonamentoUtente: coworker by email and service by name
        if (modelName === 'AbbonamentoUtente') {
            if (!dataToInsert.profilo_coworker_id && (dataToInsert.email || dataToInsert.profilo_email)) {
                const p = await matchProfiloCoworkerByEmail(dataToInsert.email || dataToInsert.profilo_email);
                if (p) {
                    dataToInsert.profilo_coworker_id = p.id;
                    if (!dataToInsert.user_id) dataToInsert.user_id = p.user_id;
                    if (!dataToInsert.profilo_nome_completo) dataToInsert.profilo_nome_completo = `${p.first_name} ${p.last_name}`;
                }
            }
            if (dataToInsert.tipo_abbonamento_nome && !dataToInsert.tipo_abbonamento_id) {
                const t = await matchTipoAbbonamentoByName(dataToInsert.tipo_abbonamento_nome);
                if (t) {
                    dataToInsert.tipo_abbonamento_id = t.id;
                    dataToInsert.tipo_abbonamento_nome = t.nome; // Normalized
                    if (!dataToInsert.ingressi_totali) dataToInsert.ingressi_totali = t.numero_ingressi || 0;
                    if (!dataToInsert.ore_sale_totali) dataToInsert.ore_sale_totali = t.ore_sale_incluse || 0;
                }
            }
        }
        // SMART MATCH for IngressoCoworking: match by profile name or email
        if (modelName === 'IngressoCoworking') {
            // Helper defined locally or use existing helpers
            const findProfile = async () => {
                if (dataToInsert.profilo_coworker_id) return;

                // Try email match
                if (dataToInsert.profilo_email || dataToInsert.email) {
                    const p = await matchProfiloCoworkerByEmail(dataToInsert.profilo_email || dataToInsert.email);
                    if (p) return p;
                }

                // Try name match
                if (dataToInsert.profilo_nome_completo || dataToInsert.nome_completo) {
                    const name = (dataToInsert.profilo_nome_completo || dataToInsert.nome_completo).trim().toLowerCase();
                    const profili = await models.ProfiloCoworker.findAll();
                    for (const p of profili) {
                        const forward = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
                        const backward = `${p.last_name || ''} ${p.first_name || ''}`.trim().toLowerCase();
                        if (forward === name || backward === name) return p;
                    }
                }
                return null;
            };

            const p = await findProfile();
            if (p) {
                console.log(`[SMART MATCH] Found profile ${p.id} for IngressoCoworking`);
                dataToInsert.profilo_coworker_id = p.id;
                if (!dataToInsert.user_id) dataToInsert.user_id = p.user_id;
                if (!dataToInsert.profilo_nome_completo) dataToInsert.profilo_nome_completo = `${p.first_name} ${p.last_name}`;
            } else {
                console.warn(`[SMART MATCH] FAILED to find profile for IngressoCoworking: ${dataToInsert.profilo_nome_completo || dataToInsert.email}`);
            }
        }

        // SMART MATCH for OrdineCoworking: coworker by email
        if (modelName === 'OrdineCoworking') {
            if (!dataToInsert.profilo_coworker_id && (dataToInsert.email || dataToInsert.profilo_email)) {
                const p = await matchProfiloCoworkerByEmail(dataToInsert.email || dataToInsert.profilo_email);
                if (p) {
                    dataToInsert.profilo_coworker_id = p.id;
                    if (!dataToInsert.user_id) dataToInsert.user_id = p.user_id;
                    if (!dataToInsert.profilo_nome_completo) dataToInsert.profilo_nome_completo = `${p.first_name} ${p.last_name}`;
                    if (!dataToInsert.profilo_email) dataToInsert.profilo_email = p.email;
                }
            }
        }

        // SMART MATCH for TurnoHost: name-based lookup if utente_id is missing
        if (modelName === 'TurnoHost' && !dataToInsert.utente_id && (dataToInsert.utente_nome || dataToInsert.full_name)) {
            const matchId = await matchUserByName(dataToInsert.utente_nome || dataToInsert.full_name);
            if (matchId) {
                console.log(`[SMART MATCH] Found user ${matchId} for host shift`);
                dataToInsert.utente_id = matchId;
            } else {
                console.warn(`[SMART MATCH] FAILED to find user for host shift: ${dataToInsert.utente_nome || dataToInsert.full_name}`);
            }
        }

        // SMART MATCH for TransazioneNEU: sender and recipient by name
        if (modelName === 'TransazioneNEU') {
            if (!dataToInsert.da_utente_id && dataToInsert.da_utente_nome) {
                const matchId = await matchUserByName(dataToInsert.da_utente_nome);
                if (matchId) {
                    dataToInsert.da_utente_id = matchId;
                    console.log(`[SMART MATCH] Found sender ${matchId} for transaction`);
                }
            }
            if (!dataToInsert.a_utente_id && dataToInsert.a_utente_nome) {
                const matchId = await matchUserByName(dataToInsert.a_utente_nome);
                if (matchId) {
                    dataToInsert.a_utente_id = matchId;
                    console.log(`[SMART MATCH] Found recipient ${matchId} for transaction`);
                }
            }
        }

        // AUTO-CALCULATION for TurnoHost: hours and NEU
        if (modelName === 'TurnoHost' && dataToInsert.data_inizio && dataToInsert.data_fine) {
            const stats = calculateNEU(dataToInsert.data_inizio, dataToInsert.data_fine);

            if (!dataToInsert.ore_lavorate) {
                dataToInsert.ore_lavorate = stats.oreTotali;
            }

            if (!dataToInsert.neu_guadagnati && dataToInsert.utente_id) {
                // Check if user is "associazione"
                const user = await models.User.findByPk(dataToInsert.utente_id);
                const isAssociation = user && (user.role === 'associazione' || (user.roles && user.roles.includes('associazione')));

                if (isAssociation) {
                    dataToInsert.neu_guadagnati = 0;
                    console.log(`[NEU EXEMPTION] User ${user.id} is association, setting 0 NEU`);
                } else {
                    dataToInsert.neu_guadagnati = stats.neuTotali;
                }
            }
        }

        const item = await req.Model.create(dataToInsert);

        // TRIGGER EMAIL ON CHECK-IN
        if (modelName === 'ProfiloCoworker' || modelName === 'IngressoCoworking') {
            console.log(`[CHECK-IN] Triggering email for ${modelName}`);
            sendCheckInEmail(item);
        }

        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/entities/:modelName/:id
router.patch('/:modelName/:id', getModel, async (req, res) => {
    try {
        const { modelName, id } = req.params;
        const item = await req.Model.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Special logic for DichiarazioneVolontariato: update user balance/hours
        if (modelName === 'DichiarazioneVolontariato') {
            const oldData = item.toJSON();
            const newData = req.body;
            const userId = newData.user_id || oldData.user_id;

            if (userId) {
                const user = await models.User.findByPk(userId);
                if (user) {
                    // Update NEU balance if neu_guadagnati changed
                    if (newData.neu_guadagnati !== undefined && newData.neu_guadagnati !== oldData.neu_guadagnati) {
                        const diff = newData.neu_guadagnati - (oldData.neu_guadagnati || 0);
                        await user.update({ saldo_neu: (user.saldo_neu || 0) + diff });

                        // Create adjustment transaction
                        await models.TransazioneNEU.create({
                            da_utente_id: diff < 0 ? userId : null,
                            a_utente_id: diff > 0 ? userId : null,
                            importo: Math.abs(diff),
                            tipo: 'correzione_admin',
                            causale: `CORREZIONE: Rettifica NEU dichiarazione #${id}`,
                            data_transazione: new Date()
                        });
                    }

                    // Update annual hours if ore changed
                    if (newData.ore !== undefined && newData.ore !== oldData.ore) {
                        const diff = newData.ore - (oldData.ore || 0);
                        await user.update({ ore_volontariato_anno: (user.ore_volontariato_anno || 0) + diff });
                    }
                }
            }
        }

        await item.update(req.body);
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/entities/:modelName/bulk (Danger: Empty Table)
router.delete('/:modelName/bulk', getModel, async (req, res) => {
    try {
        const { modelName } = req.params;

        // Confirmation check (optional, but good for safety)
        if (req.query.confirm !== 'true') {
            return res.status(400).json({ error: 'Missing confirmation query parameter (?confirm=true)' });
        }

        // Special logic for safe bulk delete
        if (modelName === 'AmbitoVolontariato') {
            // Do NOT delete 'Altro'
            await models.DichiarazioneVolontariato.update(
                { ambito_id: null },
                { where: { ambito_id: { [sequelize.Sequelize.Op.ne]: null } } }
            );
            await req.Model.destroy({ where: { nome: { [sequelize.Sequelize.Op.ne]: 'Altro' } } });
        } else if (modelName === 'AzioneVolontariato') {
            await models.DichiarazioneVolontariato.update(
                { azione_id: null },
                { where: { azione_id: { [sequelize.Sequelize.Op.ne]: null } } }
            );
            await req.Model.destroy({ where: {} });
        } else {
            await req.Model.destroy({ where: {}, truncate: false });
        }

        res.json({ message: `Tutti i record di ${modelName} sono stati eliminati.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/entities/:modelName/:id
router.delete('/:modelName/:id', getModel, async (req, res) => {
    try {
        const { modelName, id } = req.params;
        console.log(`[DELETE] Attempting to delete ${modelName} with ID ${id}`);

        const item = await req.Model.findByPk(id);
        if (!item) {
            console.warn(`[DELETE] Item ${id} for model ${modelName} not found`);
            return res.status(404).json({ error: 'Item not found' });
        }

        // --- Special Logic for DichiarazioneVolontariato: REVERT USER STATS ---
        if (modelName === 'DichiarazioneVolontariato' && item.user_id) {
            const user = await models.User.findByPk(item.user_id);
            if (user) {
                // 1. Revert NEU balance
                if (item.neu_guadagnati > 0) {
                    console.log(`[DELETE] Reverting ${item.neu_guadagnati} NEU for user ${user.id}`);
                    await user.update({ saldo_neu: (user.saldo_neu || 0) - item.neu_guadagnati });

                    // Add correction transaction
                    await models.TransazioneNEU.create({
                        da_utente_id: user.id,
                        a_utente_id: null,
                        importo: item.neu_guadagnati,
                        tipo: 'correzione_admin',
                        causale: `CORREZIONE: Eliminazione dichiarazione #${id}`,
                        data_transazione: new Date()
                    });
                }

                // 2. Revert annual hours
                if (item.ore > 0) {
                    console.log(`[DELETE] Reverting ${item.ore} hours for user ${user.id}`);
                    const newHours = Math.max(0, (user.ore_volontariato_anno || 0) - item.ore);
                    await user.update({ ore_volontariato_anno: newHours });
                }
            }
        }

        // Special logic for AmbitoVolontariato: check and solve FK conflicts
        if (modelName === 'AmbitoVolontariato') {
            console.log(`[DELETE] Special logic for AmbitoVolontariato ID ${id} (${item.nome})`);
            if (item.nome === 'Altro') {
                return res.status(400).json({ error: 'Non puoi eliminare l\'ambito predefinito "Altro"' });
            }

            // Disconnect related declarations before deleting
            const [affectedCount] = await models.DichiarazioneVolontariato.update(
                { ambito_id: null },
                { where: { ambito_id: item.id } }
            );
            console.log(`[DELETE] Nullified ambito_id in ${affectedCount} declarations`);
        }

        // Special logic for AzioneVolontariato: solve FK conflicts
        if (modelName === 'AzioneVolontariato') {
            console.log(`[DELETE] Special logic for AzioneVolontariato ID ${id} (${item.titolo})`);
            const [affectedCount] = await models.DichiarazioneVolontariato.update(
                { azione_id: null },
                { where: { azione_id: item.id } }
            );
            console.log(`[DELETE] Nullified azione_id in ${affectedCount} declarations`);
        }

        console.log(`[DELETE] Calling item.destroy() for ${modelName} ID ${id}`);
        await item.destroy();
        console.log(`[DELETE] Successfully deleted ${modelName} ID ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE ERROR] Failed to delete ${req.params.modelName} ID ${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
