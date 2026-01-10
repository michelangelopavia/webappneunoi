import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, CheckCircle, AlertCircle, Database, Trash2 } from 'lucide-react';

const ENTITIES = [
  { value: 'User', label: 'Utenti (User)' },
  { value: 'ProfiloSocio', label: 'Profili Soci' },
  { value: 'TurnoHost', label: 'Turni Host' },
  { value: 'TransazioneNEU', label: 'Transazioni NEU' },
  { value: 'SalaRiunioni', label: 'Sale Riunioni' },
  { value: 'PrenotazioneSala', label: 'Prenotazioni Sale' },
  { value: 'IngressoCoworking', label: 'Ingressi Coworking' },
  { value: 'ProfiloCoworker', label: 'Profili Coworker' },
  { value: 'OrdineCoworking', label: 'Ordini Coworking' },
  { value: 'DatiFatturazione', label: 'Dati Fatturazione' },
  { value: 'TipoAbbonamento', label: 'Tipi Abbonamento' },
  { value: 'AbbonamentoUtente', label: 'Abbonamenti Utenti' },
  { value: 'AmbitoVolontariato', label: 'Ambiti Volontariato' },
  { value: 'AzioneVolontariato', label: 'Azioni Volontariato (NEU)' },
  { value: 'DichiarazioneVolontariato', label: 'Dichiarazioni Volontariato' },
  { value: 'NotificaAbbonamento', label: 'Notifiche Abbonamenti' },
  { value: 'TaskNotifica', label: 'Task Notifiche' }
];

const ENTITY_SCHEMAS = {
  User: ['full_name', 'email', 'password_hash', 'role:super_admin|admin|socio|host|coworker', 'roles', 'saldo_neu', 'saldo_neu_scadenza', 'telefono', 'data_iscrizione:YYYY-MM-DD', 'note'],
  ProfiloSocio: ['user_id', 'full_name', 'data_nascita:YYYY-MM-DD', 'luogo_nascita', 'codice_fiscale', 'indirizzo_residenza', 'citta_residenza', 'paese_residenza', 'cap_residenza', 'telefono', 'email', 'professione', 'competenze', 'interessi', 'bio', 'telegram_username', 'instagram_username', 'linkedin_url', 'website_url', 'avatar_url', 'stato_iscrizione:attivo|pending', 'data_iscrizione:YYYY-MM-DD', 'data_scadenza_iscrizione:YYYY-MM-DD'],
  TurnoHost: [
    'utente_nome',
    'data_inizio:YYYY-MM-DD HH:mm',
    'data_fine:YYYY-MM-DD HH:mm',
    'note'
  ],
  TransazioneNEU: [
    'da_utente_nome',
    'a_utente_nome',
    'importo',
    'tipo:turno_host|volontariato|trasferimento_soci|pagamento_associazione|voto_annuale|correzione_admin',
    'causale',
    'data_transazione:YYYY-MM-DD HH:mm'
  ],
  SalaRiunioni: ['nome', 'capienza', 'tariffa_oraria', 'attiva:true|false'],
  PrenotazioneSala: ['sala_id', 'user_id', 'data_inizio:ISO8601', 'data_fine:ISO8601', 'titolo', 'note', 'pagato:true|false'],
  IngressoCoworking: ['profilo_nome_completo', 'data_ingresso:ISO8601', 'durata:mezza_giornata|giornata_intera', 'ingressi_consumati', 'tipo_ingresso:carnet|abbonamento|giornaliero'],
  ProfiloCoworker: ['first_name', 'last_name', 'genere:maschio|femmina|altro|preferisco_non_rispondere', 'data_nascita:YYYY-MM-DD', 'citta_residenza', 'paese_residenza', 'email', 'telefono', 'ragione_sociale', 'p_iva', 'codice_univoco', 'stato:check_in_completato|iscritto', 'privacy_accettata:true|false', 'newsletter:true|false', 'data_compilazione:YYYY-MM-DD', 'user_id'],
  OrdineCoworking: ['profilo_email', 'totale', 'metodo_pagamento:contanti|neu|stripe|scambio', 'stato_pagamento:pagato|non_pagato', 'data_ordine:ISO8601', 'note'],
  DatiFatturazione: ['user_id', 'indirizzo', 'citta', 'cap', 'paese'],
  TipoAbbonamento: ['nome', 'categoria:ingresso_giornaliero|abbonamento|carnet|sala_riunioni|extra', 'prezzo', 'durata_giorni', 'durata_mesi', 'numero_ingressi', 'ore_sale_incluse', 'descrizione'],
  AbbonamentoUtente: ['profilo_email', 'tipo_abbonamento_nome', 'data_inizio:YYYY-MM-DD', 'data_scadenza:YYYY-MM-DD', 'attivo:true|false', 'metodo_pagamento', 'importo', 'note'],
  AmbitoVolontariato: ['nome', 'descrizione', 'attivo:true|false'],
  AzioneVolontariato: ['titolo', 'descrizione', 'valore_neu', 'attivo:true|false'],
  DichiarazioneVolontariato: [
    'utente_nome',
    'ambito_nome',
    'ore',
    'anno_associativo',
    'note',
    'confermato:true|false'
  ],
  NotificaAbbonamento: ['user_id', 'messaggio', 'letta:true|false', 'data_invio:ISO8601'],
  TaskNotifica: ['titolo', 'descrizione', 'data_scadenza:YYYY-MM-DD', 'assegnatario_id', 'completato:true|false']
};

export default function ImportaDati() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    if (!selectedEntity || !ENTITY_SCHEMAS[selectedEntity]) return;

    const fields = ENTITY_SCHEMAS[selectedEntity];
    const csvContent = fields.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${selectedEntity}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedEntity) return;

    setImporting(true);
    setResult(null);

    try {
      // 1. Upload file
      const { file_url } = await neunoi.integrations.Core.UploadFile({ file });

      // 2. Extract Data (Server parses CSV)
      // Note: We don't send validation schema anymore to allow generic import.
      // The server will split CSV headers and properties dynamically.
      const extraction = await neunoi.integrations.Core.ExtractDataFromUploadedFile({
        file_url
      });

      if (extraction.status === 'error') {
        throw new Error(extraction.details || "Errore durante l'estrazione");
      }

      const rows = extraction.output;
      if (!rows || rows.length === 0) {
        throw new Error("Nessun dato trovato nel file CSV.");
      }

      // 3. Insert Data into Entity
      let successCount = 0;
      let errors = [];

      for (const row of rows) {
        try {
          // Clean empty keys if any
          const cleanRow = {};
          Object.keys(row).forEach(k => {
            if (k && k.trim() !== '') {
              let val = row[k];
              if (typeof val === 'string') val = val.trim();

              // Don't send empty strings for ID fields (Sequelize needs null or valid ID)
              if ((k.trim().endsWith('_id') || k.trim() === 'id') && val === '') {
                cleanRow[k.trim()] = null;
              } else {
                cleanRow[k.trim()] = val;
              }
            }
          });

          // Create entity
          if (neunoi.entities[selectedEntity]) {
            await neunoi.entities[selectedEntity].create(cleanRow);
            successCount++;
          } else {
            throw new Error(`Handler per entità ${selectedEntity} non trovato.`);
          }
        } catch (e) {
          console.error(`Errore riga import ${selectedEntity}: `, e);
          const errorMsg = e.response?.data?.error || e.message || "Errore sconosciuto";
          errors.push(`Errore: ${errorMsg} `);
        }
      }

      setResult({
        success: errors.length === 0,
        message: `Importazione completata: ${successCount} record creati.`,
        details: errors.length > 0 ? errors.slice(0, 3).join(', ') + (errors.length > 3 ? ` e altri ${errors.length - 3} ` : '') : null
      });

    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetTable = async () => {
    console.log("handleResetTable (final step) called. selectedEntity:", selectedEntity);
    if (!selectedEntity) return;

    setImporting(true);
    setResult(null);
    setShowConfirm(false);

    try {
      if (neunoi.entities[selectedEntity] && neunoi.entities[selectedEntity].bulkDelete) {
        await neunoi.entities[selectedEntity].bulkDelete();
        setResult({
          success: true,
          message: `Tabella "${selectedEntity}" svuotata con successo.`
        });
      } else {
        throw new Error(`Azione non supportata per l'entità "${selectedEntity}".`);
      }
    } catch (error) {
      console.error("Errore reset tabella:", error);
      setResult({
        success: false,
        message: "Errore durante lo svuotamento della tabella.",
        details: error.response?.data?.error || error.message
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#053c5e] text-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8" />
          Importazione Dati Universale
        </h1>
        <p className="text-white/80 mt-2">
          Carica dati massivi per qualsiasi tabella del database tramite CSV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona Entità e Carica CSV</CardTitle>
          <CardDescription>
            Scarica il template, compilalo e caricalo. I campi ID sono autogenerati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tabella Destinazione</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una tabella..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {ENTITIES.map(ent => (
                    <SelectItem key={ent.value} value={ent.value}>
                      {ent.label} ({ent.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Azione</label>
              <div className="flex gap-2 flex-col">

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  disabled={!selectedEntity}
                  className="w-full border-[#4A9FB4] text-[#4A9FB4] hover:bg-[#4A9FB4]/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Scarica Template {selectedEntity ? `(${selectedEntity})` : ''}
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    id="csv-upload"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={importing || !selectedEntity}
                  />
                  <Button
                    onClick={() => document.getElementById('csv-upload').click()}
                    disabled={importing || !selectedEntity}
                    className="w-full bg-[#1F4A5C] hover:bg-[#1F4A5C]/90"
                  >
                    {importing ? (
                      <>Importazione in corso...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Carica CSV
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Manutenzione</label>
              {!showConfirm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(true)}
                  disabled={importing || !selectedEntity}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Svuota Tabella {selectedEntity ? `(${selectedEntity})` : ''}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1"
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetTable}
                    className="flex-[2]"
                  >
                    CONFERMA CANCELLAZIONE TOTALE
                  </Button>
                </div>
              )}
            </div>
          </div>

          {result && (
            <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-800' : 'text-orange-800'}>
                {result.message}
                {result.details && (
                  <div className="mt-2 text-xs opacity-80 border-t border-orange-200 pt-2">
                    Dettagli tecnici: {result.details}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-slate-50 p-4 rounded text-sm text-slate-600">
            <h4 className="font-bold mb-2">Note Importanti:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Assicurati che i nomi delle colonne nel CSV corrispondano esattamente ai campi del modello nel database.</li>
              <li>Per i campi data, usa il formato ISO (YYYY-MM-DD) per evitare errori.</li>
              <li>Le relazioni (es. user_id) devono riferirsi a ID esistenti. Importa prima gli Utenti!</li>
            </ul>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
