import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserCheck, AlertCircle } from 'lucide-react';

export default function RegistraIngressoDialog({ open, onOpenChange }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null); // This is now a ProfiloCoworker object
    const [selectedAbbonamento, setSelectedAbbonamento] = useState(null);
    const [durata, setDurata] = useState('mezza_giornata');
    const queryClient = useQueryClient();

    const { data: coworkingProfiles = [], isLoading: profilesLoading } = useQuery({
        queryKey: ['coworkers_search', searchTerm],
        queryFn: async () => {
            if (searchTerm.length < 2) {
                // Default view: Show COWORKERS with active carnets
                try {
                    const oggi = new Date();
                    oggi.setHours(0, 0, 0, 0);

                    // Fetch generic active subscriptions
                    // Cannot include User because we want CoworkerProfile, and relation from sub to profile is loose (id only usually)
                    const activeSubs = await neunoi.entities.AbbonamentoUtente.filter({
                        stato: 'attivo'
                    });

                    const uniqueProfileIds = new Set();
                    for (const sub of activeSubs) {
                        // Check validity
                        if (sub.ingressi_totali > 0 && sub.ingressi_usati >= sub.ingressi_totali) continue;
                        if (sub.data_scadenza && new Date(sub.data_scadenza) < oggi) continue;

                        if (sub.profilo_coworker_id) {
                            uniqueProfileIds.add(sub.profilo_coworker_id);
                        }
                    }

                    if (uniqueProfileIds.size === 0) return [];

                    const profileIds = Array.from(uniqueProfileIds).slice(0, 50);

                    // Fetch actual profiles
                    const profiles = await neunoi.entities.ProfiloCoworker.filter({
                        id: { _in: profileIds }
                    });

                    // Sort alpha
                    profiles.sort((a, b) => {
                        const nameA = (a.first_name + ' ' + a.last_name).toLowerCase();
                        const nameB = (b.first_name + ' ' + b.last_name).toLowerCase();
                        return nameA.localeCompare(nameB);
                    });

                    return profiles;
                } catch (e) {
                    console.error("Error fetching default list", e);
                    return [];
                }
            }

            // SEARCH CASE
            try {
                // Search by name OR email in ProfiloCoworker
                const res = await neunoi.entities.ProfiloCoworker.filter({
                    _or: [
                        { email: { _like: `%${searchTerm}%` } },
                        { first_name: { _like: `%${searchTerm}%` } },
                        { last_name: { _like: `%${searchTerm}%` } }
                    ]
                });
                return res;
            } catch (error) {
                console.error("Search error", error);
                return [];
            }
        },
        enabled: true
    });

    const { data: abbonamenti = [] } = useQuery({
        queryKey: ['abbonamenti_profilo', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser) return [];
            // Filter by profile ID now
            const res = await neunoi.entities.AbbonamentoUtente.filter({
                profilo_coworker_id: selectedUser.id,
                stato: 'attivo'
            });
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);
            return res.filter(a => new Date(a.data_scadenza) >= oggi && a.ingressi_totali > 0);
        },
        enabled: !!selectedUser
    });

    const registraMutation = useMutation({
        mutationFn: async () => {
            const ingressiDaScalare = durata === 'mezza_giornata' ? 1 : 2;
            const dataIngresso = new Date();
            dataIngresso.setHours(12, 0, 0, 0);

            const me = await neunoi.auth.me();

            await neunoi.entities.IngressoCoworking.create({
                user_id: selectedUser.user_id, // Might be null if guest, but that's allowed
                profilo_coworker_id: selectedUser.id,
                profilo_nome_completo: `${selectedUser.first_name} ${selectedUser.last_name}`,
                abbonamento_id: selectedAbbonamento.id,
                data_ingresso: dataIngresso.toISOString(),
                durata: durata,
                ingressi_consumati: ingressiDaScalare,
                tipo_ingresso: 'carnet',
                registrato_da: me.id
            });

            await neunoi.entities.AbbonamentoUtente.update(selectedAbbonamento.id, {
                ingressi_usati: (selectedAbbonamento.ingressi_usati || 0) + ingressiDaScalare
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['abbonamenti'] });
            queryClient.invalidateQueries({ queryKey: ['ingressi'] });
            queryClient.invalidateQueries({ queryKey: ['attivita_giorno'] });
            toast.success('Ingresso registrato correttamente');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Errore: ' + (err.message || 'impossibile registrare ingresso'));
        }
    });

    const handleClose = () => {
        setSelectedUser(null);
        setSelectedAbbonamento(null);
        setSearchTerm('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registra Ingresso Coworker</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!selectedUser ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Cerca coworker per nome o email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div className="max-h-[200px] overflow-y-auto border rounded-md">
                                {profilesLoading && <p className="p-4 text-center text-sm text-slate-500">Caricamento...</p>}
                                {!profilesLoading && searchTerm.length >= 2 && coworkingProfiles.length === 0 && (
                                    <p className="p-4 text-center text-sm text-slate-500">Nessun utente trovato</p>
                                )}
                                {coworkingProfiles.map(u => (
                                    <div
                                        key={u.id}
                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                                        onClick={() => setSelectedUser(u)}
                                    >
                                        <div className="font-bold">{u.first_name} {u.last_name}</div>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-[#053c5e]">{selectedUser.first_name} {selectedUser.last_name}</div>
                                    <div className="text-sm text-slate-500">{selectedUser.email}</div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setSelectedAbbonamento(null); }}>Cambia</Button>
                            </div>

                            {abbonamenti.length === 0 ? (
                                <div className="text-center py-4 text-orange-600 bg-orange-50 rounded border border-orange-100 p-4 flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8" />
                                    <p className="font-bold">Nessun carnet attivo trovato per questo coworker.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Seleziona Carnet</Label>
                                        <Select value={selectedAbbonamento?.id?.toString()} onValueChange={(val) => setSelectedAbbonamento(abbonamenti.find(a => a.id.toString() === val))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Scegli un carnet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {abbonamenti.map(a => (
                                                    <SelectItem key={a.id} value={a.id.toString()}>
                                                        {a.tipo_abbonamento_nome} ({a.ingressi_totali - a.ingressi_usati} rimasti)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedAbbonamento && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Durata</Label>
                                                <Select value={durata} onValueChange={setDurata}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="mezza_giornata">Mezza Giornata (1 ingresso)</SelectItem>
                                                        <SelectItem value="giornata_intera">Giornata Intera (2 ingressi)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                className="w-full bg-[#db222a] hover:bg-[#1f7a8c] h-12 text-lg font-bold"
                                                disabled={registraMutation.isPending}
                                                onClick={() => registraMutation.mutate()}
                                            >
                                                <UserCheck className="w-5 h-5 mr-2" />
                                                {registraMutation.isPending ? 'Registrazione...' : 'REGISTRA INGRESSO'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
