const { AuditLog } = require('../models');

/**
 * Registra un'azione nel log di audit
 * @param {Object} params 
 * @param {Object} params.req - Oggetto richiesta Express (per user e IP)
 * @param {string} params.azione - 'create', 'update', 'delete', 'login', etc.
 * @param {string} params.modello - Nome del modello coinvolto
 * @param {number} params.riferimento_id - ID del record interessato
 * @param {Object} [params.dati_precedenti] - Stato del record prima della modifica
 * @param {Object} [params.dati_nuovi] - Stato del record dopo la modifica
 */
const logAudit = async ({ req, azione, modello, riferimento_id, dati_precedenti, dati_nuovi }) => {
    try {
        await AuditLog.create({
            user_id: req.user?.id || null,
            user_name: req.user?.full_name || 'System/Guest',
            azione,
            modello,
            riferimento_id,
            dati_precedenti: dati_precedenti ? JSON.parse(JSON.stringify(dati_precedenti)) : null,
            dati_nuovi: dati_nuovi ? JSON.parse(JSON.stringify(dati_nuovi)) : null,
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            data_esecuzione: new Date()
        });
    } catch (error) {
        console.error('[AUDIT-LOG] Errore durante la registrazione del log:', error);
    }
};

module.exports = { logAudit };
