import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Edit, Save, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function ProfiloCoworker({ user }) {
  const [editing, setEditing] = useState(false);
  const [datiFatturazione, setDatiFatturazione] = useState(null);
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    paese: 'Italia',
    codice_fiscale: '',
    partita_iva: '',
    pec: '',
    codice_univoco: '',
    is_estero: false
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    loadDatiFatturazione();
  }, [user]);

  const loadDatiFatturazione = async () => {
    if (!user) return;
    const dati = await neunoi.entities.DatiFatturazione.filter({ user_id: user.id });
    if (dati[0]) {
      setDatiFatturazione(dati[0]);
      setFormData({
        ...dati[0],
        paese: dati[0].paese || 'Italia',
        is_estero: !!dati[0].is_estero
      });
    }
  };

  const salvaMutation = useMutation({
    mutationFn: async (data) => {
      // Clean data: remove fields that shouldn't be sent or updated directly
      const { id, createdAt, updatedAt, user_id, ...cleanData } = data;

      // Ensure country is set to Italy if not foreign
      if (!cleanData.is_estero) {
        cleanData.paese = 'Italia';
      }

      if (datiFatturazione) {
        await neunoi.entities.DatiFatturazione.update(datiFatturazione.id, cleanData);
      } else {
        await neunoi.entities.DatiFatturazione.create({
          ...cleanData,
          user_id: user.id
        });
      }
    },
    onSuccess: () => {
      loadDatiFatturazione();
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['dati_fatturazione'] });
      toast.success('Dati di fatturazione salvati');
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
    <Card className="border-t-4 border-t-[#1f7a8c]">
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
              className="border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              {datiFatturazione ? 'Modifica' : 'Inserisci'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!editing && !datiFatturazione ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <p className="text-[#1f7a8c] font-medium mb-4 italic">Profilo di fatturazione non ancora configurato</p>
            <Button onClick={() => setEditing(true)} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
              Configura Ora
            </Button>
          </div>
        ) : !editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label className="text-[#053c5e] opacity-70">Ragione Sociale / Nome</Label>
                <div className="font-semibold text-lg">{datiFatturazione.ragione_sociale}</div>
              </div>
              <div>
                <Label className="text-[#053c5e] opacity-70">Sede Legale</Label>
                <div>
                  {datiFatturazione.indirizzo}<br />
                  {datiFatturazione.cap} {datiFatturazione.citta} {datiFatturazione.provincia && `(${datiFatturazione.provincia})`}
                  <div className="flex items-center gap-1 mt-1 font-medium text-slate-600">
                    <Globe className="w-3 h-3" />
                    {datiFatturazione.paese}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {datiFatturazione.partita_iva && (
                <div>
                  <Label className="text-[#053c5e] opacity-70">P. IVA / VAT</Label>
                  <div className="font-mono">{datiFatturazione.partita_iva}</div>
                </div>
              )}
              {datiFatturazione.codice_fiscale && (
                <div>
                  <Label className="text-[#053c5e] opacity-70">Codice Fiscale</Label>
                  <div className="font-mono">{datiFatturazione.codice_fiscale}</div>
                </div>
              )}
              {!datiFatturazione.is_estero && (
                <div className="grid grid-cols-2 gap-4">
                  {datiFatturazione.pec && (
                    <div>
                      <Label className="text-[#053c5e] opacity-70">PEC</Label>
                      <div className="text-sm">{datiFatturazione.pec}</div>
                    </div>
                  )}
                  {datiFatturazione.codice_univoco && (
                    <div>
                      <Label className="text-[#053c5e] opacity-70">SDI</Label>
                      <div className="font-mono">{datiFatturazione.codice_univoco}</div>
                    </div>
                  )}
                </div>
              )}
              {datiFatturazione.is_estero && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Azienda Estera
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2 mb-4 p-3 bg-slate-50 rounded">
              <Checkbox
                id="is_estero"
                checked={formData.is_estero}
                onCheckedChange={(checked) => setFormData({ ...formData, is_estero: !!checked, paese: checked ? '' : 'Italia' })}
              />
              <Label htmlFor="is_estero" className="text-sm font-medium leading-none cursor-pointer">
                Questa è un'azienda estera (extra-Italia)
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Ragione Sociale / Nome e Cognome *</Label>
                <Input
                  value={formData.ragione_sociale}
                  onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                  placeholder="E.g. Rossi srl o Mario Rossi"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label>Indirizzo (Via e Civico) *</Label>
                <Input
                  value={formData.indirizzo}
                  onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Città *</Label>
                <Input
                  value={formData.citta}
                  onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>CAP *</Label>
                  <Input
                    value={formData.cap}
                    onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{formData.is_estero ? 'Stato/Prov' : 'Prov'}</Label>
                  <Input
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    maxLength={formData.is_estero ? 50 : 2}
                    placeholder={formData.is_estero ? '' : 'PA'}
                  />
                </div>
              </div>

              <div>
                <Label>Paese *</Label>
                {formData.is_estero ? (
                  <Input
                    value={formData.paese}
                    onChange={e => setFormData({ ...formData, paese: e.target.value })}
                    placeholder="E.g. France, Germany, USA"
                    required
                  />
                ) : (
                  <Input value="Italia" disabled className="bg-slate-50" />
                )}
              </div>

              <div>
                <Label>{formData.is_estero ? 'VAT Number / Tax ID' : 'Partita IVA'}</Label>
                <Input
                  value={formData.partita_iva}
                  onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                />
              </div>

              {!formData.is_estero && (
                <>
                  <div>
                    <Label>Codice Fiscale</Label>
                    <Input
                      value={formData.codice_fiscale}
                      onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>PEC (E-mail)</Label>
                      <Input
                        value={formData.pec}
                        onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Codice SDI</Label>
                      <Input
                        value={formData.codice_univoco}
                        onChange={(e) => setFormData({ ...formData, codice_univoco: e.target.value })}
                        maxLength={7}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Annulla
              </Button>
              <Button type="submit" className="bg-[#053c5e] hover:bg-[#1f7a8c] min-w-[120px]">
                <Save className="w-4 h-4 mr-2" />
                Salva Dati
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
