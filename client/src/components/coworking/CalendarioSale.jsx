import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import CalendarioGriglia from './CalendarioGriglia';

export default function CalendarioSale() {
  const [vista, setVista] = useState('giorno');
  const [dataCorrente, setDataCorrente] = useState(new Date());
  const [salaSelezionata, setSalaSelezionata] = useState('tutte');
  const [editDialog, setEditDialog] = useState(false);
  const [prenotazioneEdit, setPrenotazioneEdit] = useState(null);
  const [formEdit, setFormEdit] = useState({ sala_id: '', data: '', ora_inizio: '', ora_fine: '' });
  const [nuovaDialog, setNuovaDialog] = useState(false);
  const [formNuova, setFormNuova] = useState({
    sala_id: '',
    data: '',
    ora_inizio: '',
    ora_fine: '',
    tipo_utilizzo: 'call',
    utente_esterno: false,
    utente_id: '',
    nome_esterno: '',
    note: ''
  });
  const [utenti, setUtenti] = useState([]);
  const queryClient = useQueryClient();

  const { data: sale = [] } = useQuery({
    queryKey: ['sale_calendario'],
    queryFn: () => neunoi.entities.SalaRiunioni.filter({ attiva: true }),
    initialData: []
  });

  const { data: prenotazioni = [] } = useQuery({
    queryKey: ['prenotazioni_calendario'],
    queryFn: () => neunoi.entities.PrenotazioneSala.filter({ stato: 'confermata' }),
    initialData: []
  });

  useEffect(() => {
    const loadUtenti = async () => {
      const allUsers = await neunoi.entities.User.list();
      const coworkers = allUsers.filter(u => 
        u.roles?.includes('coworker') || u.role === 'coworker' ||
        u.roles?.includes('socio') || u.role === 'socio'
      );
      setUtenti(coworkers);
    };
    loadUtenti();
  }, []);

  const modificaMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
      const dataFine = new Date(`${data.data}T${data.ora_fine}`);
      const sala = sale.find(s => s.id === data.sala_id);

      await neunoi.entities.PrenotazioneSala.update(id, {
        sala_id: data.sala_id,
        sala_nome: sala.nome,
        data_inizio: dataInizio.toISOString(),
        data_fine: dataFine.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenotazioni_calendario'] });
      setEditDialog(false);
      toast.success('Prenotazione modificata');
    }
  });

  const eliminaMutation = useMutation({
    mutationFn: (id) => neunoi.entities.PrenotazioneSala.update(id, { stato: 'annullata' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prenotazioni_calendario'] });
      toast.success('Prenotazione annullata');
    }
  });

  const creaMutation = useMutation({
    mutationFn: async (data) => {
      const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
      const dataFine = new Date(`${data.data}T${data.ora_fine}`);
      const sala = sale.find(s => s.id === data.sala_id);

      // Verifica sovrapposizioni
      const conflitto = prenotazioni.some(p => {
        if (p.sala_id !== data.sala_id) return false;
        const pInizio = new Date(p.data_inizio);
        const pFine = new Date(p.data_fine);
        return (dataInizio < pFine && dataFine > pInizio);
      });

      if (conflitto) {
        throw new Error('La sala è già prenotata in questo orario');
      }

      // Calcola ore credito
      const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
      const oreCredito = data.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;

      let utenteId, utenteNome;

      if (data.utente_esterno) {
        // Utente esterno - non ha ID
        utenteId = null;
        utenteNome = data.nome_esterno;
      } else {
        // Utente registrato
        const utente = utenti.find(u => u.id === data.utente_id);
        utenteId = data.utente_id;
        utenteNome = utente.full_name;

        // Verifica e scala crediti se ha abbonamento
        const abbonamenti = await neunoi.entities.AbbonamentoUtente.filter({
          utente_id: data.utente_id,
          stato: 'attivo'
        });

        if (abbonamenti.length > 0) {
          const abbonamento = abbonamenti[0];
          const creditiDisponibili = (abbonamento.ore_sale_totali || 0) - (abbonamento.ore_sale_usate || 0);

          if (oreCredito <= creditiDisponibili) {
            // Scala i crediti
            await neunoi.entities.AbbonamentoUtente.update(abbonamento.id, {
              ore_sale_usate: (abbonamento.ore_sale_usate || 0) + oreCredito
            });
          }
        }
      }

      // Crea prenotazione
      await neunoi.entities.PrenotazioneSala.create({
        sala_id: data.sala_id,
        sala_nome: sala.nome,
        utente_id: utenteId,
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
      queryClient.invalidateQueries({ queryKey: ['prenotazioni_calendario'] });
      setNuovaDialog(false);
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
      utente_id: '',
      nome_esterno: '',
      note: ''
    });
  };

  const apriNuovaPrenotazioneDaGriglia = (salaId, ora) => {
    if (salaId && ora) {
      const oggi = new Date();
      setFormNuova({
        ...formNuova,
        sala_id: salaId,
        data: oggi.toISOString().split('T')[0],
        ora_inizio: `${ora.toString().padStart(2, '0')}:00`,
        ora_fine: `${(ora + 1).toString().padStart(2, '0')}:00`
      });
    }
    setNuovaDialog(true);
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

        <TabsContent value="griglia" className="mt-6">
          <CalendarioGriglia 
            sale={sale} 
            prenotazioni={prenotazioni}
            onNuovaPrenotazione={apriNuovaPrenotazioneDaGriglia}
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
              <Button onClick={() => setNuovaDialog(true)} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
                <Plus className="w-4 h-4 mr-2" />
                Nuova Prenotazione
              </Button>
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

      <Dialog open={nuovaDialog} onOpenChange={setNuovaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuova Prenotazione Sala</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); creaMutation.mutate(formNuova); }} className="space-y-4">
            <div>
              <Label>Sala *</Label>
              <Select value={formNuova.sala_id} onValueChange={(value) => setFormNuova({...formNuova, sala_id: value})} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sala" />
                </SelectTrigger>
                <SelectContent>
                  {sale.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="esterno"
                checked={formNuova.utente_esterno}
                onCheckedChange={(checked) => setFormNuova({...formNuova, utente_esterno: checked})}
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
                  onChange={(e) => setFormNuova({...formNuova, nome_esterno: e.target.value})}
                  placeholder="Es: Mario Rossi"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Per affitto sale a non-coworker o ingressi giornalieri
                </p>
              </div>
            ) : (
              <div>
                <Label>Utente Registrato *</Label>
                <Select value={formNuova.utente_id} onValueChange={(value) => setFormNuova({...formNuova, utente_id: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona utente" />
                  </SelectTrigger>
                  <SelectContent>
                    {utenti.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  I crediti verranno scalati automaticamente se disponibili
                </p>
              </div>
            )}

            <div>
              <Label>Data *</Label>
              <Input type="date" value={formNuova.data} onChange={(e) => setFormNuova({...formNuova, data: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ora Inizio *</Label>
                <Input type="time" value={formNuova.ora_inizio} onChange={(e) => setFormNuova({...formNuova, ora_inizio: e.target.value})} required />
              </div>
              <div>
                <Label>Ora Fine *</Label>
                <Input type="time" value={formNuova.ora_fine} onChange={(e) => setFormNuova({...formNuova, ora_fine: e.target.value})} required />
              </div>
            </div>

            <div>
              <Label>Tipo Utilizzo *</Label>
              <Select value={formNuova.tipo_utilizzo} onValueChange={(value) => setFormNuova({...formNuova, tipo_utilizzo: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call (1h sala = 0.5h credito)</SelectItem>
                  <SelectItem value="riunione">Riunione (1h sala = 1h credito)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={formNuova.note}
                onChange={(e) => setFormNuova({...formNuova, note: e.target.value})}
                placeholder="Note aggiuntive..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setNuovaDialog(false); resetFormNuova(); }}>
                Annulla
              </Button>
              <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]" disabled={creaMutation.isPending}>
                {creaMutation.isPending ? 'Creazione...' : 'Crea Prenotazione'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                <Select value={formEdit.sala_id} onValueChange={(value) => setFormEdit({...formEdit, sala_id: value})}>
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
                <Input type="date" value={formEdit.data} onChange={(e) => setFormEdit({...formEdit, data: e.target.value})} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ora Inizio</Label>
                  <Input type="time" value={formEdit.ora_inizio} onChange={(e) => setFormEdit({...formEdit, ora_inizio: e.target.value})} required />
                </div>
                <div>
                  <Label>Ora Fine</Label>
                  <Input type="time" value={formEdit.ora_fine} onChange={(e) => setFormEdit({...formEdit, ora_fine: e.target.value})} required />
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
