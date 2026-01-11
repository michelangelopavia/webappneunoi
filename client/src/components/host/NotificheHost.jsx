import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, X, AlertTriangle, Calendar, Clock, CheckCircle2, CreditCard, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NotificheHost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [metodoPagamento, setMetodoPagamento] = useState('contanti');

  // Carica abbonamenti in scadenza/scaduti
  const { data: abbonamenti = [] } = useQuery({
    queryKey: ['abbonamenti'],
    queryFn: () => neunoi.entities.AbbonamentoUtente.list('-data_scadenza'),
    initialData: []
  });

  // Carica task/notifiche manuali per host
  const { data: taskManuali = [] } = useQuery({
    queryKey: ['task', 'host', 'attivi'],
    queryFn: async () => {
      const allTasks = await neunoi.entities.TaskNotifica.filter({
        destinatario_tipo: 'host',
        stato: 'attivo',
        tipo: 'task_manuale'
      });
      return allTasks;
    },
    initialData: []
  });

  // Carica TUTTE le notifiche abbonamenti archiviate
  const { data: notificheAbbonamentiArchiviate = [] } = useQuery({
    queryKey: ['task', 'abbonamenti', 'archiviati'],
    queryFn: async () => {
      return await neunoi.entities.TaskNotifica.filter({
        tipo: { _in: ['abbonamento_scadenza', 'abbonamento_scaduto'] },
        stato: 'completato'
      });
    },
    initialData: []
  });

  // Carica ordini non pagati
  const { data: ordiniNonPagati = [] } = useQuery({
    queryKey: ['ordini', 'non_pagati'],
    queryFn: () => neunoi.entities.OrdineCoworking.filter({ stato_pagamento: 'non_pagato' }),
    initialData: []
  });

  // Carica task completati/abbandonati per host
  const { data: taskArchiviati = [] } = useQuery({
    queryKey: ['task', 'host', 'archiviati'],
    queryFn: async () => {
      return await neunoi.entities.TaskNotifica.filter({
        destinatario_tipo: 'host',
        stato: { _in: ['completato', 'abbandonato'] }
      });
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
      queryClient.invalidateQueries({ queryKey: ['task'] });
      toast.success('Task aggiornato');
    }
  });

  const registraPagamentoMutation = useMutation({
    mutationFn: async ({ orderId, taskId, metodo }) => {
      // 1. Update Order
      await neunoi.entities.OrdineCoworking.update(orderId, {
        stato_pagamento: 'pagato',
        metodo_pagamento: metodo
      });

      // 2. Complete/Archive Task
      if (typeof taskId === 'string') {
        if (taskId.startsWith('abb_')) {
          const abbId = taskId.replace('abb_', '');
          await archiviaMutation.mutateAsync({ abbonamentoId: abbId, tipo: 'pagamento_registrato' });
        } else if (taskId.startsWith('ord_')) {
          const ordId = taskId.replace('ord_', '');
          await archiviaMutation.mutateAsync({ ordineId: ordId, tipo: 'pagamento_registrato' });
        }
      } else if (taskId) {
        // It's a real TaskNotifica ID (manual task)
        await neunoi.entities.TaskNotifica.update(taskId, {
          stato: 'completato',
          completato_da_id: user?.id,
          completato_da_nome: user?.full_name,
          data_completamento: new Date().toISOString()
        });
      }

      // 3. Regenerate Receipt (Backend side via sendReceipt which generates and sends)
      await neunoi.coworking.sendReceipt(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['ordini'] });
      setPaymentDialogOpen(false);
      toast.success('Pagamento registrato e ricevuta inviata');
    },
    onError: () => toast.error('Errore durante la registrazione del pagamento')
  });

  const archiviaMutation = useMutation({
    mutationFn: async ({ abbonamentoId, ordineId, tipo }) => {
      await neunoi.entities.TaskNotifica.create({
        tipo: tipo,
        titolo: `Notifica archiviata`,
        descrizione: ordineId ? `Pagamento ordine #${ordineId} gestito` : `Abbonamento gestito`,
        riferimento_abbonamento_id: abbonamentoId ? Number(abbonamentoId) : null,
        riferimento_ordine_id: ordineId ? Number(ordineId) : null,
        data_inizio: new Date().toISOString().split('T')[0],
        stato: 'completato',
        completato_da_id: user?.id,
        completato_da_nome: user?.full_name,
        data_completamento: new Date().toISOString(),
        destinatario_tipo: 'host'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      toast.success('Notifica archiviata');
    },
    onError: (err) => {
      console.error('❌ Errore durante l\'archiviazione:', err);
      toast.error('Impossibile archiviare la notifica');
    }
  });

  // Genera notifiche automatiche per abbonamenti (escludi quelli già archiviati)
  const taskArchiviatiIds = new Set(
    taskArchiviati
      .filter(n => n.riferimento_abbonamento_id || n.riferimento_ordine_id)
      .map(n => n.riferimento_abbonamento_id ? `abb_${n.riferimento_abbonamento_id}` : `ord_${n.riferimento_ordine_id}`)
  );

  // 1. Notifiche Ordini Non Pagati
  const notifichePagamenti = ordiniNonPagati
    .filter(ord => !taskArchiviatiIds.has(`ord_${ord.id}`))
    .map(ord => ({
      id: `ord_${ord.id}`,
      riferimento_ordine_id: ord.id,
      tipo: 'pagamento_mancante',
      titolo: `Pagamento Mancante - ${ord.profilo_nome_completo || 'Socio'}`,
      descrizione: `L'ordine #${ord.id} di ${ord.totale}€ risuona come "Non Pagato".`,
      priorita: 'alta',
      data: new Date(ord.data_ordine)
    }));

  // 2, 3, 4. Notifiche Abbonamenti (Esaustione e Scadenza Perpetua)
  const notificheServizi = abbonamenti
    .filter(abb => {
      const abbKey = `abb_${abb.id}`;
      if (taskArchiviatiIds.has(abbKey)) return false;

      const oggi = new Date();
      const inizio = new Date(abb.data_inizio);
      const scadenza = new Date(abb.data_scadenza);
      const durataGiorni = Math.round((scadenza - inizio) / (1000 * 60 * 60 * 24));

      const ingressiFiniti = abb.ingressi_totali > 0 && abb.ingressi_usati >= abb.ingressi_totali;
      const oreSaleFinite = abb.ore_sale_totali > 0 && abb.ore_sale_usate >= abb.ore_sale_totali;
      const tempoScaduto = oggi > scadenza && durataGiorni >= 7;

      return ingressiFiniti || oreSaleFinite || tempoScaduto;
    })
    .map(abb => {
      const oggi = new Date();
      const inizio = new Date(abb.data_inizio);
      const scadenza = new Date(abb.data_scadenza);
      const durataGiorni = Math.round((scadenza - inizio) / (1000 * 60 * 60 * 24));

      const ingressiFiniti = abb.ingressi_totali > 0 && abb.ingressi_usati >= abb.ingressi_totali;
      const oreSaleFinite = abb.ore_sale_totali > 0 && abb.ore_sale_usate >= abb.ore_sale_totali;
      const tempoScaduto = oggi > scadenza && durataGiorni >= 7;

      let ragioni = [];
      if (ingressiFiniti) ragioni.push("ingressi esauriti");
      if (oreSaleFinite) ragioni.push("ore sale esaurite");
      if (tempoScaduto) ragioni.push("tempo scaduto");

      const nomeUtente = abb.profilo_nome_completo || 'Socio';

      return {
        id: `abb_${abb.id}`,
        abbonamento_id: abb.id,
        tipo: 'servizio_finito',
        titolo: `Servizio Concluso - ${nomeUtente}`,
        descrizione: `L'abbonamento "${abb.tipo_abbonamento_nome}" è terminato per: ${ragioni.join(', ')}.`,
        priorita: 'media',
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
    if (tipo === 'pagamento_mancante') return <CreditCard className="w-5 h-5 text-red-600" />;
    if (tipo === 'servizio_finito') return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    return <Bell className="w-5 h-5 text-[#1f7a8c]" />;
  };

  const tutteNotifiche = [...notifichePagamenti, ...notificheServizi, ...taskManuali].sort((a, b) => {
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
                        {notifica.riferimento_ordine_id ? (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOrderForPayment(notifica.riferimento_ordine_id);
                                setSelectedTaskId(notifica.id);
                                setPaymentDialogOpen(true);
                              }}
                              className="bg-[#053c5e] hover:bg-[#1f7a8c] h-8"
                              title="Registra Pagamento"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Paga
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => archiviaMutation.mutate({
                                ordineId: notifica.riferimento_ordine_id,
                                tipo: notifica.tipo
                              })}
                              className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                              title="Segna come gestito"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              OK
                            </Button>
                          </div>
                        ) : notifica.tipo === 'task_manuale' ? (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => completaMutation.mutate({ taskId: notifica.id, stato: 'completato' })}
                              className="bg-green-600 hover:bg-green-700 h-8"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completaMutation.mutate({ taskId: notifica.id, stato: 'abbandonato' })}
                              className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Gestita
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
      {/* DIALOG REGISTRA PAGAMENTO */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Stai registrando il pagamento per l'ordine:</p>
              <p className="font-bold text-[#053c5e]">#{selectedOrderForPayment}</p>
            </div>

            <div>
              <Label>Metodo di Pagamento *</Label>
              <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="carta">Carta di Credito/Bancomat</SelectItem>
                  <SelectItem value="bonifico">Bonifico</SelectItem>
                  <SelectItem value="neu">NEU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => registraPagamentoMutation.mutate({
                  orderId: selectedOrderForPayment,
                  taskId: selectedTaskId,
                  metodo: metodoPagamento
                })}
                className="bg-green-600 hover:bg-green-700"
                disabled={registraPagamentoMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Conferma Pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
