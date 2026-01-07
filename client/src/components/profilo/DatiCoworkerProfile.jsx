import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Edit, Save, X, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function DatiCoworkerProfile({ profiloData }) {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);

    // Initialize with passed data or empty
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        telefono: '',
        citta_residenza: '',
        paese_residenza: '',
        ragione_sociale: '',
        p_iva: '',
        codice_univoco: '',
        indirizzo: ''
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await neunoi.auth.me();
            setUser(currentUser);
        };
        loadUser();
    }, []);

    // Sync form data when prop changes
    useEffect(() => {
        if (profiloData) {
            setFormData({
                first_name: profiloData.first_name || '',
                last_name: profiloData.last_name || '',
                telefono: profiloData.telefono || '',
                citta_residenza: profiloData.citta_residenza || '',
                paese_residenza: profiloData.paese_residenza || '',
                ragione_sociale: profiloData.ragione_sociale || '',
                p_iva: profiloData.p_iva || '',
                codice_univoco: profiloData.codice_univoco || '',
                indirizzo: profiloData.indirizzo || '' // If available in model
            });
        }
    }, [profiloData]);

    const salvaMutation = useMutation({
        mutationFn: async (data) => {
            if (profiloData && profiloData.id) {
                await neunoi.entities.ProfiloCoworker.update(profiloData.id, data);
            } else {
                // Create if missing (should not happen if correctly flowed, but safety net)
                await neunoi.entities.ProfiloCoworker.create({
                    user_id: user.id,
                    email: user.email,
                    stato: 'iscritto',
                    ...data
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profilo_coworker'] });
            setEditing(false);
            toast.success('Dati profilo salvati con successo');
            // Force reload to update parent state if needed, or rely on react-query invalidation if parent used it (parent uses simple fetch in useEffect currently, so reload might be needed or callback)
            window.location.reload();
        },
        onError: (err) => {
            toast.error('Errore durante il salvataggio: ' + err.message);
        }
    });

    const handleSave = () => {
        salvaMutation.mutate(formData);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[#1f7a8c]" />
                        Dati Coworker & Fatturazione
                    </CardTitle>
                    {!editing ? (
                        <Button onClick={() => setEditing(true)} variant="outline" className="border-[#1f7a8c] text-[#1f7a8c]">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifica
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={() => setEditing(false)} variant="outline">
                                <X className="w-4 h-4 mr-2" />
                                Annulla
                            </Button>
                            <Button onClick={handleSave} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
                                <Save className="w-4 h-4 mr-2" />
                                Salva
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {!editing ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Nome</p>
                                    <p className="font-medium">{profiloData?.first_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Cognome</p>
                                    <p className="font-medium">{profiloData?.last_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Telefono</p>
                                    <p className="font-medium">{profiloData?.telefono || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Città Residenza</p>
                                    <p className="font-medium">
                                        {profiloData?.citta_residenza} {profiloData?.paese_residenza ? `(${profiloData.paese_residenza})` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm font-semibold text-slate-700 mb-3">Dati Aziendali / Fatturazione (Opzionale)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Ragione Sociale</p>
                                        <p className="font-medium">{profiloData?.ragione_sociale || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">P. IVA</p>
                                        <p className="font-medium">{profiloData?.p_iva || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Codice Univoco (SDI)</p>
                                        <p className="font-medium">{profiloData?.codice_univoco || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Nome</Label>
                                    <Input
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Cognome</Label>
                                    <Input
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Telefono</Label>
                                    <Input
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Città Residenza</Label>
                                    <Input
                                        value={formData.citta_residenza}
                                        onChange={(e) => setFormData({ ...formData, citta_residenza: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm font-semibold text-slate-700 mb-3">Dati Aziendali / Fatturazione</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Ragione Sociale</Label>
                                        <Input
                                            value={formData.ragione_sociale}
                                            onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                                            placeholder="Company Ltd."
                                        />
                                    </div>
                                    <div>
                                        <Label>Partita IVA</Label>
                                        <Input
                                            value={formData.p_iva}
                                            onChange={(e) => setFormData({ ...formData, p_iva: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Codice Univoco (SDI)</Label>
                                        <Input
                                            value={formData.codice_univoco}
                                            onChange={(e) => setFormData({ ...formData, codice_univoco: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
