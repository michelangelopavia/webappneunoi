import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Calendar, TrendingUp, CheckCircle, Coins, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Volontariato() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [legacyDialogOpen, setLegacyDialogOpen] = useState(false);

  const getAssociativeYears = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentStartYear = month >= 9 ? year : year - 1;
    const currentYearStr = `${currentStartYear}/${(currentStartYear + 1).toString().slice(-2)}`;
    const prevStartYear = currentStartYear - 1;
    const previousYearStr = `${prevStartYear}/${(prevStartYear + 1).toString().slice(-2)}`;
    return { currentYearStr, previousYearStr };
  };

  const { currentYearStr, previousYearStr } = getAssociativeYears();

  // Form Data per Azioni NEU
  const [formData, setFormData] = useState({
    azione_id: '',
    note: '',
    anno_associativo: currentYearStr
  });

  // Form Data per Ore (Legacy)
  const [legacyFormData, setLegacyFormData] = useState({
    ambito_id: '',
    ore: '',
    note: '',
    anno_associativo: currentYearStr
  });

  const queryClient = useQueryClient();

  const { data: azioni = [] } = useQuery({
    queryKey: ['azioni_volontariato'],
    queryFn: () => neunoi.entities.AzioneVolontariato.filter({ attivo: true }),
    initialData: []
  });

  const { data: ambiti = [] } = useQuery({
    queryKey: ['ambiti_volontariato'],
    queryFn: () => neunoi.entities.AmbitoVolontariato.filter({ attivo: true }),
    initialData: []
  });

  const { data: dichiarazioni = [] } = useQuery({
    queryKey: ['dichiarazioni_volontariato'],
    queryFn: () => neunoi.entities.DichiarazioneVolontariato.filter({}, '-data_dichiarazione'),
    initialData: []
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await neunoi.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Errore:', error);
    }
  };

  const createDichiarazioneMutation = useMutation({
    mutationFn: async (data) => {
      await neunoi.entities.DichiarazioneVolontariato.create({
        user_id: user.id,
        azione_id: data.azione_id,
        note: data.note,
        anno_associativo: data.anno_associativo,
        data_dichiarazione: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dichiarazioni_volontariato'] });
      queryClient.invalidateQueries({ queryKey: ['transazioni'] });
      queryClient.invalidateQueries({ queryKey: ['auth_user'] });
      queryClient.invalidateQueries({ queryKey: ['user_me'] });
      setDialogOpen(false);
      setFormData({
        azione_id: '',
        note: '',
        anno_associativo: currentYearStr
      });
      toast.success('Azione dichiarata e NEU accreditati!');
    },
    onError: (error) => {
      toast.error(error.message || 'Errore nella registrazione');
    }
  });

  const createLegacyDichiarazioneMutation = useMutation({
    mutationFn: async (data) => {
      await neunoi.entities.DichiarazioneVolontariato.create({
        user_id: user.id,
        ambito_id: data.ambito_id,
        ore: parseFloat(data.ore),
        note: data.note,
        anno_associativo: data.anno_associativo,
        data_dichiarazione: new Date().toISOString(),
        neu_guadagnati: 0 // No NEU automatically
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dichiarazioni_volontariato'] });
      queryClient.invalidateQueries({ queryKey: ['user_me'] });
      setLegacyDialogOpen(false);
      setLegacyFormData({
        ambito_id: '',
        ore: '',
        note: '',
        anno_associativo: currentYearStr
      });
      toast.success('Ore di volontariato registrate!');
    },
    onError: (error) => {
      toast.error(error.message || 'Errore nella registrazione');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createDichiarazioneMutation.mutate(formData);
  };

  const handleLegacySubmit = (e) => {
    e.preventDefault();
    createLegacyDichiarazioneMutation.mutate(legacyFormData);
  };

  const getAssociativeYearRange = (refDate = new Date()) => {
    const date = new Date(refDate);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed, 9 = October
    let startYear = (month >= 9) ? year : year - 1;
    const startDate = new Date(startYear, 9, 1, 0, 0, 0);
    const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59);
    return { startDate, endDate };
  };

  const { startDate, endDate } = getAssociativeYearRange();

  const dichiarazioniUtente = dichiarazioni.filter(d => d.user_id === user?.id);

  // Filter for CURRENT associative year
  const dichiarazioniAnnoCorrente = dichiarazioniUtente.filter(d => {
    const dDate = new Date(d.data_dichiarazione || d.createdAt);
    return dDate >= startDate && dDate <= endDate;
  }).sort((a, b) => b.id - a.id);

  const totaleNeu = dichiarazioniAnnoCorrente.reduce((sum, d) => sum + (d.neu_guadagnati || 0), 0);
  const totaleOre = dichiarazioniAnnoCorrente.reduce((sum, d) => sum + (d.ore || 0), 0);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Storico Volontariato - Archivio Anni Precedenti', 14, 22);
    doc.setFontSize(11);
    doc.text(`Socio: ${user?.full_name}`, 14, 30);
    doc.text(`Data Esportazione: ${new Date().toLocaleDateString()}`, 14, 35);

    // Filter for PREVIOUS years (anything that is not currentYearStr)
    const dichiarazioniPassate = dichiarazioniUtente.filter(d => {
      return d.anno_associativo && d.anno_associativo !== currentYearStr;
    });

    if (dichiarazioniPassate.length === 0) {
      toast.info("Non ci sono dati storici da scaricare.");
      return;
    }

    const tableRows = dichiarazioniPassate.map(d => [
      new Date(d.data_dichiarazione || d.createdAt).toLocaleDateString('it-IT'),
      d.azione_id ? getActionTitle(d.azione_id) : getAmbitoName(d.ambito_id),
      d.ore ? `${d.ore}h` : '-',
      d.neu_guadagnati ? `${d.neu_guadagnati} NEU` : '-',
      d.note || '-'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Attività / Ambito', 'Ore', 'NEU', 'Note']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: '#053c5e' }
    });

    doc.save(`Volontariato_Storico_${user?.full_name.replace(/\s+/g, '_')}.pdf`);
  };

  const getActionTitle = (id) => {
    const action = azioni.find(a => a.id === id);
    return action ? action.titolo : 'Azione #' + id;
  };

  const getAmbitoName = (id) => {
    const ambito = ambiti.find(a => a.id === id);
    return ambito ? ambito.nome : 'Ambito #' + id;
  };

  const activeAction = azioni.find(a => a.id.toString() === formData.azione_id.toString());

  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Volontariato</h1>
            <p className="text-lg opacity-90 mt-2">Gestisci il tuo contributo alla community</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button
              onClick={() => setLegacyDialogOpen(true)}
              variant="outline"
              className="text-[#053c5e] hover:bg-slate-100 w-full sm:w-auto"
            >
              <Clock className="w-4 h-4 mr-2" />
              Registra Ore (Classico)
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-[#1f7a8c] hover:bg-[#db222a] text-white w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Dichiara azione (Con NEU)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#053c5e] text-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-6 h-6" />
            <h2 className="text-lg font-bold">Ore di volontariato</h2>
          </div>
          <div className="text-5xl font-bold">{Math.round(totaleOre * 10) / 10}</div>
          <p className="text-sm opacity-90 mt-2">ottobre {startDate.getFullYear()} - settembre {endDate.getFullYear()}</p>
        </div>

        <div className="bg-[#db222a] text-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-6 h-6" />
            <h2 className="text-lg font-bold">NEU Guadagnati</h2>
          </div>
          <div className="text-5xl font-bold">{Math.round(totaleNeu * 100) / 100}</div>
          <p className="text-sm opacity-90 mt-2">totale rimborsi ottenuti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#053c5e]">Dichiarazioni anno associativo in corso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dichiarazioniAnnoCorrente.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessuna dichiarazione nell'anno associativo in corso.</p>
              ) : (
                dichiarazioniAnnoCorrente.map((dich) => (
                  <div key={dich.id} className="p-4 bg-slate-50 border-l-4 border-[#053c5e] flex justify-between items-center">
                    <div>
                      {dich.azione_id ? (
                        <>
                          <p className="font-bold text-[#053c5e]">{getActionTitle(dich.azione_id)}</p>
                          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">Azione NEU</span>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-[#053c5e]">{getAmbitoName(dich.ambito_id)}</p>
                          <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded ml-2">Ore: {dich.ore}h</span>
                        </>
                      )}

                      {dich.note && <p className="text-sm text-slate-600 mt-1">{dich.note}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Anno Associativo: <span className="font-bold text-[#053c5e]">{dich.anno_associativo || 'DA DEFINIRE'}</span> • Registrato il: {new Date(dich.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    {dich.neu_guadagnati > 0 && (
                      <div className="text-xl font-bold text-[#db222a]">
                        +{dich.neu_guadagnati} NEU
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historico PDF Download Section */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleDownloadPDF}
            variant="ghost"
            className="text-[#053c5e] hover:bg-slate-100 flex items-center gap-2 border border-[#053c5e]"
          >
            <FileText className="w-4 h-4" />
            Scarica PDF degli anni precedenti
          </Button>
        </div>
      </div>

      {/* Dialog Azione NEU */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Dichiara azione con rimborso NEU</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Azione Svolta</Label>
              <Select
                value={formData.azione_id}
                onValueChange={(value) => setFormData({ ...formData, azione_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un'azione..." />
                </SelectTrigger>
                <SelectContent>
                  {azioni.map(azione => (
                    <SelectItem key={azione.id} value={azione.id.toString()}>
                      {azione.titolo} (+{azione.valore_neu} NEU)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeAction && activeAction.descrizione && (
                <p className="text-sm text-slate-600 mt-2 italic bg-slate-100 p-2 rounded">
                  "{activeAction.descrizione}"
                </p>
              )}
            </div>
            <div>
              <Label>Note (Opzionale)</Label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Dettagli aggiuntivi..."
                rows={3}
              />
            </div>
            <div>
              <Label>Anno Associativo di Svolgimento</Label>
              <Select
                value={formData.anno_associativo}
                onValueChange={(value) => setFormData({ ...formData, anno_associativo: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona anno..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentYearStr}>Anno Corrente ({currentYearStr})</SelectItem>
                  <SelectItem value={previousYearStr}>Anno Precedente ({previousYearStr})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                disabled={createDichiarazioneMutation.isPending}
              >
                {createDichiarazioneMutation.isPending ? 'Invio...' : 'Conferma e Ricevi NEU'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Legacy (Ore) */}
      <Dialog open={legacyDialogOpen} onOpenChange={setLegacyDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registra Ore di Volontariato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLegacySubmit} className="space-y-4">
            <div>
              <Label>Ambito</Label>
              <Select
                value={legacyFormData.ambito_id}
                onValueChange={(value) => setLegacyFormData({ ...legacyFormData, ambito_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ambito..." />
                </SelectTrigger>
                <SelectContent>
                  {ambiti.map(ambito => (
                    <SelectItem key={ambito.id} value={ambito.id.toString()}>
                      {ambito.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ore Svolte</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={legacyFormData.ore}
                onChange={(e) => setLegacyFormData({ ...legacyFormData, ore: e.target.value })}
                placeholder="Es: 2.5"
                required
              />
            </div>
            <div>
              <Label>Note / Attività Svolta</Label>
              <Textarea
                value={legacyFormData.note}
                onChange={(e) => setLegacyFormData({ ...legacyFormData, note: e.target.value })}
                placeholder="Descrivi cosa hai fatto..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label>Anno Associativo di Svolgimento</Label>
              <Select
                value={legacyFormData.anno_associativo}
                onValueChange={(value) => setLegacyFormData({ ...legacyFormData, anno_associativo: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona anno..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentYearStr}>Anno Corrente ({currentYearStr})</SelectItem>
                  <SelectItem value={previousYearStr}>Anno Precedente ({previousYearStr})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setLegacyDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                type="submit"
                className="bg-[#053c5e] hover:bg-[#1f7a8c]"
                disabled={createLegacyDichiarazioneMutation.isPending}
              >
                {createLegacyDichiarazioneMutation.isPending ? 'Invio...' : 'Registra Ore'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
