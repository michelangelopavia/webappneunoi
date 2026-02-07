import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, TrendingUp, TrendingDown, Calendar, AlertCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import RiepilogoOreTurni from '../components/turni/RiepilogoOreTurni';

import { useAuth } from '../hooks/useAuth';

export default function MieiNEU() {
  const { user, isLoading: authLoading, refetch: loadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [soci, setSoci] = useState([]);
  const [formData, setFormData] = useState({
    destinatario_email: '',
    tipoDestinatario: 'socio', // 'socio' o 'associazione'
    motivoAssociazione: '', // 'postazione' o 'quota_annua'
    importo: '',
    causale: ''
  });
  const [trasferimentoCompletato, setTrasferimentoCompletato] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('tutti');
  const [filtroAnno, setFiltroAnno] = useState('tutti');
  const queryClient = useQueryClient();

  const { data: transazioni = [] } = useQuery({
    queryKey: ['transazioni'],
    queryFn: () => neunoi.entities.TransazioneNEU.filter({}, '-data_transazione'),
    initialData: []
  });

  const { data: turniHost = [] } = useQuery({
    queryKey: ['turni', 'miei'],
    queryFn: () => neunoi.entities.TurnoHost.filter({ utente_id: user?.id }, '-data_inizio'),
    initialData: []
  });

  // Calcola gli anni disponibili dalle transazioni e dai turni
  const anniDisponibili = React.useMemo(() => {
    const anni = new Set();
    transazioni.forEach(t => {
      if (t.data_transazione && (t.a_utente_id === user?.id || t.da_utente_id === user?.id)) {
        anni.add(new Date(t.data_transazione).getFullYear().toString());
      }
    });
    turniHost.forEach(t => {
      if (t.data_inizio && t.utente_id === user?.id) {
        anni.add(new Date(t.data_inizio).getFullYear().toString());
      }
    });
    return Array.from(anni).sort((a, b) => b - a);
  }, [transazioni, turniHost, user?.id]);

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      loadSoci();
      // Automatizza ricalcolo saldo al caricamento
      ricalcolaSaldo();
    }
  }, [authLoading, user]);

  const isAssociazione = user?.roles?.includes('associazione') || user?.role === 'associazione';

  const loadSoci = async () => {
    try {
      // Ottieni tutti gli utenti per avere i dati completi (nome ed email)
      const allUsers = await neunoi.entities.User.list();
      const profiliSoci = await neunoi.entities.ProfiloSocio.list();

      // Mappa gli utenti con i loro profili per avere il nome completo se disponibile
      const sociList = allUsers
        .filter(u => String(u.id) !== String(user?.id)) // Escludi l'utente corrente
        .map(u => {
          const profilo = profiliSoci.find(p => String(p.user_id) === String(u.id));
          return {
            id: String(u.id),
            email: u.email,
            full_name: profilo?.full_name || u.full_name || 'Senza Nome'
          };
        })
        .filter(u => u.email); // Assicurati che abbiano una mail

      setSoci(sociList);
    } catch (error) {
      console.error('Errore caricamento soci:', error);
    }
  };

  const ricalcolaSaldo = async () => {
    if (!user) return;

    // Carica turni e transazioni
    const tuttiTurni = await neunoi.entities.TurnoHost.filter({ utente_id: user.id });
    const turniUtente = tuttiTurni;

    const tutteTransazioni = await neunoi.entities.TransazioneNEU.filter({});
    const tutteDichiarazioni = await neunoi.entities.DichiarazioneVolontariato.filter({});

    // NOTA: Il server ora gestisce il calcolo del saldo_neu automaticamente.
    // Il calcolo locale in questa funzione serve solo per visualizzare lo storico dettagliato e le scadenze.
    // Non aggiorniamo più il database da qui per evitare inconsistenze.

    await loadUser();
  };

  const transazioniUtente = transazioni
    .filter((t) => String(t.a_utente_id) === String(user?.id) || String(t.da_utente_id) === String(user?.id))
    .filter((t) => {
      // Filtra per tipo
      if (filtroTipo !== 'tutti' && t.tipo !== filtroTipo) return false;

      // Filtra per anno
      if (filtroAnno !== 'tutti') {
        const annoTrans = new Date(t.data_transazione).getFullYear().toString();
        if (annoTrans !== filtroAnno) return false;
      }

      // Filtra per ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const causale = (t.causale || '').toLowerCase();
        const tipo = (t.tipo || '').toLowerCase();
        return causale.includes(searchLower) || tipo.includes(searchLower);
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.data_transazione || 0);
      const dateB = new Date(b.data_transazione || 0);
      return dateB - dateA; // Descending
    });

  const trasferisciNEUMutation = useMutation({
    mutationFn: async (data) => {
      const importo = parseFloat(data.importo);

      if (importo <= 0) throw new Error('Importo deve essere maggiore di 0');
      if (importo > (user?.saldo_neu || 0)) throw new Error('Saldo insufficiente');

      let causaleFinale = data.causale;
      let tipo = 'trasferimento_soci';
      let destinatarioId = null;
      let emailSubject = '';
      let emailBody = '';

      if (data.tipoDestinatario === 'associazione') {
        tipo = 'pagamento_associazione';
        const motivoLabel = data.motivoAssociazione === 'postazione' ? 'Pagamento postazione coworking' : 'Saldo quota annua';
        causaleFinale = causaleFinale || motivoLabel;
        emailSubject = `Pagamento NEU - ${motivoLabel}`;
        emailBody = `<h2>Pagamento NEU</h2><p>Da: ${user.full_name}</p><p>Importo: ${importo}</p>`;
      } else {
        const destinatario = soci.find((s) => s.email === data.destinatario_email);
        if (!destinatario) throw new Error('Socio destinatario non trovato');
        destinatarioId = destinatario.id;
        causaleFinale = causaleFinale || `Trasferimento NEU da ${user.full_name}`;
        emailSubject = 'Trasferimento NEU tra soci';
        emailBody = `<h2>Trasferimento NEU</h2><p>Da: ${user.full_name}</p><p>A: ${destinatario.full_name}</p><p>Importo: ${importo}</p>`;
      }

      const result = await neunoi.entities.TransazioneNEU.create({
        da_utente_id: user.id,
        a_utente_id: destinatarioId,
        importo: importo,
        tipo: tipo,
        causale: causaleFinale,
        data_transazione: new Date().toISOString()
      });

      // Background Email
      neunoi.integrations.Core.SendEmail({
        to: 'admin@neunoi.it',
        subject: emailSubject,
        html: emailBody
      }).catch(e => console.error('Email error', e));

      return result;
    },
    onSuccess: () => {
      // Refresh current user and transactions list
      queryClient.invalidateQueries({ queryKey: ['transazioni'] });
      queryClient.invalidateQueries({ queryKey: ['auth_user'] });

      // Update balance by re-fetching user profile
      loadUser();

      // Show success in UI
      setTrasferimentoCompletato(true);

      // Reset and close
      setTimeout(() => {
        setDialogOpen(false);
        setTrasferimentoCompletato(false);
        setFormData({ destinatario_email: '', tipoDestinatario: 'socio', motivoAssociazione: '', importo: '', causale: '' });
      }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Errore nel trasferimento');
    }
  });

  const handleTrasferisci = (e) => {
    e.preventDefault();
    trasferisciNEUMutation.mutate(formData);
  };

  const getTipoColor = (tipo) => {
    const colors = {
      turno_host: 'bg-green-100 text-green-800',
      compito_specifico: 'bg-blue-100 text-blue-800',
      voto_annuale: 'bg-purple-100 text-purple-800',
      trasferimento_soci: 'bg-orange-100 text-orange-800',
      pagamento_associazione: 'bg-red-100 text-red-800',
      correzione_admin: 'bg-slate-100 text-slate-800',
      volontariato: 'bg-cyan-100 text-cyan-800'
    };
    return colors[tipo] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  if (isAssociazione) {
    return (
      <div className="space-y-6">
        <div className="bg-[#053c5e] text-white p-8">
          <h1 className="text-4xl font-bold">Profilo Associazione</h1>
          <p className="text-lg opacity-90 mt-2">Questo è un profilo dipendente - non riceve NEU</p>
        </div>
        <div className="bg-[#bfdbf7] p-8 text-center border-l-4 border-[#db222a]">
          <p className="text-[#053c5e] text-lg">
            I turni per questo profilo vengono registrati solo per la gestione del calendario, ma non generano crediti NEU.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#053c5e]">Banca NEU</h1>
          <p className="text-[#1f7a8c] mt-2">Gestisci il tuo saldo e le transazioni</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#db222a] hover:bg-[#053c5e] text-white w-full sm:w-auto">

            <Send className="w-4 h-4 mr-2" />
            Trasferisci NEU
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#053c5e] text-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-6 h-6 text-[#bfdbf7]" />
            <h2 className="text-lg font-bold">Saldo Totale NEU</h2>
          </div>
          <div className="text-5xl font-bold">
            {Math.round((user?.saldo_neu || 0) * 100) / 100}
          </div>
        </div>

        <div className="bg-[#db222a] text-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-bold">NEU in Scadenza</h2>
          </div>
          <div className="text-5xl font-bold">
            {Math.round((user?.saldo_neu_scadenza || 0) * 100) / 100}
          </div>
          <p className="text-sm mt-2 opacity-90">
            Scadono il 31/12/{new Date().getFullYear()}
          </p>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#bfdbf7] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-6 h-6 text-[#053c5e]" />
            <h2 className="text-xl font-bold text-[#053c5e]">Transazioni</h2>
          </div>

          <div className="space-y-3 mb-4">
            <Input
              placeholder="Cerca transazione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i tipi</SelectItem>
                  <SelectItem value="trasferimento_soci">Trasferimenti soci</SelectItem>
                  <SelectItem value="compito_specifico">Compiti specifici</SelectItem>
                  <SelectItem value="voto_annuale">Voti annuali</SelectItem>
                  <SelectItem value="pagamento_associazione">Pagamenti</SelectItem>
                  <SelectItem value="correzione_admin">Correzioni admin</SelectItem>
                  <SelectItem value="volontariato">Volontariato</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroAnno} onValueChange={setFiltroAnno}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli anni</SelectItem>
                  {anniDisponibili.map(anno => (
                    <SelectItem key={anno} value={anno}>{anno}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {transazioniUtente.filter((t) => t.tipo !== 'turno_host').length === 0 ?
              <p className="text-center text-[#053c5e] py-8">
                Nessuna altra transazione
              </p> :

              transazioniUtente.filter((t) => t.tipo !== 'turno_host').map((trans) => {
                const isEntrata = String(trans.a_utente_id) === String(user?.id);

                // Determina il nome della controparte
                let controparte = '';
                if (trans.tipo === 'trasferimento_soci') {
                  if (isEntrata) {
                    // Ho ricevuto NEU - cerca il mittente
                    const mittente = soci.find((s) => String(s.id) === String(trans.da_utente_id));
                    controparte = mittente ? `da ${mittente.full_name}` : '';
                  } else {
                    // Ho inviato NEU - cerca il destinatario
                    const destinatario = soci.find((s) => String(s.id) === String(trans.a_utente_id));
                    controparte = destinatario ? `a ${destinatario.full_name}` : '';
                  }
                } else if (isEntrata && !trans.da_utente_id) {
                  controparte = 'da neu [nòi]';
                } else if (!isEntrata && !trans.a_utente_id) {
                  controparte = 'a neu [nòi]';
                }

                return (
                  <div key={trans.id} className="flex items-start justify-between p-4 bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-1 bg-[#1f7a8c] text-white">
                          {trans.tipo.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {isEntrata ?
                          <TrendingUp className="w-4 h-4 text-[#053c5e]" /> :

                          <TrendingDown className="w-4 h-4 text-[#db222a]" />
                        }
                      </div>
                      <p className="text-sm font-semibold text-[#053c5e]">{trans.causale}</p>
                      {controparte && (
                        <p className="text-xs text-[#053c5e] font-medium mt-1">{controparte}</p>
                      )}
                      <p className="text-xs text-[#1f7a8c] mt-1">
                        {new Date(trans.data_transazione).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className={`text-xl font-bold ${isEntrata ? 'text-[#053c5e]' : 'text-[#db222a]'}`}>
                      {isEntrata ? '+' : '-'}{trans.importo}
                    </div>
                  </div>);

              })
            }
          </div>
        </div>

        <div className="bg-[#1f7a8c] text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              <h2 className="text-xl font-bold">NEU da Turni Host</h2>
            </div>
            <div className="text-3xl font-bold">
              {(() => {
                const turniUtente = turniHost.filter(t => {
                  if (t.utente_id !== user?.id) return false;
                  if (filtroAnno !== 'tutti') {
                    const annoTurno = new Date(t.data_inizio).getFullYear().toString();
                    if (annoTurno !== filtroAnno) return false;
                  }
                  return true;
                });
                const neuTotali = turniUtente.reduce((sum, t) => sum + (t.neu_guadagnati || 0), 0);
                return Math.round(neuTotali * 100) / 100;
              })()}
            </div>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {turniHost.filter(t => {
              if (t.utente_id !== user?.id) return false;
              if (filtroAnno !== 'tutti') {
                const annoTurno = new Date(t.data_inizio).getFullYear().toString();
                return annoTurno === filtroAnno;
              }
              return true;
            }).length === 0 ?
              <p className="text-center py-8 opacity-90">
                Nessun turno host registrato
              </p> :

              turniHost.filter(t => {
                if (t.utente_id !== user?.id) return false;
                if (filtroAnno !== 'tutti') {
                  const annoTurno = new Date(t.data_inizio).getFullYear().toString();
                  return annoTurno === filtroAnno;
                }
                return true;
              }).map((turno) =>
                <div key={turno.id} className="flex items-start justify-between p-4 bg-[#053c5e]">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {new Date(turno.data_inizio).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })} - {turno.ore_lavorate}h
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(turno.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(turno.data_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-xl font-bold">
                    +{turno.neu_guadagnati}
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {user && <RiepilogoOreTurni turni={turniHost} userId={user.id} />}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!trasferimentoCompletato && !trasferisciNEUMutation.isPending) {
          setDialogOpen(open);
          if (!open) {
            setFormData({ destinatario_email: '', tipoDestinatario: 'socio', motivoAssociazione: '', importo: '', causale: '' });
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trasferisci NEU</DialogTitle>
          </DialogHeader>

          {trasferimentoCompletato ? (
            <div className="py-12 text-center">
              <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-[#053c5e] mb-3">
                Trasferimento Completato!
              </h3>
              <p className="text-lg text-[#1f7a8c] font-semibold">
                ✅ I NEU sono stati trasferiti con successo
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Questa finestra si chiuderà automaticamente...
              </p>
            </div>
          ) : (
            <form onSubmit={handleTrasferisci} className="space-y-4">
              <div>
                <Label>A chi vuoi trasferire?</Label>
                <Select
                  value={formData.tipoDestinatario}
                  onValueChange={(value) => setFormData({ ...formData, tipoDestinatario: value, destinatario_id: '', motivoAssociazione: '' })}
                  required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socio">Ad un Socio/a</SelectItem>
                    <SelectItem value="associazione">All'Associazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipoDestinatario === 'socio' ? (
                <div>
                  <Label>Socio/a Destinatario</Label>
                  <Select
                    value={formData.destinatario_email}
                    onValueChange={(value) => setFormData({ ...formData, destinatario_email: value })}
                    required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {soci.map((socio) => (
                        <SelectItem key={socio.email} value={socio.email}>
                          {socio.full_name} ({socio.email})
                        </SelectItem>
                      ))}
                      {soci.length === 0 && (
                        <SelectItem value="none" disabled>Nessun socio trovato</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Motivo del Pagamento</Label>
                  <Select
                    value={formData.motivoAssociazione}
                    onValueChange={(value) => setFormData({ ...formData, motivoAssociazione: value })}
                    required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postazione">Pagamento Postazione Coworking</SelectItem>
                      <SelectItem value="quota_annua">Saldo Quota Annua</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Importo NEU</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={user?.saldo_neu || 0}
                  value={formData.importo}
                  onChange={(e) => setFormData({ ...formData, importo: e.target.value })}
                  placeholder="0.00"
                  required />

                <p className="text-xs text-[#1f7a8c] mt-1">
                  Saldo disponibile: {Math.round((user?.saldo_neu || 0) * 100) / 100} NEU
                </p>
              </div>

              <div>
                <Label>{formData.tipoDestinatario === 'associazione' ? 'Note (opzionale)' : 'Causale'}</Label>
                <Textarea
                  value={formData.causale}
                  onChange={(e) => setFormData({ ...formData, causale: e.target.value })}
                  placeholder={formData.tipoDestinatario === 'associazione' ? 'Note aggiuntive...' : 'Motivo del trasferimento...'}
                  rows={3} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}>

                  Annulla
                </Button>
                <Button
                  type="submit"
                  className="bg-[#db222a] hover:bg-[#053c5e]"
                  disabled={trasferisciNEUMutation.isPending}>

                  {trasferisciNEUMutation.isPending ? 'Trasferimento...' : 'Trasferisci'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>);

}
