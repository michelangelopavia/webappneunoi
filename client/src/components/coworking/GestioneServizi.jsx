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
import { Plus, Edit, Trash2, Bell, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GestioneServizi() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServizio, setEditingServizio] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'ingresso_giornaliero',
    prezzo: '',
    durata_tipo: 'mesi',
    durata_valore: '',
    numero_ingressi: '',
    ore_sale_incluse: '',
    descrizione: '',
    notifiche_scadenza: [],
    notifiche_ingressi: [],
    notifiche_ore: []
  });
  const queryClient = useQueryClient();

  const { data: servizi = [] } = useQuery({
    queryKey: ['tipi_abbonamento'],
    queryFn: () => neunoi.entities.TipoAbbonamento.list('-created_date'),
    initialData: []
  });

  const salvaMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        nome: data.nome,
        categoria: data.categoria,
        prezzo: parseFloat(data.prezzo),
        durata_mesi: data.durata_tipo === 'mesi' && data.durata_valore ? parseFloat(data.durata_valore) : null,
        durata_giorni: data.durata_tipo === 'giorni' && data.durata_valore ? parseFloat(data.durata_valore) : null,
        numero_ingressi: data.numero_ingressi ? parseFloat(data.numero_ingressi) : null,
        ore_sale_incluse: data.ore_sale_incluse ? parseFloat(data.ore_sale_incluse) : null,
        descrizione: data.descrizione,
        notifiche_scadenza: data.notifiche_scadenza.filter(n => n.giorni && n.testo),
        notifiche_ingressi: data.notifiche_ingressi.filter(n => n.soglia && n.testo),
        notifiche_ore: data.notifiche_ore.filter(n => n.soglia && n.testo),
        attivo: true
      };

      if (editingServizio) {
        await neunoi.entities.TipoAbbonamento.update(editingServizio.id, payload);
      } else {
        await neunoi.entities.TipoAbbonamento.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipi_abbonamento'] });
      setDialogOpen(false);
      setEditingServizio(null);
      resetForm();
      toast.success(editingServizio ? 'Servizio aggiornato' : 'Servizio creato');
    }
  });

  const eliminaMutation = useMutation({
    mutationFn: (id) => neunoi.entities.TipoAbbonamento.update(id, { attivo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipi_abbonamento'] });
      toast.success('Servizio disattivato');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: 'ingresso_giornaliero',
      prezzo: '',
      durata_tipo: 'mesi',
      durata_valore: '',
      numero_ingressi: '',
      ore_sale_incluse: '',
      descrizione: '',
      notifiche_scadenza: [],
      notifiche_ingressi: [],
      notifiche_ore: []
    });
  };

  const openEdit = (servizio) => {
    setEditingServizio(servizio);
    setFormData({
      nome: servizio.nome,
      categoria: servizio.categoria,
      prezzo: servizio.prezzo,
      durata_tipo: servizio.durata_mesi ? 'mesi' : 'giorni',
      durata_valore: servizio.durata_mesi || servizio.durata_giorni || '',
      numero_ingressi: servizio.numero_ingressi || '',
      ore_sale_incluse: servizio.ore_sale_incluse || '',
      descrizione: servizio.descrizione || '',
      notifiche_scadenza: servizio.notifiche_scadenza || [],
      notifiche_ingressi: servizio.notifiche_ingressi || [],
      notifiche_ore: servizio.notifiche_ore || []
    });
    setDialogOpen(true);
  };

  const aggiungiNotificaScadenza = () => {
    setFormData({
      ...formData,
      notifiche_scadenza: [...formData.notifiche_scadenza, { giorni: '', testo: '' }]
    });
  };

  const rimuoviNotificaScadenza = (index) => {
    setFormData({
      ...formData,
      notifiche_scadenza: formData.notifiche_scadenza.filter((_, i) => i !== index)
    });
  };

  const aggiornaNotificaScadenza = (index, field, value) => {
    const updated = [...formData.notifiche_scadenza];
    updated[index][field] = value;
    setFormData({ ...formData, notifiche_scadenza: updated });
  };

  const aggiungiNotificaIngressi = () => {
    setFormData({
      ...formData,
      notifiche_ingressi: [...formData.notifiche_ingressi, { soglia: '', testo: '' }]
    });
  };

  const rimuoviNotificaIngressi = (index) => {
    setFormData({
      ...formData,
      notifiche_ingressi: formData.notifiche_ingressi.filter((_, i) => i !== index)
    });
  };

  const aggiornaNotificaIngressi = (index, field, value) => {
    const updated = [...formData.notifiche_ingressi];
    updated[index][field] = value;
    setFormData({ ...formData, notifiche_ingressi: updated });
  };

  const aggiungiNotificaOre = () => {
    setFormData({
      ...formData,
      notifiche_ore: [...formData.notifiche_ore, { soglia: '', testo: '' }]
    });
  };

  const rimuoviNotificaOre = (index) => {
    setFormData({
      ...formData,
      notifiche_ore: formData.notifiche_ore.filter((_, i) => i !== index)
    });
  };

  const aggiornaNotificaOre = (index, field, value) => {
    const updated = [...formData.notifiche_ore];
    updated[index][field] = value;
    setFormData({ ...formData, notifiche_ore: updated });
  };

  const inviaMailProva = async (tipo, notifica) => {
    const currentUser = await neunoi.auth.me();

    // Dati di esempio
    const dataOggi = new Date();
    const dataScadenza = new Date(dataOggi);
    if (formData.durata_tipo === 'mesi' && formData.durata_valore) {
      dataScadenza.setMonth(dataScadenza.getMonth() + parseFloat(formData.durata_valore));
    } else if (formData.durata_tipo === 'giorni' && formData.durata_valore) {
      dataScadenza.setDate(dataScadenza.getDate() + parseFloat(formData.durata_valore));
    } else {
      dataScadenza.setDate(dataScadenza.getDate() + 30);
    }

    let testo = notifica.testo;
    testo = testo.replace(/{nome_utente}/g, currentUser.full_name);
    testo = testo.replace(/{nome_abbonamento}/g, formData.nome || 'Abbonamento Test');
    testo = testo.replace(/{data_scadenza}/g, dataScadenza.toLocaleDateString('it-IT'));

    if (tipo === 'scadenza') {
      testo = testo.replace(/{giorni_rimanenti}/g, notifica.giorni || '7');
    } else if (tipo === 'ingressi') {
      testo = testo.replace(/{ingressi_rimanenti}/g, notifica.soglia || '2');
    } else if (tipo === 'ore') {
      testo = testo.replace(/{ore_rimanenti}/g, notifica.soglia || '3');
    }

    const logoUrl = 'https://www.h2oh.neunoi.it/wp-content/uploads/2025/03/neunoi_logo_bianco.png';
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background-color: #053c5e; padding: 30px 20px; text-align: center; border-bottom: 4px solid #db222a; }
            .header img { width: 150px; height: auto; display: inline-block; }
            .content { padding: 40px 30px; color: #333; line-height: 1.6; font-size: 16px; }
            .footer { background-color: #053c5e; color: white; padding: 25px 20px; text-align: center; font-size: 13px; border-top: 4px solid #db222a; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="neu [nòi]">
            </div>
            <div class="content">
              ${testo.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br>').join('')}
            </div>
            <div class="footer">
              <p><strong>neu [nòi] spazio al lavoro APS</strong></p>
              <p>via Alloro 64, 90133 Palermo</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await neunoi.integrations.Core.SendEmail({
        to: currentUser.email,
        subject: `[TEST] Notifica ${tipo} - ${formData.nome || 'Abbonamento'}`,
        html: htmlEmail
      });
      toast.success(`Email di prova inviata a ${currentUser.email}`);
    } catch (error) {
      toast.error('Errore invio email di prova');
    }
  };

  const openNew = () => {
    setEditingServizio(null);
    resetForm();
    setDialogOpen(true);
  };

  const getCategoriaLabel = (cat) => {
    const labels = {
      ingresso_giornaliero: 'Ingresso Giornaliero',
      abbonamento: 'Abbonamento',
      carnet: 'Carnet',
      sala_riunioni: 'Sala Riunioni',
      extra: 'Extra'
    };
    return labels[cat] || cat;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Servizi e Prezzi ({servizi.filter(s => s.attivo).length})</CardTitle>
            <Button onClick={openNew} className="bg-[#053c5e] hover:bg-[#1f7a8c] w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Servizio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {servizi.filter(s => s.attivo).map(servizio => (
              <div key={servizio.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#053c5e]">{servizio.nome}</span>
                    <Badge className="bg-[#1f7a8c] text-white">{getCategoriaLabel(servizio.categoria)}</Badge>
                  </div>
                  {!!servizio.descrizione && (
                    <p className="text-sm text-slate-600 mb-2">{servizio.descrizione}</p>
                  )}
                  <div className="flex gap-4 text-sm text-slate-500">
                    {servizio.durata_mesi && <span>Durata: {servizio.durata_mesi} {servizio.durata_mesi === 1 ? 'mese' : 'mesi'}</span>}
                    {servizio.durata_giorni && <span>Durata: {servizio.durata_giorni} {servizio.durata_giorni === 1 ? 'giorno' : 'giorni'}</span>}
                    {servizio.numero_ingressi && <span>Ingressi: {servizio.numero_ingressi}</span>}
                    {servizio.ore_sale_incluse && <span>Ore sale: {servizio.ore_sale_incluse}h credito</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-[#db222a]">{servizio.prezzo}€</div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(servizio)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => eliminaMutation.mutate(servizio.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingServizio ? 'Modifica Servizio' : 'Nuovo Servizio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); salvaMutation.mutate(formData); }} className="space-y-4">
            <Tabs defaultValue="base" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[#bfdbf7]">
                <TabsTrigger value="base" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
                  Dati Base
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifiche
                </TabsTrigger>
              </TabsList>

              <TabsContent value="base" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Servizio *</Label>
                    <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ingresso_giornaliero">Ingresso Giornaliero</SelectItem>
                        <SelectItem value="abbonamento">Abbonamento</SelectItem>
                        <SelectItem value="carnet">Carnet</SelectItem>
                        <SelectItem value="sala_riunioni">Sala Riunioni</SelectItem>
                        <SelectItem value="extra">Extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Prezzo (€) *</Label>
                  <Input type="number" step="0.01" value={formData.prezzo} onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo Durata</Label>
                    <Select value={formData.durata_tipo} onValueChange={(value) => setFormData({ ...formData, durata_tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mesi">Mesi</SelectItem>
                        <SelectItem value="giorni">Giorni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Durata ({formData.durata_tipo})</Label>
                    <Input type="number" value={formData.durata_valore} onChange={(e) => setFormData({ ...formData, durata_valore: e.target.value })} placeholder={formData.durata_tipo === 'mesi' ? 'Es: 1' : 'Es: 7'} />
                  </div>
                </div>

                <div>
                  <Label>Numero Ingressi (per carnet)</Label>
                  <Input type="number" value={formData.numero_ingressi} onChange={(e) => setFormData({ ...formData, numero_ingressi: e.target.value })} />
                </div>

                <div>
                  <Label>Ore Sale Incluse (credito)</Label>
                  <Input type="number" step="0.5" value={formData.ore_sale_incluse} onChange={(e) => setFormData({ ...formData, ore_sale_incluse: e.target.value })} />
                  <p className="text-xs text-slate-500 mt-1">
                    Call = 0.5 crediti/ora | Riunione = 1 credito/ora. Es: 16h credito = 32h call o 16h riunione
                  </p>
                </div>

                <div>
                  <Label>Descrizione</Label>
                  <Textarea value={formData.descrizione} onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="notifiche" className="space-y-6 mt-4">
                <div className="bg-[#bfdbf7] p-4 rounded-lg">
                  <p className="text-sm text-[#053c5e] mb-2">
                    Configura quando inviare notifiche automatiche agli utenti per questo abbonamento.
                  </p>
                  <p className="text-xs text-[#053c5e]">
                    <strong>Variabili disponibili:</strong> {'{nome_utente}'}, {'{nome_abbonamento}'}, {'{data_scadenza}'}, {'{giorni_rimanenti}'}, {'{ingressi_rimanenti}'}, {'{ore_rimanenti}'}
                  </p>
                </div>

                {/* Notifiche Scadenza */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold text-[#053c5e]">Notifiche Scadenza</Label>
                    <Button type="button" size="sm" onClick={aggiungiNotificaScadenza} className="bg-[#1f7a8c] hover:bg-[#053c5e]">
                      <Plus className="w-4 h-4 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                  {formData.notifiche_scadenza.map((notifica, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Notifica #{index + 1}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => inviaMailProva('scadenza', notifica)}
                            disabled={!notifica.giorni || !notifica.testo}
                            className="border-[#1f7a8c] text-[#1f7a8c]"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Prova
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => rimuoviNotificaScadenza(index)} className="border-red-300 text-red-600">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Giorni prima della scadenza</Label>
                          <Input
                            type="number"
                            value={notifica.giorni}
                            onChange={(e) => aggiornaNotificaScadenza(index, 'giorni', e.target.value)}
                            placeholder="Es: 7"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Testo Email</Label>
                          <Textarea
                            value={notifica.testo}
                            onChange={(e) => aggiornaNotificaScadenza(index, 'testo', e.target.value)}
                            rows={3}
                            placeholder="Ciao {nome_utente}, il tuo abbonamento {nome_abbonamento} scadrà il {data_scadenza} (tra {giorni_rimanenti} giorni)..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.notifiche_scadenza.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Nessuna notifica configurata</p>
                  )}
                </div>

                {/* Notifiche Ingressi */}
                {formData.numero_ingressi && (
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold text-[#053c5e]">Notifiche Ingressi Rimanenti</Label>
                      <Button type="button" size="sm" onClick={aggiungiNotificaIngressi} className="bg-[#1f7a8c] hover:bg-[#053c5e]">
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                    {formData.notifiche_ingressi.map((notifica, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">Notifica #{index + 1}</span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => inviaMailProva('ingressi', notifica)}
                              disabled={!notifica.soglia || !notifica.testo}
                              className="border-[#1f7a8c] text-[#1f7a8c]"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Prova
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => rimuoviNotificaIngressi(index)} className="border-red-300 text-red-600">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Quando rimangono X ingressi</Label>
                            <Input
                              type="number"
                              value={notifica.soglia}
                              onChange={(e) => aggiornaNotificaIngressi(index, 'soglia', e.target.value)}
                              placeholder="Es: 2"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Testo Email</Label>
                            <Textarea
                              value={notifica.testo}
                              onChange={(e) => aggiornaNotificaIngressi(index, 'testo', e.target.value)}
                              rows={3}
                              placeholder="Ciao {nome_utente}, ti rimangono {ingressi_rimanenti} ingressi sul tuo abbonamento {nome_abbonamento}..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.notifiche_ingressi.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">Nessuna notifica configurata</p>
                    )}
                  </div>
                )}

                {/* Notifiche Ore Sale */}
                {formData.ore_sale_incluse && (
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold text-[#053c5e]">Notifiche Ore Sale Rimanenti</Label>
                      <Button type="button" size="sm" onClick={aggiungiNotificaOre} className="bg-[#1f7a8c] hover:bg-[#053c5e]">
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                    {formData.notifiche_ore.map((notifica, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">Notifica #{index + 1}</span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => inviaMailProva('ore', notifica)}
                              disabled={!notifica.soglia || !notifica.testo}
                              className="border-[#1f7a8c] text-[#1f7a8c]"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Prova
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => rimuoviNotificaOre(index)} className="border-red-300 text-red-600">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Quando rimangono X ore credito</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={notifica.soglia}
                              onChange={(e) => aggiornaNotificaOre(index, 'soglia', e.target.value)}
                              placeholder="Es: 3"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Testo Email</Label>
                            <Textarea
                              value={notifica.testo}
                              onChange={(e) => aggiornaNotificaOre(index, 'testo', e.target.value)}
                              rows={3}
                              placeholder="Ciao {nome_utente}, ti rimangono {ore_rimanenti}h credito per le sale sul tuo abbonamento {nome_abbonamento}..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.notifiche_ore.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">Nessuna notifica configurata</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]">Salva</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
