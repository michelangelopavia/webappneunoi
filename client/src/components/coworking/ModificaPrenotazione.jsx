import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, AlertTriangle, User, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ModificaPrenotazione({ open, onOpenChange, prenotazione, user, abbonamenti = [] }) {
    const [formData, setFormData] = useState({
        sala_id: '',
        data: '',
        ora_inizio: '',
        ora_fine: '',
        tipo_utilizzo: ''
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
        if (prenotazione) {
            const dataInizio = new Date(prenotazione.data_inizio);
            const dataFine = new Date(prenotazione.data_fine);
            setFormData({
                sala_id: String(prenotazione.sala_id),
                data: dataInizio.toISOString().split('T')[0],
                ora_inizio: dataInizio.toTimeString().slice(0, 5),
                ora_fine: dataFine.toTimeString().slice(0, 5),
                tipo_utilizzo: prenotazione.tipo_utilizzo || 'call'
            });
        }
    }, [prenotazione]);

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
        const nuoveOreCredito = formData.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;
        const vecchieOreCredito = prenotazione?.ore_credito_consumate || 0;
        const deltaCredito = nuoveOreCredito - vecchieOreCredito;

        // Veritas sovrapposizioni (escludendo se stessa)
        const conflitto = prenotazioniEsistenti.some(p => {
            if (p.id === prenotazione.id) return false;
            const pInizio = new Date(p.data_inizio);
            const pFine = new Date(p.data_fine);
            const dataGiorno = new Date(formData.data);
            const pDataGiorno = new Date(p.data_inizio);
            dataGiorno.setHours(0, 0, 0, 0);
            pDataGiorno.setHours(0, 0, 0, 0);

            if (dataGiorno.getTime() !== pDataGiorno.getTime()) return false;
            return (dataInizio < pFine && dataFine > pInizio);
        });

        // Verifica crediti
        let creditiWarning = null;
        if (deltaCredito > 0) {
            const creditiDisponibili = abbonamenti.reduce((sum, abb) => {
                const oggi = new Date();
                oggi.setHours(0, 0, 0, 0);
                const inizio = new Date(abb.data_inizio);
                inizio.setHours(0, 0, 0, 0);
                const fine = new Date(abb.data_scadenza);
                fine.setHours(23, 59, 59, 999);
                if (inizio > oggi || fine < oggi) return sum;
                return sum + ((abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0));
            }, 0);
            const eccedenza = deltaCredito - creditiDisponibili;

            if (eccedenza > 0) {
                creditiWarning = {
                    disponibili: creditiDisponibili,
                    necessari: deltaCredito,
                    eccedenza: eccedenza,
                    permesso: eccedenza <= 2
                };
            }
        }

        setWarnings({ sovrapposizione: conflitto, crediti: creditiWarning });
    };

    const modificaMutation = useMutation({
        mutationFn: async (data) => {
            const sala = sale.find(s => String(s.id) === data.sala_id);
            if (!sala) throw new Error('Sala non trovata');

            const dataInizio = new Date(`${data.data}T${data.ora_inizio}`);
            const dataFine = new Date(`${data.data}T${data.ora_fine}`);
            const durataOre = (dataFine - dataInizio) / (1000 * 60 * 60);
            if (durataOre < 0.5) {
                throw new Error('La durata minima per una prenotazione è di 30 minuti');
            }
            const nuoveOreCredito = data.tipo_utilizzo === 'call' ? durataOre * 0.5 : durataOre;
            const vecchieOreCredito = prenotazione.ore_credito_consumate || 0;
            const deltaCredito = nuoveOreCredito - vecchieOreCredito;

            // Verifica orario
            const isAdminOrHost = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
            if (!isAdminOrHost) {
                const giorno = dataInizio.getDay();
                if (giorno === 0 || giorno === 6) throw new Error('Sale disponibili solo Lun-Ven');
                const ora = dataInizio.getHours();
                const oraFine = dataFine.getHours() + dataFine.getMinutes() / 60;
                if (ora < 9 || oraFine > 18.5) throw new Error('Orario disponibile: 9:00 - 18:30');
            }

            // Gestione crediti
            if (deltaCredito !== 0) {
                const result = await neunoi.entities.AbbonamentoUtente.filter({ user_id: user.id, attivo: true });
                const abbonamentiUtente = result;

                if (deltaCredito > 0) {
                    // Sottrai crediti (solo da abbonamenti attivi per data)
                    let daScalare = deltaCredito;
                    const oggi = new Date();
                    oggi.setHours(0, 0, 0, 0);

                    for (const abb of abbonamentiUtente) {
                        if (daScalare <= 0) break;
                        const inizioNum = new Date(abb.data_inizio);
                        inizioNum.setHours(0, 0, 0, 0);
                        const fineNum = new Date(abb.data_scadenza);
                        fineNum.setHours(23, 59, 59, 999);
                        if (inizioNum > oggi || fineNum < oggi) continue;

                        const disp = (abb.ore_sale_totali || 0) - (abb.ore_sale_usate || 0);
                        if (disp > 0) {
                            const amount = Math.min(daScalare, disp);
                            await neunoi.entities.AbbonamentoUtente.update(abb.id, {
                                ore_sale_usate: (abb.ore_sale_usate || 0) + amount
                            });
                            daScalare -= amount;
                        }
                    }
                    if (daScalare > 2) throw new Error('Crediti insufficienti (max 2h extra)');
                } else {
                    // Rimborsa crediti
                    let daRimborsare = Math.abs(deltaCredito);
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
            }

            // Aggiorna prenotazione
            await neunoi.entities.PrenotazioneSala.update(prenotazione.id, {
                sala_id: Number(data.sala_id),
                sala_nome: sala.nome,
                data_inizio: dataInizio.toISOString(),
                data_fine: dataFine.toISOString(),
                tipo_utilizzo: data.tipo_utilizzo,
                ore_credito_consumate: nuoveOreCredito
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
            queryClient.invalidateQueries({ queryKey: ['prenotazioni'] });
            toast.success('Prenotazione aggiornata');
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modifica Prenotazione</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Sala</Label>
                        <Select value={formData.sala_id} onValueChange={(v) => setFormData({ ...formData, sala_id: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {sale
                                    .filter(s => {
                                        const isAdmin = user.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));
                                        if (s.nome?.toLowerCase().includes('eventi') || s.solo_staff) {
                                            return isAdmin;
                                        }
                                        return true;
                                    })
                                    .map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="mb-3 block">Tipo Utilizzo</Label>
                        <RadioGroup
                            value={formData.tipo_utilizzo}
                            onValueChange={(v) => setFormData({ ...formData, tipo_utilizzo: v })}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="call" id="edit-call" className="peer sr-only" />
                                <Label
                                    htmlFor="edit-call"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                                >
                                    <User className="mb-2 h-6 w-6 text-[#1f7a8c]" />
                                    <span className="font-bold">Call</span>
                                    <span className="text-[10px] text-slate-500 uppercase mt-1 text-center">1 persona</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded mt-1">0.5x crediti</span>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="riunione" id="edit-riunione" className="peer sr-only" />
                                <Label
                                    htmlFor="edit-riunione"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-slate-50 hover:text-accent-foreground peer-data-[state=checked]:border-[#1f7a8c] [&:has([data-state=checked])]:border-[#1f7a8c] cursor-pointer"
                                >
                                    <Users className="mb-2 h-6 w-6 text-[#053c5e]" />
                                    <span className="font-bold">Riunione</span>
                                    <span className="text-[10px] text-slate-500 uppercase mt-1 text-center">Più persone</span>
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded mt-1">1x crediti</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div>
                        <Label>Data</Label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-md"
                            value={formData.data}
                            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Ora Inizio</Label>
                            <input
                                type="time"
                                className="w-full p-2 border rounded-md"
                                value={formData.ora_inizio}
                                onChange={(e) => setFormData({ ...formData, ora_inizio: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Ora Fine</Label>
                            <input
                                type="time"
                                className="w-full p-2 border rounded-md"
                                value={formData.ora_fine}
                                onChange={(e) => setFormData({ ...formData, ora_fine: e.target.value })}
                            />
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
                                La sala è già occupata in questo orario.
                            </AlertDescription>
                        </Alert>
                    )}

                    {warnings.crediti && (
                        <Alert className={warnings.crediti.permesso ? "border-orange-500 bg-orange-50" : "border-red-500 bg-red-50"}>
                            <AlertTriangle className={`h-4 w-4 ${warnings.crediti.permesso ? 'text-orange-600' : 'text-red-600'}`} />
                            <AlertDescription className={warnings.crediti.permesso ? 'text-orange-800' : 'text-red-800'}>
                                <strong>Attenzione:</strong> stai superando le ore disponibili di {Math.round(warnings.crediti.eccedenza * 100) / 100}h credito.
                                {!warnings.crediti.permesso && <div className="font-bold">Eccedenza massima 2h.</div>}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
                    <Button
                        onClick={() => modificaMutation.mutate(formData)}
                        disabled={modificaMutation.isPending || warnings.sovrapposizione || (warnings.crediti && !warnings.crediti.permesso)}
                    >
                        {modificaMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
