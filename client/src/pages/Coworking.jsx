import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CreditCard, AlertCircle, CheckCircle2, Grid, ChevronDown, ChevronUp, History, ShoppingBag, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ProfiloCoworker from '../components/coworking/ProfiloCoworker';
import PrenotaSala from '../components/coworking/PrenotaSala';
import CalendarioGriglia from '../components/coworking/CalendarioGriglia';
import ModificaPrenotazione from '../components/coworking/ModificaPrenotazione';
import { Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';

import { useAuth } from '../hooks/useAuth';

import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';

import { generateRicevutaPDF } from '../utils/receiptGenerator';

import CalendarioTurni from '../components/turni/CalendarioTurni';

export default function Coworking() {
  const { user, isLoading: authLoading } = useAuth();
  const [prenotaExpanded, setPrenotaExpanded] = useState(false);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);
  const [dettagliIngressiOpen, setDettagliIngressiOpen] = useState(false);
  const [selectedAbbonamentoIngressi, setSelectedAbbonamentoIngressi] = useState(null);
  const [registraIngressoOpen, setRegistraIngressoOpen] = useState(false);
  const [durataIngresso, setDurataIngresso] = useState('mezza_giornata');
  const [loadingIngresso, setLoadingIngresso] = useState(false);
  const [showHostCalendar, setShowHostCalendar] = useState(false);

  const queryClient = useQueryClient();

  // Fetch Turni Host for the "Chi è host?" functionality
  const { data: turniHost = [] } = useQuery({
    queryKey: ['turni_host_public'],
    queryFn: () => neunoi.entities.TurnoHost.list('-data_inizio'),
    initialData: [],
    enabled: showHostCalendar // Only fetch when dialog is opened
  });

  // Fetch Profilo for Receipt
  const { data: profilo } = useQuery({
    queryKey: ['profilo_coworker_receipt', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const profili = await neunoi.entities.ProfiloCoworker.filter({ user_id: user.id });
      return profili[0] || null;
    },
    enabled: !!user
  });

  const loading = authLoading;

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ['abbonamenti', 'miei'],
    queryFn: async () => {
      const allAbbonamenti = await neunoi.entities.AbbonamentoUtente.filter({
        user_id: user?.id,
        stato: 'attivo'
      });
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);

      // Filter out expired ones AND exhausted carnets
      return allAbbonamenti.filter(a => {
        const scadenza = new Date(a.data_scadenza);
        scadenza.setHours(23, 59, 59, 999);
        const isNotExpired = scadenza >= oggi;
        const isExhausted = a.ingressi_totali > 0 && (a.ingressi_usati || 0) >= a.ingressi_totali;
        return isNotExpired && !isExhausted;
      });
    },
    enabled: !!user,
    initialData: []
  });

  const abbonamentiAttiviOra = abbonamenti.filter(abb => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const inizio = new Date(abb.data_inizio);
    inizio.setHours(0, 0, 0, 0);
    const scadenza = new Date(abb.data_scadenza);
    scadenza.setHours(23, 59, 59, 999);
    return inizio <= oggi && scadenza >= oggi;
  });

  const { data: prenotazioni = [] } = useQuery({
    queryKey: ['prenotazioni', 'mie'],
    queryFn: () => neunoi.entities.PrenotazioneSala.filter({
      user_id: user?.id
    }, '-id'),
    enabled: !!user,
    initialData: []
  });

  const { data: tuttePrenotazioni = [] } = useQuery({
    queryKey: ['prenotazioni', 'tutte'],
    queryFn: () => neunoi.entities.PrenotazioneSala.filter({ stato: 'confermata' }),
    initialData: []
  });


  const { data: sale = [] } = useQuery({
    queryKey: ['sale_coworker'],
    queryFn: () => neunoi.entities.SalaRiunioni.filter({ attiva: true }),
    initialData: []
  });

  // Fetch Ingressi for history and details
  const { data: ingressi = [] } = useQuery({
    queryKey: ['ingressi', 'miei'],
    queryFn: () => {
      const conditions = [{ user_id: user.id }];
      if (profilo?.id) conditions.push({ profilo_coworker_id: profilo.id });
      return neunoi.entities.IngressoCoworking.filter({
        _or: conditions
      }, '-id');
    },
    enabled: !!user,
    initialData: []
  });

  // Fetch Ordini for history
  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini', 'miei'],
    queryFn: () => neunoi.entities.OrdineCoworking.filter({
      user_id: user?.id
    }, '-id'),
    enabled: !!user,
    initialData: []
  });

  const annullaPrenotazioneMutation = useMutation({
    mutationFn: async (pren) => {
      // 1. Rimborsa i crediti
      const oreDaRimborsare = pren.ore_credito_consumate || 0;
      if (oreDaRimborsare > 0) {
        const abbonamentiUtente = await neunoi.entities.AbbonamentoUtente.filter({
          user_id: user.id,
          stato: 'attivo'
        });

        let daRimborsare = oreDaRimborsare;
        // Rimborsa partendo dall'ultimo abbonamento che ha ore usate
        for (const abb of [...abbonamentiUtente].reverse()) {
          if (daRimborsare <= 0) break;
          const usate = abb.ore_sale_usate || 0;
          if (usate > 0) {
            const amount = Math.min(daRimborsare, usate);
            await neunoi.entities.AbbonamentoUtente.update(abb.id, {
              ore_sale_usate: usate - amount
            });
            daRimborsare -= amount;
          }
        }
      }

      // 2. Annulla la prenotazione
      await neunoi.entities.PrenotazioneSala.update(pren.id, {
        stato: 'annullata'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
      toast.success('Prenotazione annullata');
      setDeleteDialogOpen(false);
      setSelectedPrenotazione(null);
    }
  });

  const registraIngressoMutation = useMutation({
    mutationFn: async (abbonamento) => {
      const ingressiDaScalare = durataIngresso === 'mezza_giornata' ? 1 : 2;
      const dataIngresso = new Date();
      dataIngresso.setHours(12, 0, 0, 0);

      // 1. Crea Ingresso
      await neunoi.entities.IngressoCoworking.create({
        user_id: user.id,
        profilo_coworker_id: abbonamento.profilo_coworker_id,
        profilo_nome_completo: abbonamento.profilo_nome_completo,
        abbonamento_id: abbonamento.id,
        data_ingresso: dataIngresso.toISOString(),
        durata: durataIngresso,
        ingressi_consumati: ingressiDaScalare,
        tipo_ingresso: 'carnet',
        registrato_da: user.id
      });

      // 2. Scala crediti
      await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
        ingressi_usati: (abbonamento.ingressi_usati || 0) + ingressiDaScalare
      });

      // 3. Crea Notifica per Host (Task)
      await neunoi.entities.TaskNotifica.create({
        tipo: 'task_manuale',
        titolo: `Self Check-in: ${abbonamento.profilo_nome_completo}`,
        descrizione: `L'utente ha registrato un ingresso (${durataIngresso === 'mezza_giornata' ? 'Mezza Giornata' : 'Giornata Intera'}) da portale.`,
        creato_da_id: user.id,
        creato_da_nome: user.full_name || abbonamento.profilo_nome_completo,
        destinatario_tipo: 'host',
        data_inizio: new Date().toISOString().split('T')[0],
        priorita: 'normale',
        stato: 'attivo'
      });

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['ingressi'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      setRegistraIngressoOpen(false);
      toast.success('Ingresso registrato con successo');
    },
    onError: (error) => {
      toast.error('Errore durante la registrazione: ' + (error.message || 'errore sconosciuto'));
    }
  });

  if (loading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  const oreSaleTotali = abbonamentiAttiviOra.reduce((sum, abb) =>
    sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0)), 0
  );

  const ingressiTotali = abbonamentiAttiviOra.reduce((sum, abb) =>
    sum + ((abb.ingressi_totali || 0) - (abb.ingressi_usati || 0)), 0
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold">Coworking</h1>
            <p className="text-lg opacity-90 mt-2">Gestisci il tuo abbonamento e prenota le sale</p>
          </div>
          {(user?.roles?.includes('socio') || user?.role === 'socio') && (
            <Button
              className="bg-[#1f7a8c] hover:bg-[#db222a] text-white"
              onClick={() => setShowHostCalendar(true)}
            >
              Chi è host?
            </Button>
          )}
        </div>

        {abbonamentiAttiviOra.some(a => a.ingressi_totali > 0) && (
          <Button
            className="bg-[#db222a] hover:bg-[#1f7a8c] text-white font-bold px-6 shadow-lg mt-6"
            onClick={() => {
              const carnet = abbonamentiAttiviOra.find(a => a.ingressi_totali > 0);
              setSelectedAbbonamentoIngressi(carnet);
              setRegistraIngressoOpen(true);
            }}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            REGISTRA INGRESSO
          </Button>
        )}
      </div>

      {/* Stato Abbonamento */}
      {
        abbonamenti.length > 0 ?
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#1f7a8c]" />
                {abbonamenti.length === 1 ? 'Il tuo Abbonamento' : `I tuoi Abbonamenti (${abbonamenti.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Riepilogo in griglia: Tipo abbonamento (verde) e Ore sale (celeste) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {abbonamenti.map((abb) => {
                    const oggi = new Date();
                    oggi.setHours(0, 0, 0, 0);

                    const parseDate = (val) => {
                      if (!val) return new Date();
                      // Se è già un oggetto Date, usalo
                      if (val instanceof Date) return new Date(val.getFullYear(), val.getMonth(), val.getDate());
                      // Se è una stringa, prendi solo la parte YYYY-MM-DD
                      const str = val.toString().split('T')[0];
                      const [y, m, d] = str.split('-').map(Number);
                      if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
                      return new Date(y, m - 1, d);
                    };

                    const inizio = parseDate(abb.data_inizio);
                    const scadenza = parseDate(abb.data_scadenza);
                    const isFuturo = inizio > oggi;

                    const giorniRimanenti = Math.max(0, Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24)));

                    return (
                      <div key={abb.id} className={`${isFuturo ? 'bg-orange-50 border-orange-200 border' : 'bg-[#1f7a8c] text-white'} p-4 rounded-none relative`}>
                        <div className={`flex justify-between items-start mb-1`}>
                          <div className={`text-sm ${isFuturo ? 'text-orange-700' : 'opacity-90'}`}>
                            {isFuturo ? 'Abbonamento Futuro' : 'Abbonamento Attivo'}
                          </div>
                          {isFuturo && <Badge variant="outline" className="border-orange-500 text-orange-600 bg-white">Programmato</Badge>}
                        </div>
                        <div className={`text-2xl font-bold ${isFuturo ? 'text-orange-900' : ''}`}>{abb.tipo_abbonamento_nome}</div>
                        <div className={`text-xs mt-2 ${isFuturo ? 'text-orange-700' : 'opacity-90'}`}>
                          {isFuturo ? (
                            <span>Inizia il {inizio.toLocaleDateString('it-IT')}</span>
                          ) : (
                            <span>Scade il {scadenza.toLocaleDateString('it-IT')} ({giorniRimanenti} {giorniRimanenti === 1 ? 'giorno' : 'giorni'})</span>
                          )}
                          {!isFuturo && <span className="block italic mt-1 text-[10px]">Attivo dal {inizio.toLocaleDateString('it-IT')}</span>}
                        </div>

                        {/* View Entries Balance and Button for Carnets */}
                        {abb.ingressi_totali > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-end mb-2">
                              <div>
                                <div className="text-sm opacity-90">Ingressi Rimanenti</div>
                                <div className="text-3xl font-bold">
                                  {(abb.ingressi_totali || 0) - (abb.ingressi_usati || 0)}
                                  <span className="text-sm font-normal opacity-70 ml-1">/ {abb.ingressi_totali}</span>
                                </div>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="bg-white/20 hover:bg-white/30 text-white border-0 h-8"
                                onClick={() => {
                                  setSelectedAbbonamentoIngressi(abb);
                                  setDettagliIngressiOpen(true);
                                }}
                              >
                                <span className="text-xs mr-2">Dettagli</span>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-white h-full rounded-full"
                                style={{ width: `${Math.max(0, Math.min(100, (((abb.ingressi_totali || 0) - (abb.ingressi_usati || 0)) / (abb.ingressi_totali || 1)) * 100))}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {oreSaleTotali > 0 &&
                    <div className="bg-[#bfdbf7] text-white p-4 rounded-none flex flex-col justify-center">
                      <div className="text-slate-700 mb-1 text-sm opacity-90">Ore Carnet Sala Disponibili</div>
                      <div className="text-[#1f7a8c] text-3xl font-bold">{oreSaleTotali}h</div>
                      <div className="text-slate-700 mt-2 text-xs opacity-90">
                        ≈ {Math.floor(oreSaleTotali * 2)}h call o {oreSaleTotali}h riunione
                      </div>
                    </div>
                  }
                </div>
              </div>
            </CardContent>
          </Card> :

          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#053c5e] mb-2">Nessun Abbonamento Attivo</h3>
              <p className="text-[#1f7a8c]">
                Contatta la reception per attivare un abbonamento coworking
              </p>
            </CardContent>
          </Card>
      }

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="h-auto grid w-full grid-cols-1 md:grid-cols-3 bg-[#bfdbf7]">
          <TabsTrigger value="calendario" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Grid className="w-4 h-4 mr-2" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="prenotazioni" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" />
            Le Mie Prenotazioni
          </TabsTrigger>
          <TabsTrigger value="storico" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-6 space-y-4">
          {/* Pulsante Prenota Sala espandibile */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Button
              onClick={() => setPrenotaExpanded(!prenotaExpanded)} className="bg-[#db222a] text-white px-6 py-4 text-xl font-bold rounded-none h-auto w-full hover:bg-[#1f7a8c] justify-between shadow-lg">
              <span className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                PRENOTA SALA
              </span>
              {prenotaExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </Button>

            {prenotaExpanded &&
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <PrenotaSala user={user} abbonamenti={abbonamenti} />
              </div>
            }
          </div>

          <CalendarioGriglia
            sale={sale.filter(s => {
              const isAdmin = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
              if (s.nome?.toLowerCase().includes('eventi') || s.solo_staff) {
                return isAdmin;
              }
              return true;
            })}
            prenotazioni={tuttePrenotazioni.filter(p => {
              const s = sale.find(s => s.id === p.sala_id);
              if (s && (s.nome?.toLowerCase().includes('eventi') || s.solo_staff)) {
                return user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
              }
              return true;
            })} />

        </TabsContent>

        <TabsContent value="prenotazioni" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Le Tue Prenotazioni Attive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prenotazioni.filter((p) => p.stato !== 'annullata' && new Date(p.data_fine) > new Date()).length === 0 ?
                  <p className="text-center text-slate-500 py-8">Nessuna prenotazione attiva o futura</p> :

                  prenotazioni.
                    filter((p) => p.stato !== 'annullata' && new Date(p.data_fine) > new Date()).
                    map((pren) =>
                      <div key={pren.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-bold text-[#053c5e]">{pren.sala_nome}</div>
                          <div className="text-sm text-[#1f7a8c] mt-1">
                            {new Date(pren.data_inizio).toLocaleString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} - {new Date(pren.data_fine).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <Badge className={pren.tipo_utilizzo === 'call' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                            {pren.tipo_utilizzo === 'call' ? 'Call' : 'Riunione'}
                          </Badge>
                        </div>
                        {pren.stato === 'confermata' && new Date(pren.data_inizio) > new Date() &&
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPrenotazione(pren);
                                setEditBookingOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setSelectedPrenotazione(pren);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        }
                      </div>
                    )
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storico" className="mt-6">
          <div className="space-y-6">
            <div className="pt-2">
              <h3 className="text-2xl font-bold text-[#053c5e] mb-6 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" />
                Storico Attività
              </h3>

              <Tabs defaultValue="storico_acquisti" className="w-full">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="storico_acquisti">Acquisti</TabsTrigger>
                  <TabsTrigger value="storico_ingressi">Ingressi</TabsTrigger>
                  <TabsTrigger value="storico_prenotazioni">Prenotazioni Passate</TabsTrigger>
                </TabsList>

                <TabsContent value="storico_acquisti" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {ordini.length === 0 ? <p className="text-center text-slate-500">Nessun acquisto registrato</p> :
                        <div className="space-y-4">
                          {ordini.map(ordine => (
                            <div key={ordine.id} className="flex justify-between items-start border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                              <div>
                                <div className="font-bold text-[#053c5e]">
                                  {new Date(ordine.data_ordine).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {(() => {
                                    try {
                                      const parsed = JSON.parse(ordine.prodotti || '[]');
                                      if (Array.isArray(parsed) && parsed.length > 0) {
                                        return parsed.map(p => p.nome_prodotto || p.nome || 'Prodotto').join(', ');
                                      }
                                      return 'Abbonamento';
                                    } catch (e) {
                                      return ordine.prodotti || 'Abbonamento';
                                    }
                                  })()}
                                </div>
                                {ordine.stato === 'annullato' ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-200 mt-1">Annullato (Storno)</Badge>
                                ) : (
                                  <Badge variant="outline" className="mt-1">{ordine.stato_pagamento === 'pagato' ? 'Pagato' : 'Non Pagato'}</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  €{ordine.totale?.toFixed(2)}
                                  <div className="text-xs font-normal text-slate-500">{ordine.metodo_pagamento}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateRicevutaPDF(ordine, user, profilo)}
                                  className="mt-1 h-6 text-xs text-[#1f7a8c] hover:text-[#053c5e] px-0"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Ricevuta
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="storico_ingressi" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {ingressi.length === 0 ? <p className="text-center text-slate-500">Nessun ingresso registrato</p> :
                        <div className="space-y-4">
                          {ingressi.map(ing => (
                            <div key={ing.id} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded-full">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-[#053c5e]">
                                    {new Date(ing.data_ingresso).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {ing.durata === 'mezza_giornata' ? 'Mezza Giornata (1 Token)' : 'Giornata Intera (2 Token)'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-[#1f7a8c]">
                                -{ing.ingressi_consumati}
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="storico_prenotazioni" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {prenotazioni.filter(p => new Date(p.data_fine) < new Date() || p.stato === 'annullata').length === 0 ? <p className="text-center text-slate-500">Nessuna prenotazione passata</p> :
                        <div className="space-y-4">
                          {prenotazioni.filter(p => new Date(p.data_fine) < new Date() || p.stato === 'annullata').map(pren => (
                            <div key={pren.id} className="flex justify-between items-center border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                              <div>
                                <div className="font-bold text-slate-700">{pren.sala_nome}</div>
                                <div className="text-sm text-slate-500">
                                  {new Date(pren.data_inizio).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={pren.stato === 'annullata' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}>
                                  {pren.stato}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* DIALOG DETTAGLI INGRESSI */}
      <Dialog open={dettagliIngressiOpen} onOpenChange={setDettagliIngressiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dettaglio Ingressi</DialogTitle>
            <CardDescription>
              Abbonamento: {selectedAbbonamentoIngressi?.tipo_abbonamento_nome}
            </CardDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 mt-2 pr-2">
            {selectedAbbonamentoIngressi && ingressi.filter(i => i.abbonamento_id === selectedAbbonamentoIngressi.id).length === 0 && (
              <p className="text-center text-slate-500 py-4">Nessun ingresso registrato su questo carnet.</p>
            )}
            {selectedAbbonamentoIngressi && ingressi.filter(i => i.abbonamento_id === selectedAbbonamentoIngressi.id).map(ing => (
              <div key={ing.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                <span className="font-medium text-[#053c5e]">{new Date(ing.data_ingresso).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 capitalize">{ing.durata?.replace('_', ' ')}</span>
                  <Badge variant="secondary">-{ing.ingressi_consumati}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ModificaPrenotazione
        open={editBookingOpen}
        onOpenChange={setEditBookingOpen}
        prenotazione={selectedPrenotazione}
        user={user}
        abbonamenti={abbonamenti}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla Prenotazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler annullare questa prenotazione? Le ore credito verranno riaccreditate sul tuo abbonamento.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mantieni Prenotazione</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => annullaPrenotazioneMutation.mutate(selectedPrenotazione)}
            >
              Conferma Annullamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={registraIngressoOpen} onOpenChange={setRegistraIngressoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Ingresso</DialogTitle>
            <CardDescription>
              Stai registrando un ingresso sul tuo carnet: <span className="font-bold">{selectedAbbonamentoIngressi?.tipo_abbonamento_nome}</span>
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleziona Durata</Label>
              <Select value={durataIngresso} onValueChange={setDurataIngresso}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mezza_giornata">Mezza Giornata (1 ingresso)</SelectItem>
                  <SelectItem value="giornata_intera">Giornata Intera (2 ingressi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-xs">
                Questa operazione scalerà immediatamente gli ingressi dal tuo carnet. L'host riceverà una notifica del tuo check-in.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRegistraIngressoOpen(false)}>Annulla</Button>
            <Button
              className="bg-[#db222a] hover:bg-[#1f7a8c] text-white"
              onClick={() => registraIngressoMutation.mutate(selectedAbbonamentoIngressi)}
              disabled={registraIngressoMutation.isPending}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {registraIngressoMutation.isPending ? 'Registrazione...' : 'Conferma Ingresso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showHostCalendar} onOpenChange={setShowHostCalendar}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Turni Host</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <CalendarioTurni
              turni={turniHost}
              onSelectTurno={() => { }} // Read-only
              vista="giorno" // Default view
              readOnly={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
