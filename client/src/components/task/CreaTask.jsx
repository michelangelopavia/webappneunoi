import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function CreaTask({ trigger }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [utenti, setUtenti] = useState([]);
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    destinatario_tipo: 'host',
    destinatario_id: [],
    priorita: 'media',
    data_inizio: new Date().toISOString().split('T')[0],
    durata_giorni: '7'
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await neunoi.auth.me();
        setUser(currentUser);

        // Prova prima con User.list (per admin), poi fallback a ProfiloSocio
        let allUsers = [];
        try {
          allUsers = await neunoi.entities.User.list();
          console.log('✅ Caricati utenti da User:', allUsers.length);
        } catch (userError) {
          console.log('ℹ️ Non posso accedere a User.list, uso ProfiloSocio');
          const profili = await neunoi.entities.ProfiloSocio.list();
          allUsers = profili.map(p => ({
            id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            roles: p.ruoli,
            role: p.ruoli?.[0]
          }));
          console.log('✅ Caricati profili:', allUsers.length);
        }

        setUtenti(allUsers);
      } catch (error) {
        console.error('❌ Errore caricamento:', error);
        toast.error('Errore nel caricamento degli utenti');
      }
    };
    loadData();
  }, []);

  const creaMutation = useMutation({
    mutationFn: async (data) => {
      const dataInizio = new Date(data.data_inizio);
      const dataFine = new Date(dataInizio);
      dataFine.setDate(dataFine.getDate() + parseInt(data.durata_giorni));

      // Se è per un socio specifico
      if (data.destinatario_tipo === 'socio' && data.destinatario_id) {
        const destinatari = Array.isArray(data.destinatario_id) ? data.destinatario_id : [data.destinatario_id];

        console.log('📝 Creazione task per destinatari:', destinatari);
        console.log('👥 Utenti disponibili:', utenti.map(u => ({ id: u.id, name: u.full_name })));

        // Crea un task per ogni destinatario
        const promises = destinatari.map(destId => {
          const destinatario = utenti.find(u => u.id === destId);
          console.log('🎯 Destinatario trovato per ID', destId, ':', destinatario);

          return neunoi.entities.TaskNotifica.create({
            tipo: 'task_manuale',
            titolo: data.titolo,
            descrizione: data.descrizione,
            creato_da_id: user.id,
            creato_da_nome: user.full_name,
            destinatario_id: destId,
            destinatario_nome: destinatario?.full_name || 'Socio',
            destinatario_tipo: 'socio',
            data_inizio: dataInizio.toISOString().split('T')[0],
            data_fine: dataFine.toISOString().split('T')[0],
            priorita: data.priorita,
            stato: 'attivo'
          });
        });

        await Promise.all(promises);
      } else if (data.destinatario_tipo === 'collettivo') {
        // Task collettivo
        await neunoi.entities.TaskNotifica.create({
          tipo: 'task_manuale',
          titolo: data.titolo,
          descrizione: data.descrizione,
          creato_da_id: user.id,
          creato_da_nome: user.full_name,
          destinatario_id: null,
          destinatario_nome: 'Tutti i Soci',
          destinatario_tipo: 'collettivo',
          data_inizio: dataInizio.toISOString().split('T')[0],
          data_fine: dataFine.toISOString().split('T')[0],
          priorita: data.priorita,
          is_collettivo: true,
          stato: 'attivo'
        });
      } else {
        // Task per host
        await neunoi.entities.TaskNotifica.create({
          tipo: 'task_manuale',
          titolo: data.titolo,
          descrizione: data.descrizione,
          creato_da_id: user.id,
          creato_da_nome: user.full_name,
          destinatario_id: null,
          destinatario_nome: 'Host',
          destinatario_tipo: 'host',
          data_inizio: dataInizio.toISOString().split('T')[0],
          data_fine: dataFine.toISOString().split('T')[0],
          priorita: data.priorita,
          stato: 'attivo'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
      setOpen(false);
      resetForm();
      toast.success('Task creato con successo');
    },
    onError: (error) => {
      console.error('Errore creazione task:', error);
      toast.error('Errore nella creazione del task');
    }
  });

  const resetForm = () => {
    setFormData({
      titolo: '',
      descrizione: '',
      destinatario_tipo: 'host',
      destinatario_id: [],
      priorita: 'media',
      data_inizio: new Date().toISOString().split('T')[0],
      durata_giorni: '7'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titolo || !formData.descrizione) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    if (formData.destinatario_tipo === 'socio' && (!formData.destinatario_id || (Array.isArray(formData.destinatario_id) && formData.destinatario_id.length === 0))) {
      toast.error('Seleziona almeno un destinatario');
      return;
    }
    creaMutation.mutate(formData);
  };

  const soci = utenti.filter(u =>
    u.roles?.includes('socio') || u.role === 'socio' ||
    u.roles?.includes('host') || u.role === 'host' ||
    u.roles?.includes('admin') || u.role === 'admin'
  );

  console.log('👥 Soci filtrati:', soci.length, soci.map(s => ({ name: s.full_name, id: s.id })));

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button className="bg-[#db222a] hover:bg-[#b01b22] text-white border border-white/20 shadow-lg w-full sm:w-auto transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Task
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Task</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Titolo *</Label>
                <Input
                  value={formData.titolo}
                  onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                  placeholder="Es: Contattare Mario Rossi per rinnovo"
                  required
                />
              </div>

              <div>
                <Label>Descrizione *</Label>
                <Textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  placeholder="Descrivi cosa deve essere fatto..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Destinatario *</Label>
                  <Select
                    value={formData.destinatario_tipo}
                    onValueChange={(value) => setFormData({ ...formData, destinatario_tipo: value, destinatario_id: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="host">Host (chiunque sia in turno)</SelectItem>
                      <SelectItem value="socio">Socio/a Specifico/a</SelectItem>
                      <SelectItem value="collettivo">Tutti i Soci (Task Collettivo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.destinatario_tipo === 'socio' && (
                  <div>
                    <Label>Seleziona Socio/a * (tieni Ctrl/Cmd per selezione multipla)</Label>
                    <select
                      multiple
                      className="w-full p-2 border rounded-md min-h-[120px]"
                      value={Array.isArray(formData.destinatario_id) ? formData.destinatario_id : formData.destinatario_id ? [formData.destinatario_id] : []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData({ ...formData, destinatario_id: selected });
                      }}
                    >
                      {soci.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Show priority for host and collective too */}
                {(formData.destinatario_tipo === 'host' || formData.destinatario_tipo === 'collettivo') && (
                  <div>
                    <Label>Priorità</Label>
                    <Select value={formData.priorita} onValueChange={(value) => setFormData({ ...formData, priorita: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bassa">Bassa</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.destinatario_tipo === 'socio' && (
                <div>
                  <Label>Priorità</Label>
                  <Select value={formData.priorita} onValueChange={(value) => setFormData({ ...formData, priorita: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bassa">Bassa</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inizio Visibilità</Label>
                  <Input
                    type="date"
                    value={formData.data_inizio}
                    onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Quando il task diventerà visibile
                  </p>
                </div>

                <div>
                  <Label>Durata (giorni)</Label>
                  <Input
                    type="number"
                    value={formData.durata_giorni}
                    onChange={(e) => setFormData({ ...formData, durata_giorni: e.target.value })}
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Per quanti giorni resta visibile
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]" disabled={creaMutation.isPending}>
                  {creaMutation.isPending ? 'Creazione...' : 'Crea Task'}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
