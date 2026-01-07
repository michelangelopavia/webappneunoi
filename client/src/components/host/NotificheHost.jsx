import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, X, AlertTriangle, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificheHost() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await neunoi.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica abbonamenti in scadenza/scaduti
  const { data: abbonamenti = [] } = useQuery({
    queryKey: ['abbonamenti_notifiche'],
    queryFn: () => neunoi.entities.AbbonamentoUtente.list('-data_scadenza'),
    initialData: []
  });

  // Carica task/notifiche manuali per host
  const { data: taskManuali = [] } = useQuery({
    queryKey: ['task_host'],
    queryFn: async () => {
      const allTasks = await neunoi.entities.TaskNotifica.list('-created_date');
      console.log('🔍 TUTTI I TASK:', allTasks);

      const taskHost = allTasks.filter(t => {
        return t.destinatario_tipo === 'host' &&
          t.stato === 'attivo' &&
          t.tipo === 'task_manuale';
      });

      console.log('✅ TASK PER HOST FINALI:', taskHost);
      return taskHost;
    },
    initialData: []
  });

  // Carica notifiche abbonamenti già archiviate
  const { data: notificheArchiviate = [] } = useQuery({
    queryKey: ['notifiche_abbonamenti_archiviate'],
    queryFn: async () => {
      const tasks = await neunoi.entities.TaskNotifica.filter({
        tipo: 'abbonamento_scadenza'
      });
      return tasks;
    },
    initialData: []
  });

  const { data: notificheScaduti = [] } = useQuery({
    queryKey: ['notifiche_abbonamenti_scaduti'],
    queryFn: async () => {
      const tasks = await neunoi.entities.TaskNotifica.filter({
        tipo: 'abbonamento_scaduto'
      });
      return tasks;
    },
    initialData: []
  });

  // Carica task completati/abbandonati per host
  const { data: taskArchiviati = [] } = useQuery({
    queryKey: ['task_host_archiviati'],
    queryFn: async () => {
      const allTasks = await neunoi.entities.TaskNotifica.list('-data_completamento');
      return allTasks.filter(t =>
        t.destinatario_tipo === 'host' &&
        (t.stato === 'completato' || t.stato === 'abbandonato') &&
        t.tipo === 'task_manuale'
      );
    },
    initialData: []
  });

  const completaMutation = useMutation({
    mutationFn: async ({ taskId, stato }) => {
      await neunoi.entities.TaskNotifica.update(taskId, {
        stato: stato,
        completato_da_id: user?.id,
        completato_da_nome: user?.full_name,
        data_completamento: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_host'] });
      queryClient.invalidateQueries({ queryKey: ['task_host_archiviati'] });
      toast.success('Task aggiornato');
    }
  });

  const archiviaMutation = useMutation({
    mutationFn: async ({ abbonamentoId, tipo }) => {
      await neunoi.entities.TaskNotifica.create({
        tipo: tipo,
        titolo: `Notifica archiviata`,
        descrizione: `Abbonamento gestito`,
        riferimento_abbonamento_id: abbonamentoId,
        data_inizio: new Date().toISOString().split('T')[0],
        stato: 'completato',
        completato_da_id: user?.id,
        completato_da_nome: user?.full_name,
        data_completamento: new Date().toISOString(),
        destinatario_tipo: 'host'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifiche_abbonamenti_archiviate'] });
      queryClient.invalidateQueries({ queryKey: ['notifiche_abbonamenti_scaduti'] });
      toast.success('Notifica archiviata');
    }
  });

  // Genera notifiche automatiche per abbonamenti (escludi quelli già archiviati)
  const abbonatiArchivatiIds = new Set([
    ...notificheArchiviate.filter(n => n.stato === 'completato').map(n => n.riferimento_abbonamento_id),
    ...notificheScaduti.filter(n => n.stato === 'completato').map(n => n.riferimento_abbonamento_id)
  ]);

  const notificheAbbonamenti = abbonamenti
    .filter(abb => {
      // Escludi se già archiviato
      if (abbonatiArchivatiIds.has(abb.id)) return false;

      const oggi = new Date();
      const scadenza = new Date(abb.data_scadenza);
      const giorniRimasti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      return giorniRimasti <= 7; // Mostra se scade tra 7 giorni o è già scaduto
    })
    .map(abb => {
      const oggi = new Date();
      const scadenza = new Date(abb.data_scadenza);
      const giorniRimasti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      const isScaduto = giorniRimasti <= 0;

      return {
        id: `abb_${abb.id}`,
        abbonamento_id: abb.id,
        tipo: isScaduto ? 'abbonamento_scaduto' : 'abbonamento_scadenza',
        titolo: isScaduto
          ? `Abbonamento scaduto - ${abb.utente_nome}`
          : `Abbonamento in scadenza - ${abb.utente_nome}`,
        descrizione: isScaduto
          ? `L'abbonamento "${abb.tipo_abbonamento_nome}" è scaduto il ${scadenza.toLocaleDateString('it-IT')}. Contatta l'utente per il rinnovo.`
          : `L'abbonamento "${abb.tipo_abbonamento_nome}" scadrà tra ${giorniRimasti} giorni (${scadenza.toLocaleDateString('it-IT')}).`,
        priorita: isScaduto ? 'alta' : giorniRimasti <= 3 ? 'media' : 'bassa',
        data: scadenza,
        abbonamento: abb
      };
    });

  const getPrioritaColor = (priorita) => {
    const colors = {
      alta: 'bg-red-100 text-red-800 border-red-300',
      media: 'bg-orange-100 text-orange-800 border-orange-300',
      bassa: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[priorita] || colors.media;
  };

  const getTipoIcon = (tipo) => {
    if (tipo === 'abbonamento_scaduto') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (tipo === 'abbonamento_scadenza') return <Clock className="w-5 h-5 text-orange-600" />;
    return <Bell className="w-5 h-5 text-[#1f7a8c]" />;
  };

  const tutteNotifiche = [...notificheAbbonamenti, ...taskManuali].sort((a, b) => {
    const prioritaOrder = { alta: 3, media: 2, bassa: 1 };
    return (prioritaOrder[b.priorita] || 0) - (prioritaOrder[a.priorita] || 0);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#1f7a8c]" />
              Notifiche e Task Attivi
            </span>
            <Badge className="bg-[#db222a] text-white">{tutteNotifiche.length} attivi</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {tutteNotifiche.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-[#053c5e] font-semibold">Nessuna notifica attiva</p>
                  <p className="text-sm text-slate-500 mt-1">Ottimo lavoro! 🎉</p>
                </div>
              ) : (
                tutteNotifiche.map((notifica) => (
                  <div
                    key={notifica.id}
                    className={`p-4 border-l-4 rounded-lg ${getPrioritaColor(notifica.priorita)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTipoIcon(notifica.tipo)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[#053c5e]">{notifica.titolo}</h3>
                            <Badge className={getPrioritaColor(notifica.priorita)}>
                              {notifica.priorita}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{notifica.descrizione}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {notifica.creato_da_nome && (
                              <span>Da: <strong>{notifica.creato_da_nome}</strong></span>
                            )}
                            {notifica.data_inizio && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(notifica.data_inizio).toLocaleDateString('it-IT')}
                              </span>
                            )}
                            {notifica.data_fine && (
                              <span>→ {new Date(notifica.data_fine).toLocaleDateString('it-IT')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        {notifica.tipo === 'task_manuale' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => completaMutation.mutate({ taskId: notifica.id, stato: 'completato' })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completaMutation.mutate({ taskId: notifica.id, stato: 'abbandonato' })}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => archiviaMutation.mutate({
                              abbonamentoId: notifica.abbonamento_id,
                              tipo: notifica.tipo
                            })}
                            className="bg-green-600 hover:bg-green-700"
                            title="Segna come gestito"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Task Completati/Abbandonati */}
      {taskArchiviati.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-500" />
              Storico Task ({taskArchiviati.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {taskArchiviati.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-700">{task.titolo}</span>
                          <Badge className={task.stato === 'completato' ? 'bg-green-100 text-green-800' : 'bg-slate-300 text-slate-800'}>
                            {task.stato === 'completato' ? '✓ Completato' : '✗ Abbandonato'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{task.descrizione}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          {task.completato_da_nome && (
                            <span>Gestito da: {task.completato_da_nome} • </span>
                          )}
                          {task.data_completamento && (
                            <span>{new Date(task.data_completamento).toLocaleString('it-IT')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
