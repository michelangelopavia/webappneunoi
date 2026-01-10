import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit, Trash2, ChevronDown, ChevronUp, User, Users, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CalendarioGriglia from '../coworking/CalendarioGriglia';

export default function CalendarioSaleHost() {
  const [vista, setVista] = useState('giorno');
  const [dataCorrente, setDataCorrente] = useState(new Date());
  const [salaSelezionata, setSalaSelezionata] = useState('tutte');
  const [editDialog, setEditDialog] = useState(false);
  const [prenotazioneEdit, setPrenotazioneEdit] = useState(null);
  const [formEdit, setFormEdit] = useState({ sala_id: '', data: '', ora_inizio: '', ora_fine: '' });
  const [nuovaExpanded, setNuovaExpanded] = useState(false);
  const [formNuova, setFormNuova] = useState({
    sala_id: '',
    data: '',
    ora_inizio: '',
    ora_fine: '',
    tipo_utilizzo: 'call',
    utente_esterno: false,
    utente_email: '',
    nome_esterno: '',
    note: ''
  });
  const [utenti, setUtenti] = useState([]);
  const [openUserPopover, setOpenUserPopover] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ credits: 0, cost: 0, balance: 0 });
  const queryClient = useQueryClient();

  const { data: sale = [] } = useQuery({
    queryKey: ['sale_calendario'],
    queryFn: () => neunoi.entities.SalaRiunioni.filter({ attiva: true }),
    initialData: []
  });

  const { data: prenotazioni = [] } = useQuery({
    queryKey: ['prenotazioni', 'host'],
    queryFn: () => neunoi.entities.PrenotazioneSala.filter({ stato: 'confermata' }),
    initialData: []
  });

  useEffect(() => {
    const loadUtenti = async () => {
      try {
        const [allUsers, allCoworkerProfiles, allSocioProfiles] = await Promise.all([
          neunoi.entities.User.list(),
          neunoi.entities.ProfiloCoworker.list(),
          neunoi.entities.ProfiloSocio.list()
        ]);

        const usersMap = new Map();
        allUsers.forEach(u => usersMap.set(u.id ? String(u.id) : null, u));

        const combinedMap = new Map();

        // 1. PROFILI COWORKER (Priorità)
        allCoworkerProfiles.forEach(p => {
          const uid = p.user_id ? String(p.user_id) : `p-cow-${p.id}`;
          const u = p.user_id ? usersMap.get(String(p.user_id)) : null;

          combinedMap.set(uid, {
            id: uid,
            user_id: p.user_id,
            profilo_coworker_id: p.id,
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || u?.full_name || u?.username || p.email || "Coworker senza nome",
            email: p.email || u?.email || "",
            tag: "COWORKER"
          });
        });

        // 2. SOCI (se non già aggiunti come coworker)
        allSocioProfiles.forEach(p => {
          const uid = p.user_id ? String(p.user_id) : `p-soc-${p.id}`;
          if (combinedMap.has(uid)) return;

          const u = p.user_id ? usersMap.get(String(p.user_id)) : null;
          combinedMap.set(uid, {
            id: uid,
            user_id: p.user_id,
            profilo_coworker_id: null,
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || u?.full_name || u?.username || "Socio senza nome",
            email: u?.email || "",
            tag: "SOCIO"
          });
        });

        // 3. TUTTI GLI ALTRI UTENTI
        allUsers.forEach(u => {
          const uid = String(u.id);
          if (combinedMap.has(uid)) return;

          combinedMap.set(uid, {
            id: uid,
            user_id: u.id,
            profilo_coworker_id: null,
            full_name: u.full_name || u.username,
            email: u.email,
            tag: "UTENTE"
          });
        });

        setUtenti(Array.from(combinedMap.values()).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
      } catch (error) {
        console.error("Errore caricamento lista utenti:", error);
        neunoi.entities.User.list().then(list => setUtenti(list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))));
      }
    };
    loadUtenti();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      if (formNuova.utente_esterno || !formNuova.utente_id || !formNuova.data || !formNuova.ora_inizio || !formNuova.ora_fine) {
        setStatusInfo({ credits: 0, cost: 0, balance: 0 });
        return;
      }

      const utente = utenti.find(u => u.email === formNuova.utente_email);
      if (!utente) return;

      const dataInizio = new Date(`${formNuova.data}T${formNuova.ora_inizio}`);
      const dataFine = new Date(`${formNuova.data}T${formNuova.ora_fine}`);
      const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
      const oreCredito = formNuova.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;

      const abbonamentiTutti = await neunoi.entities.AbbonamentoUtente.list();
      const abbonamentiUtente = abbonamentiTutti.filter(abb =>
        abb.stato === 'attivo' && (
          (utente.user_id && String(abb.user_id) === String(utente.user_id)) ||
          (utente.profilo_coworker_id && String(abb.profilo_coworker_id) === String(utente.profilo_coworker_id))
        )
      );

      const creditiDisponibili = abbonamentiUtente.reduce((sum, abb) => {
        const oggi = new Date();
        const scadenza = new Date(abb.data_scadenza);
        if (scadenza < oggi) return sum;
        return sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0));
      }, 0);

      setStatusInfo({
        credits: creditiDisponibili,
        cost: oreCredito,
        balance: creditiDisponibili - oreCredito
      });
    };
    checkStatus();
  }, [formNuova.utente_email, formNuova.data, formNuova.ora_inizio, formNuova.ora_fine, formNuova.tipo_utilizzo, formNuova.utente_esterno, utenti]);

  const modificaMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
      const dataFine = new Date(`${data.data}T${data.ora_fine}`);
      const sala = sale.find(s => String(s.id) === String(data.sala_id));

      if (!sala) throw new Error('Sala non trovata');

      await neunoi.entities.PrenotazioneSala.update(id, {
        sala_id: Number(data.sala_id),
        sala_nome: sala.nome,
        data_inizio: dataInizio.toISOString(),
        data_fine: dataFine.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
      setEditDialog(false);
      toast.success('Prenotazione modificata');
    }
  });

  const eliminaMutation = useMutation({
    mutationFn: async (id) => {
      const pren = prenotazioni.find(p => p.id === id);
      if (pren && pren.user_id && (pren.ore_credito_consumate || 0) > 0) {
        const abbonamentiUtente = await neunoi.entities.AbbonamentoUtente.filter({
          user_id: pren.user_id,
          stato: 'attivo'
        });

        let daRimborsare = pren.ore_credito_consumate;
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
      await neunoi.entities.PrenotazioneSala.update(id, { stato: 'annullata' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      toast.success('Prenotazione annullata e crediti rimborsati');
    }
  });

  const creaMutation = useMutation({
    mutationFn: async (data) => {
      const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
      const dataFine = new Date(`${data.data}T${data.ora_fine}`);
      const sala = sale.find(s => String(s.id) === String(data.sala_id));

      if (!sala) throw new Error('Seleziona una sala valida');

      const conflitto = prenotazioni.some(p => {
        if (p.sala_id !== data.sala_id) return false;
        const pInizio = new Date(p.data_inizio);
        const pFine = new Date(p.data_fine);
        return (dataInizio < pFine && dataFine > pInizio);
      });

      if (conflitto) {
        throw new Error('La sala è già prenotata in questo orario');
      }

      const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
      const oreCredito = data.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;

      let utenteId, utenteNome;

      if (data.utente_esterno) {
        utenteId = null;
        utenteNome = data.nome_esterno;
      } else {
        const utente = utenti.find(u => u.email === data.utente_email);
        if (!utente) {
          throw new Error('Utente non trovato nella lista. Riprova a selezionarlo.');
        }
        utenteId = utente.id;
        utenteNome = utente.full_name;

        const abbonamentiTutti = await neunoi.entities.AbbonamentoUtente.list();
        const abbonamentiUtente = abbonamentiTutti.filter(abb =>
          abb.stato === 'attivo' && (
            (utente.user_id && Number(abb.user_id) === Number(utente.user_id)) ||
            (utente.profilo_coworker_id && Number(abb.profilo_coworker_id) === Number(utente.profilo_coworker_id))
          )
        );

        const creditiDisponibili = abbonamentiUtente.reduce((sum, abb) => {
          const oggi = new Date();
          const scadenza = new Date(abb.data_scadenza);
          if (scadenza < oggi) return sum;
          return sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0));
        }, 0);

        if (oreCredito <= creditiDisponibili + 2) {
          let creditiDaScalare = oreCredito;
          for (const abbonamento of abbonamentiUtente) {
            if (creditiDaScalare <= 0) break;
            const creditiAbb = (abbonamento.ore_sale_totali || 0) - (abbonamento.ore_sale_usate || 0);
            if (creditiAbb > 0) {
              const daScalare = Math.min(creditiDaScalare, creditiAbb);
              await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
                ore_sale_usate: (abbonamento.ore_sale_usate || 0) + daScalare
              });
              creditiDaScalare -= daScalare;
            }
          }
        }
      }

      await neunoi.entities.PrenotazioneSala.create({
        sala_id: data.sala_id,
        sala_nome: sala.nome,
        user_id: utenteId,
        utente_nome: utenteNome,
        data_inizio: dataInizio.toISOString(),
        data_fine: dataFine.toISOString(),
        tipo_utilizzo: data.tipo_utilizzo,
        ore_credito_consumate: oreCredito,
        stato: 'confermata',
        note: data.note
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      setNuovaExpanded(false);
      resetFormNuova();
      toast.success('Prenotazione creata');
    },
    onError: (error) => {
      toast.error(error.message || 'Errore nella creazione');
    }
  });

  const resetFormNuova = () => {
    setFormNuova({
      sala_id: '',
      data: '',
      ora_inizio: '',
      ora_fine: '',
      tipo_utilizzo: 'call',
      utente_esterno: false,
      utente_email: '',
      nome_esterno: '',
      note: ''
    });
  };

  const openEdit = (pren) => {
    const dataInizio = new Date(pren.data_inizio);
    setPrenotazioneEdit(pren);
    setFormEdit({
      sala_id: pren.sala_id,
      data: dataInizio.toISOString().split('T')[0],
      ora_inizio: dataInizio.toTimeString().slice(0, 5),
      ora_fine: new Date(pren.data_fine).toTimeString().slice(0, 5)
    });
    setEditDialog(true);
  };

  const filtraPrenotazioni = () => {
    let filtered = prenotazioni;

    if (salaSelezionata !== 'tutte') {
      filtered = filtered.filter(p => p.sala_id === salaSelezionata);
    }

    if (vista === 'giorno') {
      const inizio = new Date(dataCorrente);
      inizio.setHours(0, 0, 0, 0);
      const fine = new Date(dataCorrente);
      fine.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => {
        const pData = new Date(p.data_inizio);
        return pData >= inizio && pData <= fine;
      });
    } else if (vista === 'settimana') {
      const inizio = new Date(dataCorrente);
      inizio.setDate(inizio.getDate() - inizio.getDay() + 1);
      inizio.setHours(0, 0, 0, 0);
      const fine = new Date(inizio);
      fine.setDate(fine.getDate() + 6);
      fine.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => {
        const pData = new Date(p.data_inizio);
        return pData >= inizio && pData <= fine;
      });
    } else if (vista === 'mese') {
      const inizio = new Date(dataCorrente.getFullYear(), dataCorrente.getMonth(), 1);
      const fine = new Date(dataCorrente.getFullYear(), dataCorrente.getMonth() + 1, 0, 23, 59, 59);
      filtered = filtered.filter(p => {
        const pData = new Date(p.data_inizio);
        return pData >= inizio && pData <= fine;
      });
    }

    return filtered.sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
  };

  const naviga = (direzione) => {
    const nuova = new Date(dataCorrente);
    if (vista === 'giorno') {
      nuova.setDate(nuova.getDate() + direzione);
    } else if (vista === 'settimana') {
      nuova.setDate(nuova.getDate() + (direzione * 7));
    } else {
      nuova.setMonth(nuova.getMonth() + direzione);
    }
    setDataCorrente(nuova);
  };

  const getTitoloData = () => {
    if (vista === 'giorno') {
      return dataCorrente.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (vista === 'settimana') {
      const inizio = new Date(dataCorrente);
      inizio.setDate(inizio.getDate() - inizio.getDay() + 1);
      const fine = new Date(inizio);
      fine.setDate(fine.getDate() + 6);
      return `${inizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${fine.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return dataCorrente.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    }
  };

  const prenotazioniFiltrate = filtraPrenotazioni();

  return (
    <>
      <Tabs defaultValue="griglia" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#bfdbf7]">
          <TabsTrigger value="griglia" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            Vista Griglia Oraria
          </TabsTrigger>
          <TabsTrigger value="lista" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            Vista Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="griglia" className="mt-6 space-y-4">
          {/* Finestra espandibile per nuova prenotazione */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Button
              onClick={() => setNuovaExpanded(!nuovaExpanded)}
              className="w-full bg-[#db222a] hover:bg-[#b01b22] justify-between text-xl font-bold py-6 h-auto rounded-none shadow-md"
            >
              <span className="flex items-center gap-3">
                <CalendarIcon className="w-6 h-6" />
                NUOVA PRENOTAZIONE
              </span>
              {nuovaExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </Button>

            {nuovaExpanded && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <form onSubmit={(e) => { e.preventDefault(); creaMutation.mutate(formNuova); }} className="space-y-4">
                  <div>
                    <Label>Sala *</Label>
                    <Select value={String(formNuova.sala_id)} onValueChange={(value) => setFormNuova({ ...formNuova, sala_id: value })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona sala" />
                      </SelectTrigger>
                      <SelectContent>
                        {sale.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="esterno"
                      checked={formNuova.utente_esterno}
                      onCheckedChange={(checked) => setFormNuova({ ...formNuova, utente_esterno: checked })}
                    />
                    <Label htmlFor="esterno" className="cursor-pointer">
                      Utente esterno (non registrato)
                    </Label>
                  </div>

                  {formNuova.utente_esterno ? (
                    <div>
                      <Label>Nome e Cognome *</Label>
                      <Input
                        value={formNuova.nome_esterno}
                        onChange={(e) => setFormNuova({ ...formNuova, nome_esterno: e.target.value })}
                        placeholder="Es: Mario Rossi"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="mb-2 block">Utente Registrato *</Label>
                      <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openUserPopover}
                            className="w-full justify-between bg-white h-10"
                          >
                            <span className="truncate">
                              {formNuova.utente_email
                                ? utenti.find((u) => u.email === formNuova.utente_email)?.full_name
                                : "Seleziona un utente..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Cerca per nome o email..." />
                            <CommandList>
                              <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                              <CommandGroup>
                                {utenti.map((u) => (
                                  <CommandItem
                                    key={u.id}
                                    value={u.full_name + " " + (u.email || "") + " " + u.tag}
                                    onSelect={() => {
                                      setFormNuova({ ...formNuova, utente_email: u.email });
                                      setOpenUserPopover(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formNuova.utente_email === u.email ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{u.full_name}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3 underline decoration-slate-300">
                                          {u.tag}
                                        </Badge>
                                      </div>
                                      <span className="text-[10px] text-slate-500">{u.email}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={formNuova.data} onClick={(e) => e.target.showPicker?.()} onChange={(e) => setFormNuova({ ...formNuova, data: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ora Inizio *</Label>
                      <Select value={formNuova.ora_inizio} onValueChange={(value) => setFormNuova({ ...formNuova, ora_inizio: value })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="--:--" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }, (_, i) => {
                            const minutes = i * 15;
                            const hour = 9 + Math.floor(minutes / 60);
                            const min = minutes % 60;
                            if (hour > 20) return null; // Host might have extended hours? keeping safe
                            const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ora Fine *</Label>
                      <Select value={formNuova.ora_fine} onValueChange={(value) => setFormNuova({ ...formNuova, ora_fine: value })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="--:--" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }, (_, i) => {
                            const minutes = (i + 1) * 15;
                            const hour = 9 + Math.floor(minutes / 60);
                            const min = minutes % 60;
                            if (hour > 21) return null;
                            const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block text-[#053c5e] font-semibold">Tipo Utilizzo *</Label>
                    <RadioGroup
                      value={formNuova.tipo_utilizzo}
                      onValueChange={(value) => setFormNuova({ ...formNuova, tipo_utilizzo: value })}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="call" id="host-call" className="peer sr-only" />
                        <Label
                          htmlFor="host-call"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                        >
                          <User className="mb-2 h-6 w-6 text-[#1f7a8c]" />
                          <span className="font-bold">Call</span>
                          <span className="text-[10px] text-slate-500 uppercase mt-1">1 persona</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded mt-1">0.5x crediti</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="riunione" id="host-riunione" className="peer sr-only" />
                        <Label
                          htmlFor="host-riunione"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                        >
                          <Users className="mb-2 h-6 w-6 text-[#053c5e]" />
                          <span className="font-bold">Riunione</span>
                          <span className="text-[10px] text-slate-500 uppercase mt-1">Più persone</span>
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mt-1">1x crediti</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {statusInfo.cost > 0 && (
                    <div className={cn(
                      "p-3 rounded-lg border text-sm flex items-start gap-3",
                      statusInfo.balance < 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800"
                    )}>
                      {statusInfo.balance < 0 ? (
                        <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                      ) : (
                        <User className="w-5 h-5 shrink-0 text-blue-600" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold flex justify-between">
                          <span>Riepilogo Crediti:</span>
                          <span>{statusInfo.cost}h necessarie</span>
                        </div>
                        <div className="mt-1 flex justify-between text-xs">
                          <span>Disponibili: {Math.max(0, Math.round(statusInfo.credits * 100) / 100)}h</span>
                          <span className="font-bold">
                            {statusInfo.balance < 0
                              ? `ECCEDENZA: ${Math.abs(Math.round(statusInfo.balance * 100) / 100)}h`
                              : `Residui: ${Math.round(statusInfo.balance * 100) / 100}h`}
                          </span>
                        </div>
                        {statusInfo.balance < 0 && (
                          <p className="text-[10px] mt-2 italic font-medium">
                            Attenzione: l'utente non ha abbastanza crediti. La prenotazione verrà creata ma i crediti non saranno sufficienti a coprirla interamente.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Note</Label>
                    <Textarea
                      value={formNuova.note}
                      onChange={(e) => setFormNuova({ ...formNuova, note: e.target.value })}
                      placeholder="Note aggiuntive..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setNuovaExpanded(false); resetFormNuova(); }}>
                      Annulla
                    </Button>
                    <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]" disabled={creaMutation.isPending}>
                      {creaMutation.isPending ? 'Creazione...' : 'Crea Prenotazione'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Calendario sempre visibile */}
          <CalendarioGriglia
            sale={sale}
            prenotazioni={prenotazioni}
          />
        </TabsContent>

        <TabsContent value="lista" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#1f7a8c]" />
                  <CardTitle>Calendario Sale</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={salaSelezionata} onValueChange={setSalaSelezionata}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutte">Tutte le sale</SelectItem>
                      {sale.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={vista} onValueChange={setVista}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giorno">Giorno</SelectItem>
                      <SelectItem value="settimana">Settimana</SelectItem>
                      <SelectItem value="mese">Mese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={() => naviga(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-lg font-semibold text-[#053c5e] capitalize">{getTitoloData()}</div>
                <Button variant="outline" size="sm" onClick={() => naviga(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prenotazioniFiltrate.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Nessuna prenotazione</p>
                ) : (
                  prenotazioniFiltrate.map(pren => {
                    const sala = sale.find(s => s.id === pren.sala_id);
                    return (
                      <div key={pren.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: sala?.colore || '#1f7a8c' }}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#053c5e]">{pren.sala_nome}</span>
                              <Badge className={pren.tipo_utilizzo === 'call' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                {pren.tipo_utilizzo === 'call' ? 'Call' : 'Riunione'}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600">{pren.utente_nome}</div>
                            <div className="text-sm text-[#1f7a8c]">
                              {new Date(pren.data_inizio).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - {new Date(pren.data_fine).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(pren)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => eliminaMutation.mutate(pren.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifica Prenotazione</DialogTitle>
              </DialogHeader>
              {prenotazioneEdit && (
                <form onSubmit={(e) => { e.preventDefault(); modificaMutation.mutate({ id: prenotazioneEdit.id, data: formEdit }); }} className="space-y-4">
                  <div className="bg-[#bfdbf7] p-3 rounded-lg text-sm">
                    <strong>Utente:</strong> {prenotazioneEdit.utente_nome}
                  </div>

                  <div>
                    <Label>Sala</Label>
                    <Select value={formEdit.sala_id} onValueChange={(value) => setFormEdit({ ...formEdit, sala_id: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sale.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={formEdit.data} onChange={(e) => setFormEdit({ ...formEdit, data: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ora Inizio</Label>
                      <Select value={formEdit.ora_inizio} onValueChange={(value) => setFormEdit({ ...formEdit, ora_inizio: value })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="--:--" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }, (_, i) => {
                            const minutes = i * 15;
                            const hour = 9 + Math.floor(minutes / 60);
                            const min = minutes % 60;
                            if (hour > 20) return null;
                            const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ora Fine</Label>
                      <Select value={formEdit.ora_fine} onValueChange={(value) => setFormEdit({ ...formEdit, ora_fine: value })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="--:--" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 48 }, (_, i) => {
                            const minutes = (i + 1) * 15;
                            const hour = 9 + Math.floor(minutes / 60);
                            const min = minutes % 60;
                            if (hour > 21) return null;
                            const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Annulla</Button>
                    <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]">Salva</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </>
  );
}
