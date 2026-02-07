const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: true },
    full_name: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'coworker' },
    roles: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    status: { type: DataTypes.STRING, defaultValue: 'in_attesa' }, // in_attesa, approvato, sospeso
    saldo_neu: { type: DataTypes.FLOAT, defaultValue: 0 },
    saldo_neu_scadenza: { type: DataTypes.FLOAT, defaultValue: 0 },
    ore_volontariato_anno: { type: DataTypes.FLOAT, defaultValue: 0 },
    note: { type: DataTypes.TEXT },
    telefono: { type: DataTypes.STRING },
    data_iscrizione: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    tipo_utente: { type: DataTypes.STRING }, // socio, coworker, both
    email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verification_token: { type: DataTypes.STRING, allowNull: true },
    verification_token_expires: { type: DataTypes.DATE, allowNull: true }
}, {
    defaultScope: {
        attributes: { exclude: ['password_hash', 'verification_token'] }
    },
    scopes: {
        withPassword: { attributes: {} }
    }
});

// Add toJSON to ensure it's always removed even if scope is bypassed
User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
};

const ProfiloSocio = sequelize.define('ProfiloSocio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    telefono: { type: DataTypes.STRING },
    data_nascita: { type: DataTypes.DATEONLY },
    luogo_nascita: { type: DataTypes.STRING },
    indirizzo: { type: DataTypes.STRING },
    citta: { type: DataTypes.STRING },
    cap: { type: DataTypes.STRING },
    paese_residenza: { type: DataTypes.STRING },
    provincia: { type: DataTypes.STRING(2) },
    codice_fiscale: { type: DataTypes.STRING(16) },
    documento_identita_url: { type: DataTypes.STRING },
    attivo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const TurnoHost = sequelize.define('TurnoHost', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    utente_id: { type: DataTypes.INTEGER, allowNull: false },
    utente_nome: { type: DataTypes.STRING },
    data_inizio: { type: DataTypes.DATE, allowNull: false },
    data_fine: { type: DataTypes.DATE, allowNull: false },
    ore_lavorate: { type: DataTypes.FLOAT, defaultValue: 0 },
    neu_guadagnati: { type: DataTypes.FLOAT, defaultValue: 0 },
    tariffa_neu_ora: { type: DataTypes.FLOAT },
    tipo_giorno: { type: DataTypes.STRING },
    stato: { type: DataTypes.STRING, defaultValue: 'completato' },
    note: { type: DataTypes.TEXT },
    confermato: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const TransazioneNEU = sequelize.define('TransazioneNEU', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    da_utente_id: { type: DataTypes.INTEGER, allowNull: true }, // null if from System/Association
    a_utente_id: { type: DataTypes.INTEGER, allowNull: true },   // null if to System/Association
    importo: { type: DataTypes.FLOAT, allowNull: false },
    tipo: { type: DataTypes.STRING }, // turno_host, trasferimento_soci, etc.
    causale: { type: DataTypes.STRING },
    data_transazione: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    riferimento_turno_id: { type: DataTypes.INTEGER, allowNull: true },
    riferimento_dichiarazione_id: { type: DataTypes.INTEGER, allowNull: true }
});

// Relationships are defined at the end of the file using module.exports to avoid circular dependencies
// and ensure all models are loaded.

module.exports = {
    User,
    ProfiloSocio,
    TurnoHost,
    TransazioneNEU,

    // Coworking Models
    SalaRiunioni: sequelize.define('SalaRiunioni', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: DataTypes.STRING },
        capienza: { type: DataTypes.INTEGER },
        tariffa_oraria: { type: DataTypes.FLOAT },
        descrizione: { type: DataTypes.TEXT },
        colore: { type: DataTypes.STRING },
        tipi_utilizzo: { type: DataTypes.JSON }, // ['call', 'riunione']
        solo_staff: { type: DataTypes.BOOLEAN, defaultValue: false },
        attiva: { type: DataTypes.BOOLEAN, defaultValue: true }
    }),

    PrenotazioneSala: sequelize.define('PrenotazioneSala', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        sala_id: { type: DataTypes.INTEGER },
        sala_nome: { type: DataTypes.STRING },
        user_id: { type: DataTypes.INTEGER }, // Coworker/Socio
        utente_nome: { type: DataTypes.STRING },
        data_inizio: { type: DataTypes.DATE },
        data_fine: { type: DataTypes.DATE },
        titolo: { type: DataTypes.STRING },
        tipo_utilizzo: { type: DataTypes.STRING }, // 'call', 'riunione'
        ore_credito_consumate: { type: DataTypes.FLOAT },
        note: { type: DataTypes.TEXT },
        pagato: { type: DataTypes.BOOLEAN, defaultValue: false },
        stato: { type: DataTypes.STRING, defaultValue: 'confermata' } // 'confermata', 'annullata'
    }),

    IngressoCoworking: sequelize.define('IngressoCoworking', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        profilo_coworker_id: { type: DataTypes.INTEGER },
        profilo_nome_completo: { type: DataTypes.STRING },
        abbonamento_id: { type: DataTypes.INTEGER },
        data_ingresso: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        tipo: { type: DataTypes.STRING }, // 'giornaliero', 'abbonamento'
        tipo_ingresso: { type: DataTypes.STRING }, // 'carnet', 'abbonamento' (explicit)
        durata: { type: DataTypes.STRING }, // 'mezza_giornata', 'giornata_intera'
        ingressi_consumati: { type: DataTypes.FLOAT },
        registrato_da: { type: DataTypes.INTEGER }
    }),

    ProfiloCoworker: sequelize.define('ProfiloCoworker', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        // Dati Anagrafici (Specie per Check-in ospiti)
        first_name: { type: DataTypes.STRING },
        last_name: { type: DataTypes.STRING },
        genere: { type: DataTypes.STRING },
        data_nascita: { type: DataTypes.DATEONLY },
        citta_residenza: { type: DataTypes.STRING },
        paese_residenza: { type: DataTypes.STRING },

        // Dati Aziendali (Opzionali)
        ragione_sociale: { type: DataTypes.STRING },
        p_iva: { type: DataTypes.STRING },
        codice_univoco: { type: DataTypes.STRING },

        // Contatti e Consensi
        email: { type: DataTypes.STRING },
        telefono: { type: DataTypes.STRING }, // Aggiunto se mancava o duplicato se serviva
        newsletter: { type: DataTypes.BOOLEAN, defaultValue: false },
        privacy_accettata: { type: DataTypes.BOOLEAN, defaultValue: false },
        data_accettazione_privacy: { type: DataTypes.DATE },
        data_compilazione: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

        stato: { type: DataTypes.STRING } // 'iscritto', 'pending', 'check_in_completato'
    }),

    OrdineCoworking: sequelize.define('OrdineCoworking', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true }, // Optional if guest
        profilo_coworker_id: { type: DataTypes.INTEGER },      // Link to ProfiloCoworker

        // Snapshot of profile data at time of order
        profilo_nome_completo: { type: DataTypes.STRING },
        profilo_email: { type: DataTypes.STRING },

        prodotti: { type: DataTypes.TEXT },
        totale: { type: DataTypes.FLOAT },

        metodo_pagamento: { type: DataTypes.STRING },
        stato_pagamento: { type: DataTypes.STRING }, // 'pagato', 'non_pagato' (previously 'stato')
        stato: { type: DataTypes.STRING, defaultValue: 'confermato' }, // 'confermato', 'annullato'
        note: { type: DataTypes.TEXT },

        data_ordine: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        numero_ricevuta: { type: DataTypes.INTEGER },
        registrato_da: { type: DataTypes.INTEGER }
    }),

    DatiFatturazione: sequelize.define('DatiFatturazione', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        ragione_sociale: { type: DataTypes.STRING },
        indirizzo: { type: DataTypes.STRING },
        citta: { type: DataTypes.STRING },
        cap: { type: DataTypes.STRING },
        provincia: { type: DataTypes.STRING },
        paese: { type: DataTypes.STRING, defaultValue: 'Italia' },
        partita_iva: { type: DataTypes.STRING },
        codice_fiscale: { type: DataTypes.STRING },
        pec: { type: DataTypes.STRING },
        codice_univoco: { type: DataTypes.STRING },
        is_estero: { type: DataTypes.BOOLEAN, defaultValue: false }
    }),

    TipoAbbonamento: sequelize.define('TipoAbbonamento', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: DataTypes.STRING },
        categoria: { type: DataTypes.STRING }, // ingresso_giornaliero, abbonamento, carnet, extra
        prezzo: { type: DataTypes.FLOAT },
        prezzo_libero: { type: DataTypes.BOOLEAN, defaultValue: false },
        durata_giorni: { type: DataTypes.INTEGER },
        durata_mesi: { type: DataTypes.INTEGER },
        numero_ingressi: { type: DataTypes.INTEGER },
        ore_sale_incluse: { type: DataTypes.FLOAT },
        crediti_sala: { type: DataTypes.INTEGER },
        descrizione: { type: DataTypes.TEXT },
        notifiche_scadenza: { type: DataTypes.JSON }, // [{giorni: number, testo: string}]
        notifiche_ingressi: { type: DataTypes.JSON }, // [{soglia: number, testo: string}]
        notifiche_ore: { type: DataTypes.JSON },      // [{soglia: number, testo: string}]
        attivo: { type: DataTypes.BOOLEAN, defaultValue: true }
    }),

    AbbonamentoUtente: sequelize.define('AbbonamentoUtente', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        profilo_coworker_id: { type: DataTypes.INTEGER },
        profilo_nome_completo: { type: DataTypes.STRING },
        tipo_abbonamento_id: { type: DataTypes.INTEGER },
        tipo_abbonamento_nome: { type: DataTypes.STRING },
        data_inizio: { type: DataTypes.DATE },
        data_scadenza: { type: DataTypes.DATE },
        ingressi_totali: { type: DataTypes.INTEGER, defaultValue: 0 },
        ingressi_usati: { type: DataTypes.INTEGER, defaultValue: 0 },
        ore_sale_totali: { type: DataTypes.FLOAT, defaultValue: 0 },
        ore_sale_usate: { type: DataTypes.FLOAT, defaultValue: 0 },
        stato: { type: DataTypes.STRING, defaultValue: 'attivo' }, // 'attivo', 'scaduto', 'annullato'
        riferimento_ordine_id: { type: DataTypes.INTEGER, allowNull: true },
        notifiche_inviate: { type: DataTypes.JSON }, // { scadenza: [7, 3], ingressi: [2], ore: [1] }
        attivo: { type: DataTypes.BOOLEAN, defaultValue: true }
    }),

    // Volontariato Models
    AmbitoVolontariato: sequelize.define('AmbitoVolontariato', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: DataTypes.STRING },
        descrizione: { type: DataTypes.TEXT },
        attivo: { type: DataTypes.BOOLEAN, defaultValue: true }
    }),

    AzioneVolontariato: sequelize.define('AzioneVolontariato', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        titolo: { type: DataTypes.STRING }, // Es: "Fare la lavatrice"
        descrizione: { type: DataTypes.TEXT },
        valore_neu: { type: DataTypes.FLOAT }, // Es: 5
        attivo: { type: DataTypes.BOOLEAN, defaultValue: true }
    }),

    DichiarazioneVolontariato: sequelize.define('DichiarazioneVolontariato', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        azione_id: { type: DataTypes.INTEGER, allowNull: true }, // Optional: for NEU actions
        ambito_id: { type: DataTypes.INTEGER, allowNull: true }, // Optional: for Legacy hours
        ore: { type: DataTypes.FLOAT, allowNull: true },        // Optional: for Legacy hours
        data_dichiarazione: { type: DataTypes.DATE },
        anno_associativo: { type: DataTypes.STRING },
        neu_guadagnati: { type: DataTypes.FLOAT, defaultValue: 0 },
        note: { type: DataTypes.TEXT },
        confermato: { type: DataTypes.BOOLEAN, defaultValue: true } // Auto-approved usually
    }),

    // Notifications
    NotificaAbbonamento: sequelize.define('NotificaAbbonamento', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        messaggio: { type: DataTypes.STRING },
        letta: { type: DataTypes.BOOLEAN, defaultValue: false },
        data_invio: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }),

    TaskNotifica: sequelize.define('TaskNotifica', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tipo: { type: DataTypes.STRING }, // 'task_manuale', 'abbonamento_scadenza', etc.
        titolo: { type: DataTypes.STRING },
        descrizione: { type: DataTypes.TEXT },
        creato_da_id: { type: DataTypes.INTEGER },
        creato_da_nome: { type: DataTypes.STRING },
        destinatario_id: { type: DataTypes.INTEGER },
        destinatario_nome: { type: DataTypes.STRING },
        destinatario_tipo: { type: DataTypes.STRING }, // 'host', 'socio'
        data_inizio: { type: DataTypes.STRING },
        data_fine: { type: DataTypes.STRING },
        priorita: { type: DataTypes.STRING },
        stato: { type: DataTypes.STRING, defaultValue: 'attivo' },
        completato_da_id: { type: DataTypes.INTEGER },
        completato_da_nome: { type: DataTypes.STRING },
        data_completamento: { type: DataTypes.STRING },
        riferimento_abbonamento_id: { type: DataTypes.INTEGER },
        riferimento_ordine_id: { type: DataTypes.INTEGER },

        data_scadenza: { type: DataTypes.DATE },
        assegnatario_id: { type: DataTypes.INTEGER },
        completato: { type: DataTypes.BOOLEAN, defaultValue: false },

        motivo_abbandono: { type: DataTypes.TEXT },
        storico: { type: DataTypes.JSON }, // [{azione: string, utente_id: number, utente_nome: string, data: string, note: string}]
        is_collettivo: { type: DataTypes.BOOLEAN, defaultValue: false }
    }),

    SistemaSetting: sequelize.define('SistemaSetting', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        chiave: { type: DataTypes.STRING, unique: true },
        valore: { type: DataTypes.TEXT },
        descrizione: { type: DataTypes.STRING }
    }),

    AuditLog: sequelize.define('AuditLog', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        user_name: { type: DataTypes.STRING },
        azione: { type: DataTypes.STRING }, // 'create', 'update', 'delete', 'login', etc.
        modello: { type: DataTypes.STRING },
        riferimento_id: { type: DataTypes.INTEGER },
        dati_precedenti: { type: DataTypes.JSON },
        dati_nuovi: { type: DataTypes.JSON },
        ip_address: { type: DataTypes.STRING },
        data_esecuzione: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    })
};

// --- Relationships ---
const m = module.exports; // Access defined models

// User relationships
m.User.hasOne(m.ProfiloSocio, { foreignKey: 'user_id' });
m.ProfiloSocio.belongsTo(m.User, { foreignKey: 'user_id' });

m.User.hasMany(m.TurnoHost, { foreignKey: 'utente_id' });
m.TurnoHost.belongsTo(m.User, { foreignKey: 'utente_id' });

m.User.hasMany(m.TransazioneNEU, { as: 'TransazioniInUscita', foreignKey: 'da_utente_id' });
m.TransazioneNEU.belongsTo(m.User, { as: 'DaUtente', foreignKey: 'da_utente_id' }); // Fixed alias
m.User.hasMany(m.TransazioneNEU, { as: 'TransazioniInEntrata', foreignKey: 'a_utente_id' });
m.TransazioneNEU.belongsTo(m.User, { as: 'AUtente', foreignKey: 'a_utente_id' }); // Fixed alias

m.User.hasOne(m.ProfiloCoworker, { foreignKey: 'user_id' });
m.ProfiloCoworker.belongsTo(m.User, { foreignKey: 'user_id' });

m.User.hasMany(m.PrenotazioneSala, { foreignKey: 'user_id' });
m.PrenotazioneSala.belongsTo(m.User, { foreignKey: 'user_id' });

m.User.hasMany(m.IngressoCoworking, { foreignKey: 'user_id' });
m.IngressoCoworking.belongsTo(m.User, { foreignKey: 'user_id' });

m.User.hasMany(m.OrdineCoworking, { foreignKey: 'user_id' });
m.OrdineCoworking.belongsTo(m.User, { foreignKey: 'user_id' });

m.User.hasMany(m.AbbonamentoUtente, { foreignKey: 'user_id' });
m.AbbonamentoUtente.belongsTo(m.User, { foreignKey: 'user_id' });


m.User.hasMany(m.DichiarazioneVolontariato, { foreignKey: 'user_id' });
m.DichiarazioneVolontariato.belongsTo(m.User, { foreignKey: 'user_id' });

m.AzioneVolontariato.hasMany(m.DichiarazioneVolontariato, { foreignKey: 'azione_id' });
m.DichiarazioneVolontariato.belongsTo(m.AzioneVolontariato, { foreignKey: 'azione_id' });

m.AmbitoVolontariato.hasMany(m.DichiarazioneVolontariato, { foreignKey: 'ambito_id' });
m.DichiarazioneVolontariato.belongsTo(m.AmbitoVolontariato, { foreignKey: 'ambito_id' });

m.User.hasMany(m.TaskNotifica, { foreignKey: 'assegnatario_id' });
m.TaskNotifica.belongsTo(m.User, { foreignKey: 'assegnatario_id' });

// Sala relationships
m.SalaRiunioni.hasMany(m.PrenotazioneSala, { foreignKey: 'sala_id' });
m.PrenotazioneSala.belongsTo(m.SalaRiunioni, { foreignKey: 'sala_id' });

// Abbonamento relationships
m.TipoAbbonamento.hasMany(m.AbbonamentoUtente, { foreignKey: 'tipo_abbonamento_id' });
m.AbbonamentoUtente.belongsTo(m.TipoAbbonamento, { foreignKey: 'tipo_abbonamento_id', as: 'TipoAbbonamento' });

m.User.hasMany(m.AuditLog, { foreignKey: 'user_id' });
m.AuditLog.belongsTo(m.User, { foreignKey: 'user_id' });
