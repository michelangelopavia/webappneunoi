import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, X, ListTodo, CheckCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskPersonali() {
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
    queryKey: ['task_personali', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allTasks = await neunoi.entities.TaskNotifica.list('-created_date');
      console.log('🔍 TUTTI I TASK:', allTasks);
      console.log('👤 USER:', user);
      console.log('👤 USER ID:', user.id, 'tipo:', typeof user.id);

      const mieiTasks = allTasks.filter(t => {
        const match = String(t.destinatario_id) === String(user.id);
        return match && t.tipo === 'task_manuale';
      });

      console.log('✅ TASK PERSONALI FINALI:', mieiTasks);
      return mieiTasks;
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ['task_personali'] });
      toast.success('Task aggiornato');
    }
  });

  const taskAttivi = tasks.filter(t => {
    if (t.stato !== 'attivo') return false;

    // Confronta date come stringhe ISO per evitare problemi di timezone
    const oggi = new Date().toISOString().split('T')[0];
    const dataInizio = t.data_inizio;
    const dataFine = t.data_fine;

    const isVisible = dataInizio <= oggi && (!dataFine || dataFine >= oggi);

    return isVisible;
  });

  const taskCompletati = tasks.filter(t => t.stato === 'completato');
  const taskAbbandonati = tasks.filter(t => t.stato === 'abbandonato');

  const getPrioritaColor = (priorita) => {
    const colors = {
      alta: 'bg-red-100 text-red-800',
      media: 'bg-orange-100 text-orange-800',
      bassa: 'bg-blue-100 text-blue-800'
    };
    return colors[priorita] || colors.media;
  };

  const renderTask = (task, showActions = true) => (
    <div key={task.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
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
            <span className="whitespace-nowrap">{new Date(task.data_inizio).toLocaleDateString('it-IT')}</span>
            {task.data_fine && (
              <>
                <span className="mx-0.5">→</span>
                <span className="whitespace-nowrap">{new Date(task.data_fine).toLocaleDateString('it-IT')}</span>
              </>
            )}
            {task.data_completamento && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="whitespace-nowrap text-[#1f7a8c]">Archiviato: {new Date(task.data_completamento).toLocaleDateString('it-IT')}</span>
              </>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 sm:ml-3 border-t sm:border-0 border-slate-100">
            <Button
              size="sm"
              onClick={() => completaMutation.mutate({ taskId: task.id, stato: 'completato' })}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 h-10 sm:h-9"
              title="Completa"
            >
              <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="ml-2 sm:hidden">Completa</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => completaMutation.mutate({ taskId: task.id, stato: 'abbandonato' })}
              className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50 h-10 sm:h-9"
              title="Abbandona"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="ml-2 sm:hidden">Rifiuta</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-[#1f7a8c]" />
          Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attivi" className="w-full">
          <TabsList className="flex flex-col sm:grid sm:grid-cols-3 w-full bg-[#bfdbf7] h-auto p-1 gap-1 sm:gap-0 font-medium">
            <TabsTrigger value="attivi" className="flex-1 py-2 text-xs sm:text-sm data-[state=active]:bg-[#053c5e] data-[state=active]:text-white transition-all">
              <ListTodo className="w-4 h-4 mr-2 hidden sm:inline" />
              Attivi ({taskAttivi.length})
            </TabsTrigger>
            <TabsTrigger value="completati" className="flex-1 py-2 text-xs sm:text-sm data-[state=active]:bg-[#053c5e] data-[state=active]:text-white transition-all">
              <CheckCheck className="w-4 h-4 mr-2 hidden sm:inline" />
              Completati ({taskCompletati.length})
            </TabsTrigger>
            <TabsTrigger value="abbandonati" className="flex-1 py-2 text-xs sm:text-sm data-[state=active]:bg-[#053c5e] data-[state=active]:text-white transition-all">
              <XCircle className="w-4 h-4 mr-2 hidden sm:inline" />
              Abbandonati ({taskAbbandonati.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attivi" className="mt-4">
            <div className="space-y-3">
              {taskAttivi.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessun task attivo</p>
              ) : (
                taskAttivi.map(task => renderTask(task, true))
              )}
            </div>
          </TabsContent>

          <TabsContent value="completati" className="mt-4">
            <div className="space-y-3">
              {taskCompletati.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessun task completato</p>
              ) : (
                taskCompletati.map(task => renderTask(task, false))
              )}
            </div>
          </TabsContent>

          <TabsContent value="abbandonati" className="mt-4">
            <div className="space-y-3">
              {taskAbbandonati.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessun task abbandonato</p>
              ) : (
                taskAbbandonati.map(task => renderTask(task, false))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
