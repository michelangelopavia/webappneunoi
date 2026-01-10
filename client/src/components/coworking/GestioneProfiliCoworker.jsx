import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, UserPlus, Users, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function GestioneProfiliCoworker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [invitoProfiloId, setInvitoProfiloId] = useState(null);
  const queryClient = useQueryClient();

  const { data: profili = [] } = useQuery({
    queryKey: ['profili'],
    queryFn: () => neunoi.entities.ProfiloCoworker.list('-created_date'),
    initialData: []
  });

  const invitaMutation = useMutation({
    mutationFn: async (profilo) => {
      // Invia email di invito
      await neunoi.integrations.Core.SendEmail({
        to: profilo.email,
        subject: 'Invito a iscriversi a neu [nòi]',
        body: `Ciao ${profilo.first_name},

Sei stato/a invitato/a ad accedere alla piattaforma di gestione di neu [nòi].

Per completare la registrazione, clicca sul link qui sotto:
${window.location.origin}

Dopo la registrazione, il tuo account sarà collegato automaticamente al tuo profilo esistente.

neu [nòi] spazio al lavoro APS
via Alloro 64, 90133 Palermo`,
        from_name: 'neu [nòi]'
      });

      // Aggiorna stato profilo
      await neunoi.entities.ProfiloCoworker.update(profilo.id, {
        stato: 'invitato',
        data_invito: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profili'] });
      setInvitoProfiloId(null);
      toast.success('Invito inviato con successo');
    },
    onError: () => {
      toast.error('Errore nell\'invio dell\'invito');
    }
  });

  const getStatoColor = (stato) => {
    const colors = {
      check_in_completato: 'bg-blue-100 text-blue-800',
      invitato: 'bg-orange-100 text-orange-800',
      iscritto: 'bg-green-100 text-green-800'
    };
    return colors[stato] || 'bg-slate-100 text-slate-800';
  };

  const getStatoLabel = (stato) => {
    const labels = {
      check_in_completato: 'Check-in completato',
      invitato: 'Invitato',
      iscritto: 'Iscritto'
    };
    return labels[stato] || stato;
  };

  const profiliFiltrati = profili.filter(p =>
    (p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleExportCSV = () => {
    if (profili.length === 0) {
      toast.info('Nessun profilo da esportare');
      return;
    }

    const headers = [
      'Nome', 'Cognome', 'Email', 'Telefono', 'Genere', 'Data Nascita',
      'Citta Residenza', 'Paese Residenza', 'Ragione Sociale', 'P.IVA',
      'Codice Univoco', 'Newsletter', 'Privacy Accettata', 'Data Accettazione Privacy',
      'Data Compilazione', 'Stato'
    ];

    const rows = profili.map(p => [
      p.first_name || '',
      p.last_name || '',
      p.email || '',
      p.telefono || '',
      p.genere || '',
      p.data_nascita || '',
      p.citta_residenza || '',
      p.paese_residenza || '',
      p.ragione_sociale || '',
      p.p_iva || '',
      p.codice_univoco || '',
      p.newsletter ? 'SI' : 'NO',
      p.privacy_accettata ? 'SI' : 'NO',
      p.data_accettazione_privacy ? new Date(p.data_accettazione_privacy).toLocaleDateString() : '',
      p.data_compilazione ? new Date(p.data_compilazione).toLocaleDateString() : '',
      p.stato || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Esportazione_Profili_Coworker_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Esportazione completata');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1f7a8c]" />
                Profili Coworker ({profili.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-[#053c5e] text-[#053c5e] hover:bg-[#053c5e] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Esporta CSV
              </Button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca profilo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {profiliFiltrati.map(profilo => (
                <div key={profilo.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[#053c5e]">
                          {profilo.first_name} {profilo.last_name}
                        </span>
                        <Badge className={getStatoColor(profilo.stato)}>
                          {getStatoLabel(profilo.stato)}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {profilo.email}
                        </div>
                        {profilo.telefono && (
                          <div>Tel: {profilo.telefono}</div>
                        )}
                        {profilo.data_nascita && (
                          <div>Nato/a il: {new Date(profilo.data_nascita).toLocaleDateString('it-IT')}</div>
                        )}
                        {profilo.citta_residenza && (
                          <div>Residenza: {profilo.citta_residenza}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {profilo.stato === 'check_in_completato' && (
                        <Button
                          size="sm"
                          onClick={() => setInvitoProfiloId(profilo.id)}
                          className="bg-[#1f7a8c] hover:bg-[#053c5e]"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invia Invito
                        </Button>
                      )}
                      {profilo.stato === 'invitato' && profilo.data_invito && (
                        <div className="text-xs text-slate-500 text-right mr-2">
                          Invitato il<br />
                          {new Date(profilo.data_invito).toLocaleDateString('it-IT')}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          if (confirm('Sei sicuro di voler eliminare questo profilo?')) {
                            await neunoi.entities.ProfiloCoworker.delete(profilo.id);
                            queryClient.invalidateQueries({ queryKey: ['profili'] });
                            toast.success('Profilo eliminato');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {profiliFiltrati.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  {searchTerm ? 'Nessun profilo trovato' : 'Nessun profilo presente'}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!invitoProfiloId} onOpenChange={() => setInvitoProfiloId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invia Invito Registrazione</AlertDialogTitle>
            <AlertDialogDescription>
              {invitoProfiloId && (() => {
                const profilo = profili.find(p => p.id === invitoProfiloId);
                return profilo ? (
                  <>
                    Vuoi inviare un invito a <strong>{profilo.first_name} {profilo.last_name}</strong> ({profilo.email}) per iscriversi alla piattaforma?
                    <br /><br />
                    Riceverà un'email con le istruzioni per completare la registrazione.
                  </>
                ) : null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#1f7a8c] hover:bg-[#053c5e]"
              onClick={() => {
                const profilo = profili.find(p => p.id === invitoProfiloId);
                if (profilo) invitaMutation.mutate(profilo);
              }}
            >
              Invia Invito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
