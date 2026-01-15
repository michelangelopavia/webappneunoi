import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, CheckCircle, AlertCircle, Trash2, Search, RefreshCw, Download, Mail, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';

import { generateRicevutaPDF } from '@/utils/receiptGenerator';

export default function GestioneAbbonamenti() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  // Existing/Restored State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ingressoDialogOpen, setIngressoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [abbonamentoDaEliminare, setAbbonamentoDaEliminare] = useState(null);
  const [selectedAbbonamento, setSelectedAbbonamento] = useState(null);
  const [durataIngresso, setDurataIngresso] = useState('mezza_giornata');
  const [dataIngresso, setDataIngresso] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'carnet', 'abbonamento'
  const [rinnovaDialogOpen, setRinnovaDialogOpen] = useState(false);
  const [abbonamentoDaRinnovare, setAbbonamentoDaRinnovare] = useState(null);
  const [metodoPagamentoRinnovo, setMetodoPagamentoRinnovo] = useState('non_pagato');
  const [formData, setFormData] = useState({
    profilo_coworker_id: '',
    tipo_abbonamento_id: '',
    data_inizio: new Date().toISOString().split('T')[0]
  });

  // New History State
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [selectedProfileForOrders, setSelectedProfileForOrders] = useState(null);

  const [selectedAbbonamentoHistory, setSelectedAbbonamentoHistory] = useState(null);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [editEntryData, setEditEntryData] = useState({
    data_ingresso: '',
    durata: ''
  });

  const { data: profili = [] } = useQuery({
    queryKey: ['profili'],
    queryFn: () => neunoi.entities.ProfiloCoworker.list('-created_date'),
    initialData: []
  });

  const { data: tipiAbbonamento = [] } = useQuery({
    queryKey: ['tipi_abbonamento'],
    queryFn: () => neunoi.entities.TipoAbbonamento.filter({ attivo: true }),
    initialData: []
  });

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ['abbonamenti'],
    queryFn: () => neunoi.entities.AbbonamentoUtente.list('-data_inizio'),
    initialData: []
  });

  const { data: ingressiAbbonamento = [], isLoading: ingressiLoading } = useQuery({
    queryKey: ['ingressi', selectedAbbonamentoHistory?.id],
    queryFn: () => neunoi.entities.IngressoCoworking.filter({
      abbonamento_id: selectedAbbonamentoHistory?.id
    }, '-data_ingresso'),
    enabled: !!selectedAbbonamentoHistory,
    initialData: []
  });

  const { data: profiloOrdini = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['ordini', 'profilo', selectedProfileForOrders?.profilo_coworker_id],
    queryFn: () => neunoi.entities.OrdineCoworking.filter({
      profilo_coworker_id: selectedProfileForOrders?.profilo_coworker_id
    }, '-data_ordine'),
    enabled: !!selectedProfileForOrders,
    initialData: []
  });

  const sendReceiptMutation = useMutation({
    mutationFn: async (ordine) => {
      await neunoi.coworking.sendReceipt(ordine.id);
    },
    onSuccess: () => toast.success('Ricevuta inviata per email'),
    onError: () => toast.error('Errore durante l\'invio')
  });

  const creaMutation = useMutation({
    mutationFn: async (data) => {
      const tipo = tipiAbbonamento.find(t => t.id === data.tipo_abbonamento_id);
      const profilo = profili.find(p => p.id === data.profilo_coworker_id);

      const dataInizio = new Date(data.data_inizio);
      let dataScadenza = new Date(dataInizio);

      if (tipo.durata_mesi) {
        dataScadenza.setMonth(dataScadenza.getMonth() + tipo.durata_mesi);
      } else if (tipo.durata_giorni) {
        dataScadenza.setDate(dataScadenza.getDate() + tipo.durata_giorni);
      }

      await neunoi.entities.AbbonamentoUtente.create({
        user_id: profilo.user_id,
        profilo_coworker_id: data.profilo_coworker_id,
        profilo_nome_completo: `${profilo.first_name} ${profilo.last_name}`,
        tipo_abbonamento_id: data.tipo_abbonamento_id,
        tipo_abbonamento_nome: tipo.nome,
        data_inizio: dataInizio.toISOString().split('T')[0],
        data_scadenza: dataScadenza.toISOString().split('T')[0],
        ingressi_totali: tipo.numero_ingressi || 0,
        ingressi_usati: 0,
        ore_sale_totali: (tipo.ore_sale_incluse || 0) + (tipo.crediti_sala || 0),
        ore_sale_usate: 0,
        stato: 'attivo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      setDialogOpen(false);
      setFormData({ profilo_coworker_id: '', tipo_abbonamento_id: '', data_inizio: new Date().toISOString().split('T')[0] });
      toast.success('Abbonamento creato');
    }
  });

  const updateIngressoMutation = useMutation({
    mutationFn: async ({ id, oldEntry, newData, abbonamento }) => {
      const oldCost = oldEntry.ingressi_consumati; // Assumes this is stored correctly (1 or 2)
      const newCost = newData.durata === 'mezza_giornata' ? 1 : 2;
      const diff = newCost - oldCost;

      // 1. Update Ingresso
      const dataIngressoObj = new Date(newData.data_ingresso);
      // Preserve time or set explicitly? Usually setting to noon to avoid timezone issues with date-only storage is safe
      dataIngressoObj.setHours(12, 0, 0, 0);

      await neunoi.entities.IngressoCoworking.update(id, {
        data_ingresso: dataIngressoObj.toISOString(),
        durata: newData.durata,
        ingressi_consumati: newCost
      });

      // 2. Update Subscription Balance (only if cost changed)
      if (diff !== 0) {
        const currentUsage = abbonamento.ingressi_usati || 0;
        await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
          ingressi_usati: currentUsage + diff
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingressi'] });
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      setEditEntryDialogOpen(false);
      setEntryToEdit(null);
      toast.success('Ingresso aggiornato');
    }
  });

  const registraIngressoMutation = useMutation({
    mutationFn: async ({ abbonamento, durata, dataIngresso }) => {
      const ingressiDaScalare = durata === 'mezza_giornata' ? 1 : 2;

      const dataIngressoObj = new Date(dataIngresso);
      dataIngressoObj.setHours(12, 0, 0, 0);

      await neunoi.entities.IngressoCoworking.create({
        profilo_coworker_id: abbonamento.profilo_coworker_id,
        profilo_nome_completo: abbonamento.profilo_nome_completo,
        abbonamento_id: abbonamento.id,
        data_ingresso: dataIngressoObj.toISOString(),
        durata: durata,
        ingressi_consumati: ingressiDaScalare,
        tipo_ingresso: 'carnet',
        registrato_da: (await neunoi.auth.me()).id
      });

      await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
        ingressi_usati: (abbonamento.ingressi_usati || 0) + ingressiDaScalare
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['ingressi'] });
      queryClient.invalidateQueries({ queryKey: ['attivita_giorno'] });
      setIngressoDialogOpen(false);
      setSelectedAbbonamento(null);
      setDataIngresso(new Date().toISOString().split('T')[0]);
      toast.success('Ingresso registrato');
    },
    onError: (error) => {
      toast.error('Errore registrazione ingresso: ' + (error.message || 'errore sconosciuto'));
    }
  });

  const annullaMutation = useMutation({
    mutationFn: async (abbonamento) => {
      // 1. Mark subscription as cancelled
      await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
        stato: 'annullato',
        attivo: false
      });

      // 2. If it has a linked order, mark order as cancelled (storno)
      if (abbonamento.riferimento_ordine_id) {
        await neunoi.entities.OrdineCoworking.update(abbonamento.riferimento_ordine_id, {
          stato: 'annullato'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['ordini'] });
      setDeleteDialogOpen(false);
      setAbbonamentoDaEliminare(null);
      toast.success('Abbonamento annullato (storno registrato)');
    }
  });

  const rinnovaMutation = useMutation({
    mutationFn: async ({ abbonamento, metodoPagamento }) => {
      // 1. Find the profile based on email if possible, fallback to ID
      // This is more robust as requested by user
      const sourceProfile = profili.find(p => String(p.id) === String(abbonamento.profilo_coworker_id));
      const emailToMatch = sourceProfile?.email || abbonamento.profilo_email;

      const profilo = profili.find(p => p.email?.toLowerCase() === emailToMatch?.toLowerCase()) || sourceProfile;
      const tipo = tipiAbbonamento.find(t => String(t.id) === String(abbonamento.tipo_abbonamento_id));

      if (!profilo) throw new Error("Profilo socio non trovato. Impossibile procedere con il rinnovo.");
      if (!tipo) throw new Error("Tipo abbonamento non trovato.");

      // PREPARA PRODOTTI (Must be JSON string for the DB)
      const prodottiArray = [{
        tipo_abbonamento_id: abbonamento.tipo_abbonamento_id,
        tipo_abbonamento_nome: abbonamento.tipo_abbonamento_nome,
        quantita: 1,
        prezzo_unitario: tipo.prezzo,
        prezzo_totale: tipo.prezzo
      }];

      // Crea ordine
      const ordine = await neunoi.entities.OrdineCoworking.create({
        user_id: profilo.user_id,
        profilo_coworker_id: profilo.id,
        profilo_nome_completo: profilo.first_name ? `${profilo.first_name} ${profilo.last_name}` : abbonamento.profilo_nome_completo,
        profilo_email: profilo.email,
        data_ordine: new Date().toISOString().split('T')[0],
        prodotti: JSON.stringify(prodottiArray),
        totale: tipo.prezzo,
        metodo_pagamento: metodoPagamento,
        stato_pagamento: metodoPagamento === 'non_pagato' ? 'non_pagato' : 'pagato',
        note: `Rinnovo abbonamento (${abbonamento.tipo_abbonamento_nome})`,
        registrato_da: (await neunoi.auth.me()).id
      });

      // Nuove date...
      const dataInizio = new Date(abbonamento.data_scadenza);
      dataInizio.setDate(dataInizio.getDate() + 1);
      dataInizio.setHours(12, 0, 0, 0);

      let dataScadenza = new Date(dataInizio);
      if (tipo.durata_mesi) {
        dataScadenza.setMonth(dataScadenza.getMonth() + tipo.durata_mesi);
      } else if (tipo.durata_giorni) {
        dataScadenza.setDate(dataScadenza.getDate() + tipo.durata_giorni);
      }
      dataScadenza.setHours(12, 0, 0, 0);

      await neunoi.entities.AbbonamentoUtente.create({
        user_id: profilo.user_id,
        profilo_coworker_id: profilo.id,
        profilo_nome_completo: profilo.first_name ? `${profilo.first_name} ${profilo.last_name}` : abbonamento.profilo_nome_completo,
        tipo_abbonamento_id: abbonamento.tipo_abbonamento_id,
        tipo_abbonamento_nome: abbonamento.tipo_abbonamento_nome,
        data_inizio: dataInizio.toISOString().split('T')[0],
        data_scadenza: dataScadenza.toISOString().split('T')[0],
        ingressi_totali: tipo.numero_ingressi || 0,
        ingressi_usati: 0,
        ore_sale_totali: (tipo.ore_sale_incluse || 0) + (tipo.crediti_sala || 0),
        ore_sale_usate: 0,
        stato: 'attivo',
        riferimento_ordine_id: ordine.id
      });

      // Se non pagato, crea task reminder
      // Task reminder creation removed to avoid duplication with NotificheHost auto-detection

      return { ...ordine, prodotti: prodottiArray };
    },
    onSuccess: (ordine) => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['ordini'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['attivita_giorno'] });
      setRinnovaDialogOpen(false);
      setAbbonamentoDaRinnovare(null);
      setMetodoPagamentoRinnovo('non_pagato');
      toast.success('Abbonamento rinnovato e ordine creato');

      // Genera ricevuta
      setTimeout(() => {
        const profilo = profili.find(p => String(p.id) === String(ordine.profilo_coworker_id));
        generateRicevutaPDF(ordine, null, profilo);
      }, 500);
    },
    onError: (error) => {
      console.error('Renewal Error:', error);
      toast.error('Errore durante il rinnovo: ' + (error.message || 'Errore tecnico'));
    }
  });

  const openAnnullaAbbonamento = (abbonamento) => {
    setAbbonamentoDaEliminare(abbonamento);
    setDeleteDialogOpen(true);
  };

  const openRegistraIngresso = (abbonamento) => {
    setSelectedAbbonamento(abbonamento);
    setDurataIngresso('mezza_giornata');
    setDataIngresso(new Date().toISOString().split('T')[0]);
    setIngressoDialogOpen(true);
  };

  const getStatoColor = (abb) => {
    const oggi = new Date();
    const scadenza = new Date(abb.data_scadenza);
    const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));

    if (giorni <= 0) return 'bg-red-100 text-red-800';
    if (giorni <= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const abbonamentiAttivi = abbonamenti.filter(a => {
    const oggi = new Date();
    const scadenza = new Date(a.data_scadenza);
    const matchSearch = !searchTerm ||
      a.profilo_nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tipo_abbonamento_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const isCarnet = a.ingressi_totali > 0;
    const matchType = filterType === 'all' ||
      (filterType === 'carnet' && isCarnet) ||
      (filterType === 'abbonamento' && !isCarnet);

    return a.stato === 'attivo' && scadenza >= oggi && matchSearch && matchType;
  });

  const abbonamentiScaduti = abbonamenti.filter(a => {
    const oggi = new Date();
    const scadenza = new Date(a.data_scadenza);
    const matchSearch = !searchTerm ||
      a.profilo_nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tipo_abbonamento_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const isCarnet = a.ingressi_totali > 0;
    const matchType = filterType === 'all' ||
      (filterType === 'carnet' && isCarnet) ||
      (filterType === 'abbonamento' && !isCarnet);

    return (a.stato === 'scaduto' || scadenza < oggi) && matchSearch && matchType;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Abbonamenti Attivi ({abbonamentiAttivi.length})</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca per nome o tipo abbonamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtra tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="carnet">Solo Carnet</SelectItem>
                <SelectItem value="abbonamento">Solo Abbonamenti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {abbonamentiAttivi.map(abb => (
              <div key={abb.id} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-[#053c5e]">{abb.profilo_nome_completo}</span>
                      <Badge className="bg-[#1f7a8c] text-white">{abb.tipo_abbonamento_nome}</Badge>
                      <Badge className={getStatoColor(abb)}>
                        {(() => {
                          const parseDate = (val) => {
                            if (!val) return new Date();
                            if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
                            const str = val.toString().split('T')[0];
                            const [y, m, d] = str.split('-').map(Number);
                            if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
                            return new Date(y, m - 1, d);
                          };
                          const scadenza = parseDate(abb.data_scadenza);
                          const oggi = new Date();
                          oggi.setHours(0, 0, 0, 0);
                          const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
                          return giorni <= 0 ? 'Scaduto' : `${giorni}g`;
                        })()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-slate-500">Scadenza</div>
                        <div className="font-semibold">{new Date(abb.data_scadenza).toLocaleDateString('it-IT')}</div>
                      </div>
                      {abb.ingressi_totali > 0 && (
                        <div>
                          <div className="text-slate-500">Ingressi</div>
                          <div className="font-semibold">{abb.ingressi_usati}/{abb.ingressi_totali}</div>
                        </div>
                      )}
                      {abb.ore_sale_totali > 0 && (
                        <div>
                          <div className="text-slate-500">Ore Sale</div>
                          <div className="font-semibold">{abb.ore_sale_usate}/{abb.ore_sale_totali}h</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {abb.ingressi_totali > 0 && abb.ingressi_usati < abb.ingressi_totali && (
                      <Button size="sm" onClick={() => openRegistraIngresso(abb)} className="bg-[#1f7a8c] hover:bg-[#053c5e]">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Registra Ingresso
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAbbonamentoDaRinnovare(abb);
                        setRinnovaDialogOpen(true);
                      }}
                      className="border-[#053c5e] text-[#053c5e] hover:bg-[#053c5e] hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Rinnova
                    </Button>
                    {abb.ingressi_totali > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedAbbonamentoHistory(abb);
                          setHistoryDialogOpen(true);
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Storico
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedProfileForOrders(abb);
                        setOrdersDialogOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Ricevute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => openAnnullaAbbonamento(abb)}
                      title="Annulla Abbonamento (Storno)"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {abbonamentiAttivi.length === 0 && (
              <p className="text-center text-slate-500 py-8">Nessun abbonamento attivo</p>
            )}
          </div>
        </CardContent>
      </Card >

      {
        abbonamentiScaduti.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Storico Abbonamenti ({abbonamentiScaduti.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {abbonamentiScaduti.map(abb => (
                  <div key={abb.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-600">{abb.profilo_nome_completo}</span>
                          <Badge className="bg-slate-400 text-white">{abb.tipo_abbonamento_nome}</Badge>
                          <Badge className="bg-red-100 text-red-800">Scaduto</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
                          <div>
                            <div className="text-slate-500">Scadenza</div>
                            <div className="font-semibold">{new Date(abb.data_scadenza).toLocaleDateString('it-IT')}</div>
                          </div>
                          {abb.ingressi_totali > 0 && (
                            <div>
                              <div className="text-slate-500">Ingressi</div>
                              <div className="font-semibold">{abb.ingressi_usati}/{abb.ingressi_totali}</div>
                            </div>
                          )}
                          {abb.ore_sale_totali > 0 && (
                            <div>
                              <div className="text-slate-500">Ore Sale</div>
                              <div className="font-semibold">{abb.ore_sale_usate}/{abb.ore_sale_totali}h</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => openAnnullaAbbonamento(abb)}
                        title="Annulla Abbonamento (Storno)"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      < AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Annullamento (Storno)</AlertDialogTitle>
            <AlertDialogDescription>
              {abbonamentoDaEliminare && (
                <>
                  Sei sicuro di voler annullare l'abbonamento di <strong>{abbonamentoDaEliminare.profilo_nome_completo}</strong>?
                  <br />
                  <span className="text-sm text-slate-600">
                    Tipo: {abbonamentoDaEliminare.tipo_abbonamento_nome}
                  </span>
                  <br />
                  <span className="text-red-600 font-semibold">
                    L'abbonamento verrà disattivato e il relativo ordine verrà marcato come ANNULLATO (Storno) nell'archivio ricevute.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => annullaMutation.mutate(abbonamentoDaEliminare)}
              className="bg-red-600 hover:bg-red-700"
            >
              Conferma Annullamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      <Dialog open={rinnovaDialogOpen} onOpenChange={setRinnovaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinnova Abbonamento</DialogTitle>
          </DialogHeader>
          {abbonamentoDaRinnovare && (
            <div className="space-y-4">
              <div className="bg-[#bfdbf7] p-4 rounded-lg">
                <div className="font-bold text-[#053c5e] mb-2">{abbonamentoDaRinnovare.profilo_nome_completo}</div>
                <div className="text-sm">
                  Abbonamento: {abbonamentoDaRinnovare.tipo_abbonamento_nome}
                </div>
                <div className="text-sm">
                  Data inizio nuovo: {new Date(new Date(abbonamentoDaRinnovare.data_scadenza).getTime() + 86400000).toLocaleDateString('it-IT')}
                </div>
              </div>

              <div>
                <Label>Metodo di Pagamento *</Label>
                <Select value={metodoPagamentoRinnovo} onValueChange={setMetodoPagamentoRinnovo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_pagato">Non Pagato</SelectItem>
                    <SelectItem value="contanti">Contanti</SelectItem>
                    <SelectItem value="carta">Carta di Credito/Bancomat</SelectItem>
                    <SelectItem value="bonifico">Bonifico</SelectItem>
                    <SelectItem value="neu">NEU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRinnovaDialogOpen(false)}>Annulla</Button>
                <Button
                  onClick={() => rinnovaMutation.mutate({
                    abbonamento: abbonamentoDaRinnovare,
                    metodoPagamento: metodoPagamentoRinnovo
                  })}
                  className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                  disabled={rinnovaMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Conferma Rinnovo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ingressoDialogOpen} onOpenChange={setIngressoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Ingresso</DialogTitle>
          </DialogHeader>
          {selectedAbbonamento && (
            <div className="space-y-4">
              <div className="bg-[#bfdbf7] p-4 rounded-lg">
                <div className="font-bold text-[#053c5e] mb-2">{selectedAbbonamento.profilo_nome_completo}</div>
                <div className="text-sm">
                  Abbonamento: {selectedAbbonamento.tipo_abbonamento_nome}
                </div>
                <div className="text-sm">
                  Ingressi rimanenti: {selectedAbbonamento.ingressi_totali - selectedAbbonamento.ingressi_usati}
                </div>
              </div>

              <div>
                <Label>Data Ingresso *</Label>
                <Input
                  type="date"
                  value={dataIngresso}
                  onChange={(e) => setDataIngresso(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Puoi registrare ingressi anche in date passate
                </p>
              </div>

              <div>
                <Label>Durata Ingresso *</Label>
                <Select value={durataIngresso} onValueChange={setDurataIngresso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mezza_giornata">Mezza Giornata (1 ingresso)</SelectItem>
                    <SelectItem value="giornata_intera">Giornata Intera (2 ingressi)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  La misura minima è mezza giornata
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIngressoDialogOpen(false)}>Annulla</Button>
                <Button
                  onClick={() => registraIngressoMutation.mutate({ abbonamento: selectedAbbonamento, durata: durataIngresso, dataIngresso: dataIngresso })}
                  className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                  disabled={registraIngressoMutation.isPending}
                >
                  Conferma Ingresso
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG STORICO E MODIFICA INGRESSI */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Storico Ingressi - {selectedAbbonamentoHistory?.profilo_nome_completo}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {ingressiLoading ? <p>Caricamento...</p> :
              ingressiAbbonamento.length === 0 ? <p className="text-center py-4 text-slate-500">Nessun ingresso registrato</p> :
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-medium">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Durata</th>
                      <th className="p-3">Consumo</th>
                      <th className="p-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingressiAbbonamento.map(ing => (
                      <tr key={ing.id} className="hover:bg-slate-50">
                        <td className="p-3">{new Date(ing.data_ingresso).toLocaleDateString()}</td>
                        <td className="p-3 capitalize">{ing.durata.replace('_', ' ')}</td>
                        <td className="p-3"><Badge variant="outline">-{ing.ingressi_consumati}</Badge></td>
                        <td className="p-3 text-right">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEntryToEdit(ing);
                                setEditEntryData({
                                  data_ingresso: ing.data_ingresso.split('T')[0],
                                  durata: ing.durata
                                });
                                setEditEntryDialogOpen(true);
                              }}
                            >
                              Modifica
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG RICEVUTE */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ordini e Ricevute - {selectedProfileForOrders?.profilo_nome_completo}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {ordersLoading ? <p>Caricamento...</p> :
              profiloOrdini.length === 0 ? <p className="text-center py-4 text-slate-500">Nessun ordine trovato</p> :
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-medium">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Dettagli</th>
                      <th className="p-3">Importo</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profiloOrdini.map(ordine => (
                      <tr key={ordine.id} className="hover:bg-slate-50">
                        <td className="p-3">{new Date(ordine.data_ordine).toLocaleDateString()}</td>
                        <td className="p-3 max-w-[200px] truncate">
                          {(typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti || '[]') : ordine.prodotti).map(p => p.tipo_abbonamento_nome || p.nome_prodotto || 'Prodotto').join(', ')}
                        </td>
                        <td className="p-3 font-semibold">€{ordine.totale.toFixed(2)}</td>
                        <td className="p-3">
                          <Badge variant={ordine.stato_pagamento === 'pagato' ? 'secondary' : 'outline'} className={ordine.stato_pagamento === 'pagato' ? 'bg-green-100 text-green-800' : ''}>
                            {ordine.stato_pagamento === 'pagato' ? 'Pagato' : 'Non Pagato'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#1f7a8c] hover:bg-slate-100"
                            title="Scarica PDF"
                            onClick={() => {
                              const fullProfile = profili.find(p => p.id === ordine.profilo_coworker_id);
                              generateRicevutaPDF(ordine, null, fullProfile);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#1f7a8c] hover:bg-slate-100"
                            title="Invia Email"
                            onClick={() => sendReceiptMutation.mutate(ordine)}
                            disabled={sendReceiptMutation.isPending}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT INGRESSO */}
      <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ingresso</DialogTitle>
          </DialogHeader>
          {entryToEdit && (
            <div className="space-y-4">
              <div>
                <Label>Data Ingresso</Label>
                <Input
                  type="date"
                  value={editEntryData.data_ingresso}
                  onChange={(e) => setEditEntryData({ ...editEntryData, data_ingresso: e.target.value })}
                />
              </div>
              <div>
                <Label>Durata</Label>
                <Select
                  value={editEntryData.durata}
                  onValueChange={(val) => setEditEntryData({ ...editEntryData, durata: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mezza_giornata">Mezza Giornata (1)</SelectItem>
                    <SelectItem value="giornata_intera">Giornata Intera (2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditEntryDialogOpen(false)}>Annulla</Button>
                <Button
                  className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                  onClick={() => updateIngressoMutation.mutate({
                    id: entryToEdit.id,
                    oldEntry: entryToEdit,
                    newData: editEntryData,
                    abbonamento: selectedAbbonamentoHistory
                  })}
                >
                  Salva Modifiche
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
