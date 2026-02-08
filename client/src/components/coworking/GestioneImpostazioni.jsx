import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, RefreshCcw, Info, Activity } from 'lucide-react';

export default function GestioneImpostazioni() {
    const queryClient = useQueryClient();
    const [templates, setTemplates] = useState({});

    const { data: settings = [], isLoading } = useQuery({
        queryKey: ['sistema_settings'],
        queryFn: async () => {
            const data = await neunoi.entities.SistemaSetting.list();
            // Sync local state
            const temps = {};
            data.forEach(s => {
                temps[s.chiave] = s.valore;
            });
            setTemplates(temps);
            return data;
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ chiave, valore }) => {
            const setting = settings.find(s => s.chiave === chiave);
            if (setting) {
                await neunoi.entities.SistemaSetting.update(setting.id, { valore });
            } else {
                await neunoi.entities.SistemaSetting.create({ chiave, valore });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sistema_settings'] });
            toast.success('Impostazione salvata con successo');
        },
        onError: (err) => {
            toast.error('Errore durante il salvataggio: ' + err.message);
        }
    });

    if (isLoading) return <div>Caricamento impostazioni...</div>;

    const handleChange = (chiave, valore) => {
        setTemplates(prev => ({ ...prev, [chiave]: valore }));
    };

    const handleSave = (chiave) => {
        updateMutation.mutate({ chiave, valore: templates[chiave] });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#1f7a8c]" />
                        Template Mail Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 border-l-4 border-blue-400 rounded-r-lg flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700">
                            <p className="font-semibold mb-1">Istruzioni:</p>
                            <p>Questa mail viene inviata automaticamente ogni volta che un utente o un ospite effettua il check-in.</p>
                            <p className="mt-1">Puoi usare il segnaposto <strong>{`{nome}`}</strong> per inserire il nome dell'utente.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Testo della Mail</Label>
                        <Textarea
                            value={templates['testo_mail_checkin'] || ''}
                            onChange={(e) => handleChange('testo_mail_checkin', e.target.value)}
                            rows={8}
                            placeholder="Inserisci il testo della mail..."
                            className="font-sans text-base"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={() => handleSave('testo_mail_checkin')}
                            disabled={updateMutation.isPending}
                            className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salva Template
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="opacity-60 grayscale cursor-not-allowed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5" />
                        Altre Notifiche Automatiche (Prossimamente)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">In futuro potrai gestire qui anche i template per le ricevute, le notifiche di scadenza abbonamento e i promemoria task.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        Diagnostica di Sistema
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                            <div>
                                <h3 className="font-semibold">Test Connessione Email</h3>
                                <p className="text-sm text-slate-500">Verifica se il server riesce a connettersi al provider SMTP.</p>
                            </div>
                            <Button
                                onClick={async () => {
                                    try {
                                        toast.loading('Test connessione in corso...');
                                        const res = await neunoi.admin.testEmailConnection();
                                        toast.dismiss();
                                        if (res.connection_result?.success) {
                                            toast.success('✅ Connessione SMTP Riuscita!');
                                        } else {
                                            toast.error('❌ Connessione Fallita');
                                            console.error('SMTP Error:', res);
                                            alert(JSON.stringify(res, null, 2));
                                        }
                                    } catch (e) {
                                        toast.dismiss();
                                        toast.error('Errore chiamata API: ' + e.message);
                                    }
                                }}
                                variant="outline"
                            >
                                Esegui Test
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
