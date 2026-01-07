import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ShoppingCart, Trash2, Download, Search, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function GestioneOrdini() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ordineForm, setOrdineForm] = useState({
    profilo_email: '',
    data_ordine: new Date().toISOString().split('T')[0],
    metodo_pagamento: 'non_pagato',
    note: ''
  });
  const [prodotti, setProdotti] = useState([{
    tipo_abbonamento_id: '',
    quantita: 1,
    prezzo_custom: ''
  }]);
  const [openPopover, setOpenPopover] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const queryClient = useQueryClient();


  const { data: profili = [] } = useQuery({
    queryKey: ['profili_coworker_ordini'],
    queryFn: () => neunoi.entities.ProfiloCoworker.list('-created_date'),
    initialData: []
  });

  const { data: tipiAbbonamento = [] } = useQuery({
    queryKey: ['tipi_abbonamento_ordini'],
    queryFn: () => neunoi.entities.TipoAbbonamento.filter({ attivo: true }),
    initialData: []
  });

  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini_coworking'],
    queryFn: () => neunoi.entities.OrdineCoworking.list('-data_ordine'),
    select: (data) => (data || []).map(o => ({
      ...o,
      prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : (o.prodotti || [])
    })),
    initialData: []
  });

  const eliminaOrdineMutation = useMutation({
    mutationFn: (id) => neunoi.entities.OrdineCoworking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordini_coworking'] });
      queryClient.invalidateQueries({ queryKey: ['admin_tutti_ordini'] });
      toast.success('Ordine eliminato');
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    },
    onError: (err) => toast.error('Errore: ' + err.message)
  });



  const creaOrdineMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.profilo_email) throw new Error("Seleziona un coworker");
      if (!data.prodotti || data.prodotti.length === 0 || !data.prodotti[0].tipo_abbonamento_id) {
        throw new Error("Aggiungi almeno un prodotto all'ordine");
      }

      const profilo = (profili || []).find(p => p.email === data.profilo_email);
      if (!profilo) throw new Error("Profilo coworker non trovato");

      // Prepara prodotti con prezzi
      const prodottiConPrezzo = data.prodotti.map(p => {
        const tipo = tipiAbbonamento.find(t => String(t.id) === String(p.tipo_abbonamento_id));
        if (!tipo) throw new Error("Tipo abbonamento non trovato");

        const prezzoUnitario = tipo.prezzo_libero && p.prezzo_custom ? (parseFloat(p.prezzo_custom) || 0) : (tipo.prezzo || 0);
        return {
          tipo_abbonamento_id: p.tipo_abbonamento_id,
          tipo_abbonamento_nome: tipo.nome,
          quantita: p.quantita,
          prezzo_unitario: prezzoUnitario,
          prezzo_totale: prezzoUnitario * p.quantita
        };
      });

      const totale = prodottiConPrezzo.reduce((sum, p) => sum + p.prezzo_totale, 0);

      // Crea ordine
      const ordine = await neunoi.entities.OrdineCoworking.create({
        user_id: profilo.user_id,
        profilo_coworker_id: profilo.id,
        profilo_nome_completo: `${profilo.first_name} ${profilo.last_name}`,
        profilo_email: profilo.email,
        data_ordine: data.data_ordine,
        prodotti: JSON.stringify(prodottiConPrezzo),
        totale: totale,
        metodo_pagamento: data.metodo_pagamento,
        stato_pagamento: data.metodo_pagamento === 'non_pagato' ? 'non_pagato' : 'pagato',
        note: data.note || ''
      });

      // Crea abbonamenti per ogni prodotto
      for (const prodotto of prodottiConPrezzo) {
        const tipo = tipiAbbonamento.find(t => String(t.id) === String(prodotto.tipo_abbonamento_id));
        if (!tipo) continue;

        for (let i = 0; i < prodotto.quantita; i++) {
          const dataInizio = new Date(data.data_ordine);
          let dataScadenza = new Date(dataInizio);

          if (tipo.durata_mesi) {
            dataScadenza.setMonth(dataScadenza.getMonth() + tipo.durata_mesi);
          } else if (tipo.durata_giorni) {
            dataScadenza.setDate(dataScadenza.getDate() + tipo.durata_giorni);
          }

          await neunoi.entities.AbbonamentoUtente.create({
            user_id: profilo.user_id,
            profilo_coworker_id: profilo.id,
            profilo_nome_completo: `${profilo.first_name} ${profilo.last_name}`,
            tipo_abbonamento_id: prodotto.tipo_abbonamento_id,
            tipo_abbonamento_nome: tipo.nome,
            data_inizio: dataInizio.toISOString().split('T')[0],
            data_scadenza: dataScadenza.toISOString().split('T')[0],
            ingressi_totali: tipo.numero_ingressi || 0,
            ingressi_usati: 0,
            ore_sale_totali: tipo.ore_sale_incluse || 0,
            ore_sale_usate: 0,
            stato: 'attivo'
          });
        }
      }

      return ordine;
    },
    onSuccess: async (ordine) => {
      queryClient.invalidateQueries({ queryKey: ['ordini_coworking'] });
      queryClient.invalidateQueries({ queryKey: ['abbonamenti_tutti'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Ordine creato con successo');

      // Se non pagato, crea task reminder
      if (ordine.metodo_pagamento === 'non_pagato') {
        try {
          const currentUser = await neunoi.auth.me();
          await neunoi.entities.TaskNotifica.create({
            tipo: 'task_manuale',
            titolo: `Pagamento ordine - ${ordine.profilo_nome_completo}`,
            descrizione: `Ordine del ${new Date(ordine.data_ordine || Date.now()).toLocaleDateString('it-IT')} per un totale di €${(ordine.totale || 0).toFixed(2)}. Prodotti: ${Array.isArray(ordine.prodotti) ? ordine.prodotti.map(p => `${p.tipo_abbonamento_nome} x${p.quantita}`).join(', ') : ''}`,
            creato_da_id: currentUser.id,
            creato_da_nome: currentUser.full_name,
            destinatario_tipo: 'host',
            data_inizio: new Date().toISOString().split('T')[0],
            priorita: 'alta',
            stato: 'attivo'
          });
          queryClient.invalidateQueries({ queryKey: ['task_notifiche'] });
        } catch (error) {
          console.error('Errore creazione task:', error);
        }
      }

      // Genera sempre la ricevuta
      setTimeout(() => {
        generaRicevutaPDF(ordine);
      }, 500);
    },
    onError: (error) => {
      toast.error(error.message || 'Errore durante la creazione dell\'ordine');
    }
  });

  const generaRicevutaPDF = (ordine) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('neu [nòi]', 20, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('spazio al lavoro APS', 20, 27);
    doc.text('via Alloro 64, 90133 Palermo', 20, 32);

    // Titolo ricevuta
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RICEVUTA ORDINE', 20, 50);

    // Info ordine
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date(ordine.data_ordine).toLocaleDateString('it-IT')}`, 20, 60);
    doc.text(`Cliente: ${ordine.profilo_nome_completo}`, 20, 67);
    doc.text(`Email: ${ordine.profilo_email}`, 20, 74);

    // Tabella prodotti
    let y = 90;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prodotto', 20, y);
    doc.text('Qtà', 110, y);
    doc.text('Prezzo', 135, y);
    doc.text('Totale', 170, y);

    y += 7;
    doc.line(20, y, 190, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (Array.isArray(ordine.prodotti)) {
      ordine.prodotti.forEach(prod => {
        doc.text(prod?.tipo_abbonamento_nome || 'Prodotto', 20, y, { maxWidth: 85 });
        doc.text((prod?.quantita || 0).toString(), 110, y);
        doc.text(`€${(prod?.prezzo_unitario || 0).toFixed(2)}`, 135, y);
        doc.text(`€${(prod?.prezzo_totale || 0).toFixed(2)}`, 170, y);
        y += 7;
      });
    }

    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    // Totale
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALE:', 135, y);
    doc.text(`€${ordine.totale.toFixed(2)}`, 170, y);

    // Metodo pagamento
    y += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Metodo di Pagamento: ${getMetodoPagamentoLabel(ordine.metodo_pagamento)}`, 20, y);

    // Note
    if (ordine.note) {
      y += 10;
      doc.text('Note:', 20, y);
      y += 7;
      doc.setFontSize(9);
      const splitNote = doc.splitTextToSize(ordine.note, 170);
      doc.text(splitNote, 20, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('neu [nòi] spazio al lavoro APS - via Alloro 64, 90133 Palermo', 105, 280, { align: 'center' });

    // Salva PDF
    try {
      const fileName = `Ricevuta_${ordine.profilo_nome_completo.replace(/ /g, '_')}_${ordine.data_ordine}.pdf`;
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Ricevuta PDF generata');
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      toast.error('Errore durante il download della ricevuta');
    }
  };

  const resetForm = () => {
    setOrdineForm({
      profilo_email: '',
      data_ordine: new Date().toISOString().split('T')[0],
      metodo_pagamento: 'non_pagato',
      note: ''
    });
    setProdotti([{
      tipo_abbonamento_id: '',
      quantita: 1,
      prezzo_custom: ''
    }]);
    setOpenPopover(false);
  };

  const aggiungiProdotto = () => {
    setProdotti([...prodotti, {
      tipo_abbonamento_id: '',
      quantita: 1,
      prezzo_custom: ''
    }]);
  };

  const rimuoviProdotto = (index) => {
    setProdotti(prodotti.filter((_, i) => i !== index));
  };

  const aggiornaProdotto = (index, field, value) => {
    const nuoviProdotti = [...prodotti];
    nuoviProdotti[index][field] = value;
    setProdotti(nuoviProdotti);
  };

  const getMetodoPagamentoLabel = (metodo) => {
    const labels = {
      non_pagato: 'Non Pagato',
      contanti: 'Contanti',
      carta: 'Carta di Credito/Bancomat',
      bonifico: 'Bonifico',
      neu: 'NEU'
    };
    return labels[metodo] || metodo;
  };

  const getMetodoPagamentoColor = (metodo) => {
    const colors = {
      non_pagato: 'bg-orange-100 text-orange-800',
      contanti: 'bg-blue-100 text-blue-800',
      carta: 'bg-purple-100 text-purple-800',
      bonifico: 'bg-green-100 text-green-800',
      neu: 'bg-[#1f7a8c] text-white'
    };
    return colors[metodo] || 'bg-slate-100 text-slate-800';
  };

  const calcolaTotale = () => {
    return prodotti.reduce((sum, p) => {
      const tipo = tipiAbbonamento.find(t => String(t.id) === String(p.tipo_abbonamento_id));
      if (!tipo) return sum;
      const prezzo = tipo.prezzo_libero && p.prezzo_custom ? (parseFloat(p.prezzo_custom) || 0) : (tipo.prezzo || 0);
      return sum + (prezzo * p.quantita);
    }, 0);
  };

  const ordiniFiltrati = ordini.filter(o => {
    if (!o) return false;
    const searchLow = (searchTerm || '').toLowerCase();
    const matchesSearch = !searchTerm ||
      o.profilo_nome_completo?.toLowerCase().includes(searchLow) ||
      (Array.isArray(o.prodotti) && o.prodotti.some(p => p?.tipo_abbonamento_nome?.toLowerCase().includes(searchLow)));
    return matchesSearch;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Ordini e Ricevute ({ordini?.length || 0})</CardTitle>
            <Button onClick={() => setDialogOpen(true)} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Ordine
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca per coworker o prodotto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ordiniFiltrati.map(ordine => (
              <div key={ordine.id} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-[#053c5e]">{ordine.profilo_nome_completo}</span>
                      <Badge className={getMetodoPagamentoColor(ordine.metodo_pagamento)}>
                        {getMetodoPagamentoLabel(ordine.metodo_pagamento)}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(ordine.data_ordine).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                      <span className="ml-2 py-0.5 px-1.5 bg-slate-100 rounded text-[10px] font-mono text-slate-400">#{ordine.id}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#053c5e]">
                      €{(ordine.totale || 0).toFixed(2)}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generaRicevutaPDF(ordine)}
                        className="border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Scarica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setOrderToDelete(ordine);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded space-y-1">
                  {Array.isArray(ordine.prodotti) && ordine.prodotti.map((prod, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{prod?.tipo_abbonamento_nome || 'Prodotto'} x{prod?.quantita || 0}</span>
                      <span className="font-semibold">€{(prod?.prezzo_totale || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {ordine.note && (
                  <p className="text-sm text-slate-600 mt-2 italic">{ordine.note}</p>
                )}
              </div>
            ))}

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei sicuro di voler eliminare questo ordine?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione eliminerà definitivamente l'ordine #{orderToDelete?.id} di {orderToDelete?.profilo_nome_completo}.
                    L'operazione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => eliminaOrdineMutation.mutate(orderToDelete.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {ordiniFiltrati.length === 0 && (
              <p className="text-center text-slate-500 py-8">Nessun ordine registrato</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo Ordine</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            creaOrdineMutation.mutate({ ...ordineForm, prodotti });
          }} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Coworker *</Label>
              <Popover open={openPopover} onOpenChange={setOpenPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopover}
                    className="w-full justify-between"
                  >
                    {ordineForm.profilo_email
                      ? (() => {
                        const p = (profili || []).find(p => p.email === ordineForm.profilo_email);
                        return p ? `${p.first_name} ${p.last_name}` : "Seleziona coworker...";
                      })()
                      : "Seleziona coworker..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cerca coworker..." />
                    <CommandList>
                      <CommandEmpty>Nessun coworker trovato.</CommandEmpty>
                      <CommandGroup>
                        {(profili || []).map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.first_name || ''} ${p.last_name || ''} ${p.email || ''}`}
                            onSelect={() => {
                              setOrdineForm({ ...ordineForm, profilo_email: p.email });
                              setOpenPopover(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                ordineForm.profilo_email === p.email ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.first_name} {p.last_name}
                            {p.email && <span className="ml-2 text-xs text-muted-foreground">• {p.email}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data Ordine *</Label>
              <Input
                type="date"
                value={ordineForm.data_ordine}
                onChange={(e) => setOrdineForm({ ...ordineForm, data_ordine: e.target.value })}
                required
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg">Prodotti</Label>
                <Button type="button" size="sm" onClick={aggiungiProdotto} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi Prodotto
                </Button>
              </div>

              <div className="space-y-3">
                {prodotti.map((prodotto, index) => {
                  const tipoSelezionato = (tipiAbbonamento || []).find(t => String(t.id) === String(prodotto.tipo_abbonamento_id));
                  return (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-3">
                          <Select
                            value={String(prodotto.tipo_abbonamento_id)}
                            onValueChange={(value) => aggiornaProdotto(index, 'tipo_abbonamento_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona prodotto" />
                            </SelectTrigger>
                            <SelectContent>
                              {(tipiAbbonamento || []).map(t => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {t.nome} - {t.prezzo_libero ? 'Prezzo Libero' : `€${t.prezzo}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Quantità</Label>
                              <Input
                                type="number"
                                min="1"
                                value={prodotto.quantita}
                                onChange={(e) => aggiornaProdotto(index, 'quantita', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            {tipoSelezionato?.prezzo_libero && (
                              <div>
                                <Label className="text-xs">Prezzo Personalizzato (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Inserisci prezzo"
                                  value={prodotto.prezzo_custom}
                                  onChange={(e) => aggiornaProdotto(index, 'prezzo_custom', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {prodotti.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => rimuoviProdotto(index)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Metodo di Pagamento *</Label>
              <Select
                value={ordineForm.metodo_pagamento}
                onValueChange={(value) => setOrdineForm({ ...ordineForm, metodo_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_pagato">Non Pagato</SelectItem>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="carta">Carta di Credito/Bancomat</SelectItem>
                  <SelectItem value="bonifico">Bonifico</SelectItem>
                  <SelectItem value="neu">NEU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note (opzionale)</Label>
              <Textarea
                value={ordineForm.note}
                onChange={(e) => setOrdineForm({ ...ordineForm, note: e.target.value })}
                placeholder="Note aggiuntive sull'ordine..."
                rows={2}
              />
            </div>

            <div className="bg-[#053c5e] text-white p-4 rounded-lg">
              <div className="flex items-center justify-between text-xl font-bold">
                <span>TOTALE:</span>
                <span>€{calcolaTotale().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                disabled={creaOrdineMutation.isPending}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Crea Ordine
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
