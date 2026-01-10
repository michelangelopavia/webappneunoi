import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Hand, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskCollettivi() {
    const [user, setUser] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await neunoi.auth.me();
            setUser(currentUser);
        };
        loadUser();
    }, []);

    const { data: tasks = [] } = useQuery({
        queryKey: ['task', 'collettivi'],
        queryFn: async () => {
            const allTasks = await neunoi.entities.TaskNotifica.list('-created_date');

            const collettivi = allTasks.filter(t => {
                return t.destinatario_tipo === 'collettivo' && t.stato === 'attivo';
            });

            // Filter by visibility dates
            const oggi = new Date().toISOString().split('T')[0];
            return collettivi.filter(t => {
                const dataInizio = t.data_inizio;
                const dataFine = t.data_fine;
                return dataInizio <= oggi && (!dataFine || dataFine >= oggi);
            });
        }
    });

    const prendiInCaricoMutation = useMutation({
        mutationFn: async (task) => {
            if (!user) return;

            const nuovoStorico = Array.isArray(task.storico) ? [...task.storico] : [];
            nuovoStorico.push({
                azione: 'presa_in_carico',
                utente_id: user.id,
                utente_nome: user.full_name,
                data: new Date().toISOString()
            });

            // Update the task to assign it to the current user
            await neunoi.entities.TaskNotifica.update(task.id, {
                destinatario_tipo: 'socio',
                destinatario_id: user.id,
                destinatario_nome: user.full_name,
                storico: nuovoStorico,
                stato: 'attivo' // It remains active but now it's personal
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task'] });
            toast.success('Task preso in carico e spostato nei tuoi task personali');
        },
        onError: (error) => {
            console.error('Errore prendi in carico:', error);
            toast.error('Errore durante l\'assegnazione del task');
        }
    });

    const getPrioritaColor = (priorita) => {
        const colors = {
            alta: 'bg-red-100 text-red-800',
            media: 'bg-orange-100 text-orange-800',
            bassa: 'bg-blue-100 text-blue-800'
        };
        return colors[priorita] || colors.media;
    };

    if (tasks.length === 0) return null; // Don't show the card if no tasks

    return (
        <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Users className="w-5 h-5" />
                    Task Collettivi - Chi se ne occupa?
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div key={task.id} className="p-4 border border-orange-200 bg-white rounded-lg hover:shadow-sm transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-[#053c5e] break-words">{task.titolo}</h3>
                                        <Badge className={`${getPrioritaColor(task.priorita)} whitespace-nowrap`}>{task.priorita}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-700 mb-2 break-words">{task.descrizione}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <span className="whitespace-nowrap">Da: <strong>{task.creato_da_nome}</strong></span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="whitespace-nowrap flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.data_inizio).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                </div>

                                <div className="shrink-0 pt-2 sm:pt-0 sm:ml-3 border-t sm:border-0 border-slate-100 mt-2 sm:mt-0">
                                    <Button
                                        size="sm"
                                        onClick={() => prendiInCaricoMutation.mutate(task)}
                                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                        <Hand className="w-4 h-4 mr-2" />
                                        Me ne occupo io
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
