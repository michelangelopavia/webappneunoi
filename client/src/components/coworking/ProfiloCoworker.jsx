import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfiloCoworker({ user }) {
  const [editing, setEditing] = useState(false);
  const [datiFatturazione, setDatiFatturazione] = useState(null);
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    indirizzo_via: '',
    indirizzo_citta: '',
    indirizzo_provincia: '',
    indirizzo_cap: '',
    codice_fiscale: '',
    partita_iva: '',
    pec: '',
    codice_univoco: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    loadDatiFatturazione();
  }, [user]);

  const loadDatiFatturazione = async () => {
    if (!user) return;
    const dati = await neunoi.entities.DatiFatturazione.filter({ utente_id: user.id });
    if (dati[0]) {
      setDatiFatturazione(dati[0]);
      setFormData(dati[0]);
    }
  };

  const salvaMutation = useMutation({
    mutationFn: async (data) => {
      if (datiFatturazione) {
        await neunoi.entities.DatiFatturazione.update(datiFatturazione.id, data);
      } else {
        await neunoi.entities.DatiFatturazione.create({
          ...data,
          utente_id: user.id
        });
      }
    },
    onSuccess: () => {
      loadDatiFatturazione();
      setEditing(false);
      toast.success('Dati salvati con successo');
    },
    onError: () => {
      toast.error('Errore nel salvataggio');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    salvaMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#1f7a8c]" />
            Dati di Fatturazione
          </CardTitle>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!editing && !datiFatturazione ? (
          <div className="text-center py-8">
            <p className="text-[#1f7a8c] mb-4">Nessun dato di fatturazione inserito</p>
            <Button onClick={() => setEditing(true)} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
              Inserisci Dati
            </Button>
          </div>
        ) : !editing ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-[#053c5e]">Ragione Sociale / Nome</div>
              <div>{datiFatturazione.ragione_sociale}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#053c5e]">Indirizzo</div>
              <div>
                {datiFatturazione.indirizzo_via}<br />
                {datiFatturazione.indirizzo_cap} {datiFatturazione.indirizzo_citta} ({datiFatturazione.indirizzo_provincia})
              </div>
            </div>
            {datiFatturazione.codice_fiscale && (
              <div>
                <div className="text-sm font-semibold text-[#053c5e]">Codice Fiscale</div>
                <div>{datiFatturazione.codice_fiscale}</div>
              </div>
            )}
            {datiFatturazione.partita_iva && (
              <div>
                <div className="text-sm font-semibold text-[#053c5e]">Partita IVA</div>
                <div>{datiFatturazione.partita_iva}</div>
              </div>
            )}
            {datiFatturazione.pec && (
              <div>
                <div className="text-sm font-semibold text-[#053c5e]">PEC</div>
                <div>{datiFatturazione.pec}</div>
              </div>
            )}
            {datiFatturazione.codice_univoco && (
              <div>
                <div className="text-sm font-semibold text-[#053c5e]">Codice Univoco</div>
                <div>{datiFatturazione.codice_univoco}</div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Ragione Sociale / Nome e Cognome *</Label>
              <Input
                value={formData.ragione_sociale}
                onChange={(e) => setFormData({...formData, ragione_sociale: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Via/Piazza e Civico *</Label>
              <Input
                value={formData.indirizzo_via}
                onChange={(e) => setFormData({...formData, indirizzo_via: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Città *</Label>
                <Input
                  value={formData.indirizzo_citta}
                  onChange={(e) => setFormData({...formData, indirizzo_citta: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Provincia</Label>
                <Input
                  value={formData.indirizzo_provincia}
                  onChange={(e) => setFormData({...formData, indirizzo_provincia: e.target.value})}
                  maxLength={2}
                  placeholder="PA"
                />
              </div>
            </div>
            <div>
              <Label>CAP *</Label>
              <Input
                value={formData.indirizzo_cap}
                onChange={(e) => setFormData({...formData, indirizzo_cap: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Codice Fiscale</Label>
              <Input
                value={formData.codice_fiscale}
                onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value})}
              />
            </div>
            <div>
              <Label>Partita IVA</Label>
              <Input
                value={formData.partita_iva}
                onChange={(e) => setFormData({...formData, partita_iva: e.target.value})}
              />
            </div>
            <div>
              <Label>PEC</Label>
              <Input
                type="email"
                value={formData.pec}
                onChange={(e) => setFormData({...formData, pec: e.target.value})}
              />
            </div>
            <div>
              <Label>Codice Univoco SDI</Label>
              <Input
                value={formData.codice_univoco}
                onChange={(e) => setFormData({...formData, codice_univoco: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Annulla
              </Button>
              <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c]">
                <Save className="w-4 h-4 mr-2" />
                Salva
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
