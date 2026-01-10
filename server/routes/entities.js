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
    if (isPublicCheckIn) {
        return next();
    }
    return authMiddleware(req, res, next);
});

// LIST /api/entities/:modelName/list
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

// FILTER /api/entities/:modelName/filter
router.post('/:modelName/filter', getModel, async (req, res) => {
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
        if (include === 'all') options.include = { all: true };

        const items = await req.Model.findAll(options);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/entities/:modelName/:id
router.get('/:modelName/:id', getModel, async (req, res) => {
    try {
        const { include } = req.query;
        const options = {};
        if (include === 'all') options.include = { all: true };
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
                    da_utente_id: null, a_utente_id: item.user_id,
                    importo: item.neu_guadagnati, tipo: 'volontariato',
                    causale: `Volontariato (Rettifica)`,
                    data_transazione: item.data_dichiarazione || item.createdAt,
                    riferimento_dichiarazione_id: item.id
                });
            }
            const { safeRecalcUser } = require('../utils/safe_recalc');
            await safeRecalcUser(userId);
            return res.json(await item.reload());
        }

        await item.update(req.body);
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/entities/:modelName/:id
router.delete('/:modelName/:id', getModel, async (req, res) => {
    try {
        const { modelName, id } = req.params;
        const item = await req.Model.findByPk(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const usersToSync = [];
        if (item.user_id) usersToSync.push(item.user_id);
        if (item.utente_id) usersToSync.push(item.utente_id);
        if (item.da_utente_id) usersToSync.push(item.da_utente_id);
        if (item.a_utente_id) usersToSync.push(item.a_utente_id);

        if (modelName === 'DichiarazioneVolontariato') {
            await models.TransazioneNEU.destroy({ where: { riferimento_dichiarazione_id: id } });
        }

        await item.destroy();

        if (usersToSync.length > 0) {
            const { safeRecalcUser } = require('../utils/safe_recalc');
            for (const uid of [...new Set(usersToSync)]) {
                await safeRecalcUser(uid);
            }
        }
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
