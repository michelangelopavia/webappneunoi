import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function GestioneSale() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSala, setEditingSala] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipi_utilizzo: [],
    capienza: '',
    descrizione: '',
    solo_staff: false,
    colore: '#1f7a8c'
  });
  const queryClient = useQueryClient();

  const { data: sale = [] } = useQuery({
    queryKey: ['sale'],
    queryFn: () => neunoi.entities.SalaRiunioni.list('-created_date'),
    initialData: []
  });

  const salvaMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        capienza: parseInt(data.capienza),
        attiva: true
      };

      if (editingSala) {
        await neunoi.entities.SalaRiunioni.update(editingSala.id, payload);
      } else {
        await neunoi.entities.SalaRiunioni.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale'] });
      setDialogOpen(false);
      setEditingSala(null);
      resetForm();
      toast.success(editingSala ? 'Sala aggiornata' : 'Sala creata');
    }
  });

  const eliminaMutation = useMutation({
    mutationFn: (id) => neunoi.entities.SalaRiunioni.update(id, { attiva: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale'] });
      toast.success('Sala disattivata');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      tipi_utilizzo: [],
      capienza: '',
      descrizione: '',
      solo_staff: false,
      colore: '#1f7a8c'
    });
  };

  const openEdit = (sala) => {
    setEditingSala(sala);
    setFormData(sala);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingSala(null);
    resetForm();
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sale Riunioni ({sale.filter(s => s.attiva).length})</CardTitle>
            <Button onClick={openNew} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Sala
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sale.filter(s => s.attiva).map(sala => (
              <div key={sala.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-4 h-4 rounded" style={{backgroundColor: sala.colore || '#1f7a8c'}}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#053c5e]">{sala.nome}</span>
                      {sala.tipi_utilizzo?.includes('call') && (
                        <Badge className="bg-blue-100 text-blue-800">Call</Badge>
                      )}
                      {sala.tipi_utilizzo?.includes('riunione') && (
                        <Badge className="bg-purple-100 text-purple-800">Riunione</Badge>
                      )}
                      {sala.solo_staff && <Badge className="bg-orange-100 text-orange-800">Solo Staff</Badge>}
                    </div>
                    <div className="text-sm text-slate-600">
                      Capienza: {sala.capienza} {sala.capienza === 1 ? 'persona' : 'persone'}
                    </div>
                    {sala.descrizione && (
                      <p className="text-sm text-slate-500 mt-1">{sala.descrizione}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(sala)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => eliminaMutation.mutate(sala.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSala ? 'Modifica Sala' : 'Nuova Sala'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); salvaMutation.mutate(formData); }} className="space-y-4">
            <div>
              <Label>Nome Sala *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>

            <div>
              <Label>Tipi di Utilizzo *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tipo_call"
                    checked={formData.tipi_utilizzo?.includes('call')}
                    onCheckedChange={(checked) => {
                      const newTipi = checked 
                        ? [...(formData.tipi_utilizzo || []), 'call']
                        : (formData.tipi_utilizzo || []).filter(t => t !== 'call');
                      setFormData({...formData, tipi_utilizzo: newTipi});
                    }}
                  />
                  <label htmlFor="tipo_call" className="text-sm cursor-pointer">
                    Call (individuale)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tipo_riunione"
                    checked={formData.tipi_utilizzo?.includes('riunione')}
                    onCheckedChange={(checked) => {
                      const newTipi = checked 
                        ? [...(formData.tipi_utilizzo || []), 'riunione']
                        : (formData.tipi_utilizzo || []).filter(t => t !== 'riunione');
                      setFormData({...formData, tipi_utilizzo: newTipi});
                    }}
                  />
                  <label htmlFor="tipo_riunione" className="text-sm cursor-pointer">
                    Riunione (collettiva)
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label>Capienza Massima (n. persone) *</Label>
              <Input type="number" min="1" value={formData.capienza} onChange={(e) => setFormData({...formData, capienza: e.target.value})} required />
              <p className="text-xs text-slate-500 mt-1">Numero massimo di persone che possono utilizzare la sala</p>
            </div>

            <div>
              <Label>Descrizione e Dotazioni</Label>
              <Textarea value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} rows={3} />
            </div>

            <div>
              <Label>Colore Calendario</Label>
              <Input type="color" value={formData.colore} onChange={(e) => setFormData({...formData, colore: e.target.value})} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="solo_staff"
                checked={formData.solo_staff}
                onCheckedChange={(checked) => setFormData({...formData, solo_staff: checked})}
              />
              <label htmlFor="solo_staff" className="text-sm cursor-pointer">
                Prenotabile solo da Host/Admin
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]">Salva</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
