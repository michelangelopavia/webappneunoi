import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Clock, AlertCircle, AlertTriangle, User, Users } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

export default function PrenotaSala({ user, abbonamenti = [] }) {
  const [formData, setFormData] = useState({
    sala_id: '',
    data: '',
    ora_inizio: '',
    ora_fine: '',
    tipo_utilizzo: 'call'
  });
  const [warnings, setWarnings] = useState({ sovrapposizione: false, crediti: null });
  const queryClient = useQueryClient();

  const { data: sale = [] } = useQuery({
    queryKey: ['sale'],
    queryFn: () => neunoi.entities.SalaRiunioni.filter({ attiva: true }),
    initialData: []
  });

  const { data: prenotazioniEsistenti = [] } = useQuery({
    queryKey: ['prenotazioni_esistenti', formData.sala_id, formData.data],
    queryFn: () => {
      if (!formData.sala_id || !formData.data) return [];
      return neunoi.entities.PrenotazioneSala.filter({
        sala_id: formData.sala_id,
        stato: 'confermata'
      });
    },
    enabled: !!formData.sala_id && !!formData.data,
    initialData: []
  });

  useEffect(() => {
    verificaDisponibilita();
  }, [formData.sala_id, formData.data, formData.ora_inizio, formData.ora_fine, formData.tipo_utilizzo]);

  const verificaDisponibilita = () => {
    if (!formData.sala_id || !formData.data || !formData.ora_inizio || !formData.ora_fine) {
      setWarnings({ sovrapposizione: false, crediti: null });
      return;
    }

    const dataInizio = new Date(`${formData.data}T${formData.ora_inizio}`);
    const dataFine = new Date(`${formData.data}T${formData.ora_fine}`);
    const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
    const oreCredito = formData.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;

    // Verifica sovrapposizioni
    const conflitto = prenotazioniEsistenti.some(p => {
      const pInizio = new Date(p.data_inizio);
      const pFine = new Date(p.data_fine);
      const dataGiorno = new Date(formData.data);
      const pDataGiorno = new Date(p.data_inizio);
      dataGiorno.setHours(0, 0, 0, 0);
      pDataGiorno.setHours(0, 0, 0, 0);

      if (dataGiorno.getTime() !== pDataGiorno.getTime()) return false;
      return (dataInizio < pFine && dataFine > pInizio);
    });

    // Verifica crediti (somma di tutti gli abbonamenti attivi)
    let creditiWarning = null;
    if (abbonamenti.length > 0) {
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);

      const creditiDisponibili = abbonamenti.reduce((sum, abb) => {
        const inizio = new Date(abb.data_inizio);
        inizio.setHours(0, 0, 0, 0);
        const fine = new Date(abb.data_scadenza);
        fine.setHours(23, 59, 59, 999);
        if (inizio > oggi || fine < oggi) return sum;
        return sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0));
      }, 0);
      const eccedenza = oreCredito - creditiDisponibili;

      if (eccedenza > 0) {
        if (eccedenza <= 2) {
          creditiWarning = {
            disponibili: creditiDisponibili,
            necessari: oreCredito,
            eccedenza: eccedenza,
            permesso: true
          };
        } else {
          creditiWarning = {
            disponibili: creditiDisponibili,
            necessari: oreCredito,
            eccedenza: eccedenza,
            permesso: false
          };
        }
      }
    }

    setWarnings({ sovrapposizione: conflitto, crediti: creditiWarning });
  };

  const creaPrenotazioneMutation = useMutation({
    mutationFn: async (data) => {
      const sala = sale.find(s => s.id === Number(data.sala_id));
      if (!sala) {
        throw new Error('Sala non trovata');
      }

      // Verifica permessi per sala corsi
      if (sala.solo_staff) {
        const hasPermission = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
        if (!hasPermission) {
          throw new Error('Non hai i permessi per prenotare questa sala');
        }
      }

      // Costruisci datetime
      const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
      const dataFine = new Date(`${data.data}T${data.ora_fine}`);

      // Calcola durata in ore
      const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
      if (durataOre < 0.5) {
        throw new Error('La durata minima per una prenotazione è di 30 minuti');
      }

      // Verifica orario (9:00 - 18:30, lun-ven) - Solo per utenti standard
      const isAdminOrHost = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));

      if (!isAdminOrHost) {
        const giorno = dataInizio.getDay();
        if (giorno === 0 || giorno === 6) {
          throw new Error('Le sale sono prenotabili solo dal lunedì al venerdì');
        }
        const ora = dataInizio.getHours();
        const oraFine = dataFine.getHours() + dataFine.getMinutes() / 60;
        if (ora < 9 || oraFine > 18.5) {
          throw new Error('Orario disponibile: 9:00 - 18:30');
        }
      }

      // Verifica sovrapposizioni
      const conflitto = prenotazioniEsistenti.some(p => {
        const pInizio = new Date(p.data_inizio);
        const pFine = new Date(p.data_fine);
        const dataGiorno = new Date(data.data);
        const pDataGiorno = new Date(p.data_inizio);
        dataGiorno.setHours(0, 0, 0, 0);
        pDataGiorno.setHours(0, 0, 0, 0);

        if (dataGiorno.getTime() !== pDataGiorno.getTime()) return false;
        return (dataInizio < pFine && dataFine > pInizio);
      });

      if (conflitto) {
        throw new Error('Attenzione: la tua prenotazione si sovrappone ad una già presente');
      }

      // Calcola crediti: call = 0.5x, riunione = 1x
      const oreCredito = data.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;

      // Verifica crediti disponibili (max 2h extra) - somma di tutti gli abbonamenti
      const miAbbonamenti = await neunoi.entities.AbbonamentoUtente.filter({ user_id: user.id });

      const abbonamentiAttivi = miAbbonamenti.filter(a => {
        if (!a.attivo) return false;
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        const inizio = new Date(a.data_inizio);
        inizio.setHours(0, 0, 0, 0);
        const scadenza = new Date(a.data_scadenza);
        scadenza.setHours(23, 59, 59, 999);
        return inizio <= oggi && scadenza >= oggi;
      });

      const creditiDisponibili = abbonamentiAttivi.reduce((sum, abb) => {
        return sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0));
      }, 0);

      const eccedenza = oreCredito - creditiDisponibili;
      if (eccedenza > 2) {
        throw new Error(`Eccedenza massima consentita: 2h credito. Ore in eccesso: ${Math.round(eccedenza * 100) / 100}h`);
      }

      // Crea prenotazione
      await neunoi.entities.PrenotazioneSala.create({
        sala_id: data.sala_id,
        sala_nome: sala.nome,
        user_id: user.id,
        utente_nome: user.full_name,
        data_inizio: dataInizio.toISOString(),
        data_fine: dataFine.toISOString(),
        tipo_utilizzo: data.tipo_utilizzo,
        ore_credito_consumate: oreCredito,
        stato: 'confermata'
      });

      // Scala crediti dagli abbonamenti (dal primo con credito disponibile e attivo per data)
      let creditiDaScalare = oreCredito;
      for (const abbonamento of abbonamentiAttivi) {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
      queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
      setFormData({ sala_id: '', data: '', ora_inizio: '', ora_fine: '', tipo_utilizzo: 'call' });
      setWarnings({ sovrapposizione: false, crediti: null });
      toast.success('Prenotazione confermata!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (abbonamenti.length === 0) {
      toast.error('Devi avere un abbonamento attivo per prenotare');
      return;
    }
    creaPrenotazioneMutation.mutate(formData);
  };

  const salaSelezionata = sale.find(s => s.id === formData.sala_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#1f7a8c]" />
          Prenota una Sala Riunioni
        </CardTitle>
      </CardHeader>
      <CardContent>
        {abbonamenti.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <p className="text-[#1f7a8c]">Attiva un abbonamento per prenotare le sale</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Sala</Label>
              <Select value={String(formData.sala_id)} onValueChange={(value) => setFormData({ ...formData, sala_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sala" />
                </SelectTrigger>
                <SelectContent>
                  {sale
                    .filter(s => {
                      const isAdmin = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
                      // Nascondi sala eventi agli utenti normali
                      if (s.nome?.toLowerCase().includes('eventi') || s.solo_staff) {
                        return isAdmin;
                      }
                      return true;
                    })
                    .map(sala => (
                      <SelectItem key={sala.id} value={String(sala.id)}>
                        {sala.nome} (max {sala.capienza} {sala.capienza === 1 ? 'persona' : 'persone'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {salaSelezionata && (
              <div className="bg-[#bfdbf7] p-3 rounded-lg text-sm text-[#053c5e]">
                <strong>Capienza massima:</strong> {salaSelezionata.capienza} {salaSelezionata.capienza === 1 ? 'persona' : 'persone'}
                {salaSelezionata.descrizione && (
                  <div className="mt-1">{salaSelezionata.descrizione}</div>
                )}
              </div>
            )}

            <div>
              <Label className="mb-3 block">Tipo Utilizzo</Label>
              <RadioGroup
                value={formData.tipo_utilizzo}
                onValueChange={(value) => setFormData({ ...formData, tipo_utilizzo: value })}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="call" id="call" className="peer sr-only" />
                  <Label
                    htmlFor="call"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                  >
                    <User className="mb-2 h-6 w-6 text-[#1f7a8c]" />
                    <span className="font-bold">Call</span>
                    <span className="text-[10px] text-slate-500 uppercase mt-1">1 persona</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded mt-1">0.5x crediti</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="riunione" id="riunione" className="peer sr-only" />
                  <Label
                    htmlFor="riunione"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                  >
                    <Users className="mb-2 h-6 w-6 text-[#053c5e]" />
                    <span className="font-bold">Riunione</span>
                    <span className="text-[10px] text-slate-500 uppercase mt-1">Più persone</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mt-1">1x crediti</span>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-slate-500 mt-2 italic">
                Scegli 'Call' se sarai da solo in sala per usufruire della tariffa ridotta.
              </p>
            </div>

            <div>
              <Label>Data</Label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={formData.data}
                onClick={(e) => e.target.showPicker?.()}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ora Inizio</Label>
                <Select value={formData.ora_inizio} onValueChange={(value) => setFormData({ ...formData, ora_inizio: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 39 }, (_, i) => { // 9:00 to 18:30 is 9.5 hours * 4 slots/hr = 38 slots + last one
                      const minutes = i * 15;
                      const hour = 9 + Math.floor(minutes / 60);
                      const min = minutes % 60;
                      if (hour > 18 || (hour === 18 && min > 30)) return null;
                      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                      return (
                        <SelectItem key={timeStr} value={timeStr}>
                          {timeStr}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ora Fine</Label>
                <Select value={formData.ora_fine} onValueChange={(value) => setFormData({ ...formData, ora_fine: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 40 }, (_, i) => { // allow ending up to 19:00 ? Or strictly 18:30? Logic says booking must end by 18:30 usually, or maybe allow 19:00 if they start 18:00?
                      // Let's stick to 9:15 to 19:00 for ending times?
                      // Original code max was 18:30. Let's stick to that range plus maybe a bit more flexibility if needed, but safe is aligning with start times.
                      // Actually, if I start at 18:30, I can't end at 18:30.
                      // Let's generate 9:15 to 19:00
                      const minutes = (i + 1) * 15; // Start from 0+15 = 15 min offset from 9:00
                      const hour = 9 + Math.floor(minutes / 60);
                      const min = minutes % 60;

                      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                      // Just generous range, logic validates it anyway
                      if (hour < 9) return null;
                      if (hour > 19) return null; // Allow ending at 19:00

                      return (
                        <SelectItem key={timeStr} value={timeStr}>
                          {timeStr}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
              <Clock className="w-4 h-4 inline mr-1" />
              Orario: Lun-Ven, 9:00 - 18:30
            </div>

            {warnings.sovrapposizione && (
              <Alert className="border-red-500 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Attenzione:</strong> la tua prenotazione si sovrappone ad una già presente. Non sarà possibile confermarla.
                </AlertDescription>
              </Alert>
            )}

            {warnings.crediti && (
              <Alert className={warnings.crediti.permesso ? "border-orange-500 bg-orange-50" : "border-red-500 bg-red-50"}>
                <AlertTriangle className={`h-4 w-4 ${warnings.crediti.permesso ? 'text-orange-600' : 'text-red-600'}`} />
                <AlertDescription className={warnings.crediti.permesso ? 'text-orange-800' : 'text-red-800'}>
                  <strong>Attenzione:</strong> stai superando le ore disponibili di {Math.round(warnings.crediti.eccedenza * 100) / 100}h credito.
                  <br />
                  <span className="text-sm">
                    Disponibili: {warnings.crediti.disponibili}h | Necessari: {Math.round(warnings.crediti.necessari * 100) / 100}h
                  </span>
                  <br />
                  {warnings.crediti.permesso ? (
                    <span className="text-sm font-semibold">Le ore extra verranno fatturate secondo il listino prezzi.</span>
                  ) : (
                    <span className="text-sm font-semibold">Eccedenza massima consentita: 2h credito. Riduci la durata della prenotazione.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-[#053c5e] hover:bg-[#1f7a8c]"
              disabled={creaPrenotazioneMutation.isPending || warnings.sovrapposizione || (warnings.crediti && !warnings.crediti.permesso)}
            >
              {creaPrenotazioneMutation.isPending ? 'Prenotazione...' : 'Conferma Prenotazione'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
