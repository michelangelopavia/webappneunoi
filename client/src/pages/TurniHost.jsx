import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Clock, Coins, User, Edit, Trash2, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CalendarioTurni from '../components/turni/CalendarioTurni';
import RiepilogoOreTurni from '../components/turni/RiepilogoOreTurni';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function TurniHost() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [deletingTurno, setDeletingTurno] = useState(null);
  const [users, setUsers] = useState([]);
  const [vistaCalendario, setVistaCalendario] = useState('settimana');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    utente_email: '',
    data_inizio: '',
    ora_inizio: '',
    data_fine: '',
    ora_fine: '',
    tipo_giorno: 'feriale_mattina',
    note: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await neunoi.entities.User.list();
    const profiliSoci = await neunoi.entities.ProfiloSocio.list();

    // Filtra solo utenti con ruolo socio, admin o super_admin
    const soci = allUsers.filter(u =>
      u.roles?.some(r => ['socio', 'admin', 'super_admin'].includes(r)) ||
      ['socio', 'admin', 'super_admin'].includes(u.role)
    ).map(u => {
      const profilo = profiliSoci.find(p => String(p.user_id) === String(u.id));
      return {
        ...u,
        full_name: profilo?.full_name || u.full_name
      };
    });
    setUsers(soci);
  };

  const { data: turni = [], isLoading } = useQuery({
    queryKey: ['turni'],
    queryFn: () => neunoi.entities.TurnoHost.list('-data_inizio'),
    initialData: [],
  });

  const festivitaItaliane = {
    2024: [
      '2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25', '2024-05-01',
      '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'
    ],
    2025: [
      '2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-01',
      '2025-06-02', '2025-08-15', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26'
    ]
  };

  const isFestivo = (data) => {
    const anno = data.getFullYear();
    const dataStr = data.toISOString().split('T')[0];
    return festivitaItaliane[anno]?.includes(dataStr) || false;
  };

  const calcolaFasceNEU = (dataInizioISO, dataFineISO) => {
    const inizio = new Date(dataInizioISO);
    const fine = new Date(dataFineISO);

    let oreStandard = 0;
    let oreSerali = 0;
    let oreExtra = 0;

    let currentTime = new Date(inizio);

    while (currentTime < fine) {
      const giornoSettimana = currentTime.getDay();
      const isWeekend = giornoSettimana === 0 || giornoSettimana === 6;
      const isFest = isFestivo(currentTime);
      const ora = currentTime.getHours();
      const minuti = currentTime.getMinutes();
      const oraDecimale = ora + minuti / 60;

      const nextTime = new Date(currentTime.getTime() + 60000);
      const nextHour = nextTime > fine ? fine : nextTime;
      const minutiLavorati = (nextHour - currentTime) / 60000;
      const oreLavorate = minutiLavorati / 60;

      if (isWeekend || isFest) {
        oreExtra += oreLavorate;
      } else {
        if (oraDecimale >= 9 && oraDecimale < 18.5) {
          oreStandard += oreLavorate;
        } else if (oraDecimale >= 18.5 && oraDecimale < 20.5) {
          oreSerali += oreLavorate;
        } else {
          oreExtra += oreLavorate;
        }
      }

      currentTime = nextTime;
    }

    const neuStandard = oreStandard * 2.5;
    const neuSerali = oreSerali * 4;
    const neuExtra = oreExtra * 6;
    const neuTotali = neuStandard + neuSerali + neuExtra;
    const oreTotali = oreStandard + oreSerali + oreExtra;

    return { oreTotali, neuTotali };
  };

  const createTurnoMutation = useMutation({
    mutationFn: async (data) => {
      const user = users.find(u => u.email === data.utente_email);
      const utente_id = user?.id;

      // Crea oggetto Date in ora locale e converti in ISO (UTC) per il salvataggio
      // Questo evita che 09:00 locale venga salvato come 09:00 UTC (e quindi visualizzato come 10:00)
      const dataInizioLocale = new Date(`${data.data_inizio}T${data.ora_inizio}:00`);
      const dataFineLocale = new Date(`${data.data_fine}T${data.ora_fine}:00`);

      const dataInizioISO = dataInizioLocale.toISOString();
      const dataFineISO = dataFineLocale.toISOString();

      // Calcola NEU con le fasce orarie
      const { oreTotali, neuTotali } = calcolaFasceNEU(dataInizioISO, dataFineISO);

      // Determina tipo giorno
      const inizio = new Date(dataInizioISO);
      const giornoSettimana = inizio.getDay();
      const isWeekend = giornoSettimana === 0 || giornoSettimana === 6;
      const isFest = isFestivo(inizio);
      const ora = inizio.getHours();

      let tipoGiorno = 'feriale_mattina';
      if (isFest) tipoGiorno = 'festivo';
      else if (isWeekend) tipoGiorno = 'weekend';
      else if (ora >= 14) tipoGiorno = 'feriale_pomeriggio';

      // Verifica se è il profilo Associazione/Dipendente (non riceve NEU)
      const isAssociazione = user.roles?.includes('associazione') || user.role === 'associazione';

      if (editingTurno) {
        // Modifica turno esistente
        await neunoi.entities.TurnoHost.update(editingTurno.id, {
          utente_id: utente_id,
          utente_nome: user.full_name,
          data_inizio: dataInizioISO,
          data_fine: dataFineISO,
          ore_lavorate: Math.round(oreTotali * 100) / 100,
          neu_guadagnati: isAssociazione ? 0 : Math.round(neuTotali * 100) / 100,
          tariffa_neu_ora: isAssociazione ? 0 : Math.round((neuTotali / oreTotali) * 100) / 100,
          tipo_giorno: tipoGiorno,
          note: data.note || ''
        });
      } else {
        // Crea nuovo turno
        const turno = await neunoi.entities.TurnoHost.create({
          utente_id: utente_id,
          utente_nome: user.full_name,
          data_inizio: dataInizioISO,
          data_fine: dataFineISO,
          ore_lavorate: Math.round(oreTotali * 100) / 100,
          neu_guadagnati: isAssociazione ? 0 : Math.round(neuTotali * 100) / 100,
          tariffa_neu_ora: isAssociazione ? 0 : Math.round((neuTotali / oreTotali) * 100) / 100,
          tipo_giorno: tipoGiorno,
          stato: 'completato',
          note: data.note || '',
          confermato: true
        });

        // Non creare transazione NEU per Associazione
        if (!isAssociazione) {
          await neunoi.entities.TransazioneNEU.create({
            da_utente_id: null,
            a_utente_id: utente_id,
            importo: Math.round(neuTotali * 100) / 100,
            tipo: 'turno_host',
            causale: `Turno host - ${Math.round(oreTotali * 100) / 100}h`,
            data_transazione: dataInizioISO,
            riferimento_turno_id: turno.id
          });

          // Trigger centralized server-side recalculation
          await neunoi.entities.User.recalc(utente_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni'] });
      queryClient.invalidateQueries({ queryKey: ['auth_user'] });
      setDialogOpen(false);
      setEditingTurno(null);
      setFormData({
        utente_email: '',
        data_inizio: '',
        ora_inizio: '',
        data_fine: '',
        ora_fine: '',
        tipo_giorno: 'feriale_mattina',
        note: ''
      });
    },
  });

  const deleteTurnoMutation = useMutation({
    mutationFn: async (turno) => {
      await neunoi.entities.TurnoHost.delete(turno.id);

      // Trigger centralized server-side recalculation
      if (turno.utente_id) {
        await neunoi.entities.User.recalc(turno.utente_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turni'] });
      queryClient.invalidateQueries({ queryKey: ['auth_user'] });
      setDeletingTurno(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTurnoMutation.mutate(formData);
  };

  const handleEditTurno = (turno) => {
    setEditingTurno(turno);
    const dataInizio = new Date(turno.data_inizio);
    const dataFine = new Date(turno.data_fine);
    const user = users.find(u => String(u.id) === String(turno.utente_id));
    setFormData({
      utente_email: user?.email || '',
      data_inizio: dataInizio.toISOString().split('T')[0],
      ora_inizio: dataInizio.toTimeString().slice(0, 5),
      data_fine: dataFine.toISOString().split('T')[0],
      ora_fine: dataFine.toTimeString().slice(0, 5),
      tipo_giorno: turno.tipo_giorno,
      note: turno.note || ''
    });
    setDialogOpen(true);
  };

  const handleNewTurno = () => {
    setEditingTurno(null);
    setFormData({
      utente_email: '',
      data_inizio: '',
      ora_inizio: '',
      data_fine: '',
      ora_fine: '',
      tipo_giorno: 'feriale_mattina',
      note: ''
    });
    setDialogOpen(true);
  };

  const getTipoGiornoColor = (tipo) => {
    const colors = {
      feriale_mattina: 'bg-blue-100 text-blue-800',
      feriale_pomeriggio: 'bg-purple-100 text-purple-800',
      weekend: 'bg-orange-100 text-orange-800',
      festivo: 'bg-red-100 text-red-800'
    };
    return colors[tipo] || 'bg-slate-100 text-slate-800';
  };

  const getTipoGiornoLabel = (tipo) => {
    const labels = {
      feriale_mattina: 'Feriale Mattina',
      feriale_pomeriggio: 'Feriale Pomeriggio',
      weekend: 'Weekend',
      festivo: 'Festivo'
    };
    return labels[tipo] || tipo;
  };

  if (isLoading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await neunoi.auth.me();
      setCurrentUser(user);
    };
    loadCurrentUser();
  }, []);

  const isSuperAdmin = currentUser?.roles?.includes('super_admin') || currentUser?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Turni Host</h1>
            <p className="text-lg opacity-90 mt-2">Gestisci i turni dei soci</p>
          </div>
          <Button className="bg-[#1f7a8c] hover:bg-[#db222a] text-white w-full md:w-auto" onClick={handleNewTurno}>
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Turno
          </Button>
        </div>
      </div>

      <Tabs defaultValue="giorno" className="w-full">
        <TabsList className="h-auto grid w-full grid-cols-2 md:grid-cols-4 bg-[#bfdbf7]">
          <TabsTrigger value="giorno" onClick={() => setVistaCalendario('giorno')}>Giorno</TabsTrigger>
          <TabsTrigger value="settimana" onClick={() => setVistaCalendario('settimana')}>Settimana</TabsTrigger>
          <TabsTrigger value="mese" onClick={() => setVistaCalendario('mese')}>Mese</TabsTrigger>
          <TabsTrigger value="lista">
            <List className="w-4 h-4 mr-2" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-6">
          <div className="grid gap-4">
            {turni.map(turno => (
              <div key={turno.id} className="bg-white p-6 border-l-4 border-[#1f7a8c]">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-[#053c5e]" />
                      <span className="font-bold text-xl text-[#053c5e]">{turno.utente_nome}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#053c5e]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(turno.data_inizio).toLocaleDateString('it-IT')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(turno.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} -
                        {new Date(turno.data_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span className="font-semibold">{turno.ore_lavorate}h</span>
                    </div>

                    {turno.note && (
                      <p className="text-sm text-[#053c5e] mt-2">{turno.note}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-right bg-[#db222a] text-white p-3">
                      <div className="flex items-center gap-1 font-bold text-2xl">
                        <Coins className="w-6 h-6" />
                        {turno.neu_guadagnati}
                      </div>
                      <div className="text-xs opacity-90 mt-1">
                        NEU
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="icon"
                        className="bg-[#1f7a8c] hover:bg-[#053c5e] text-white"
                        onClick={() => handleEditTurno(turno)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="bg-[#db222a] hover:bg-[#053c5e] text-white"
                        onClick={() => setDeletingTurno(turno)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {turni.length === 0 && (
              <div className="bg-[#bfdbf7] p-12 text-center text-[#053c5e]">
                Nessun turno registrato. Usa il pulsante "Nuovo Turno" per aggiungerne uno.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="giorno" className="mt-6">
          <CalendarioTurni
            turni={turni}
            onSelectTurno={handleEditTurno}
            vista="giorno"
          />
        </TabsContent>

        <TabsContent value="settimana" className="mt-6">
          <CalendarioTurni
            turni={turni}
            onSelectTurno={handleEditTurno}
            vista="settimana"
          />
        </TabsContent>

        <TabsContent value="mese" className="mt-6">
          <CalendarioTurni
            turni={turni}
            onSelectTurno={handleEditTurno}
            vista="mese"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingTurno(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTurno ? 'Modifica Turno Host' : 'Aggiungi Turno Host'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Socio</Label>
              <Select
                value={formData.utente_email}
                onValueChange={(value) => setFormData({ ...formData, utente_email: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona socio" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data Turno</Label>
                <Input
                  type="date"
                  value={formData.data_inizio}
                  onClick={(e) => e.target.showPicker?.()}
                  onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value, data_fine: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Ora Inizio</Label>
                <Input
                  type="time"
                  value={formData.ora_inizio}
                  onChange={(e) => setFormData({ ...formData, ora_inizio: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Ora Fine</Label>
                <Input
                  type="time"
                  value={formData.ora_fine}
                  onChange={(e) => setFormData({ ...formData, ora_fine: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Note aggiuntive..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-[#1F4A5C] hover:bg-[#1F4A5C]/90"
                disabled={createTurnoMutation.isPending}
              >
                {createTurnoMutation.isPending ? (editingTurno ? 'Salvataggio...' : 'Creazione...') : (editingTurno ? 'Salva Modifiche' : 'Crea Turno')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTurno} onOpenChange={() => setDeletingTurno(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo turno? L'operazione rimuoverà anche i NEU guadagnati dal saldo dell'utente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTurnoMutation.mutate(deletingTurno)}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isSuperAdmin && <RiepilogoOreTurni turni={turni} />}
    </div>
  );
}
