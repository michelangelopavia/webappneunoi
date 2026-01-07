import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Edit, Save, X, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DatiAnagrafici() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    telefono: '',
    data_nascita: '',
    luogo_nascita: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    codice_fiscale: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await neunoi.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: profilo } = useQuery({
    queryKey: ['profilo_socio', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const profili = await neunoi.entities.ProfiloSocio.filter({ user_id: user.id });
      return profili[0] || null;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (profilo) {
      setFormData({
        telefono: profilo.telefono || '',
        data_nascita: profilo.data_nascita || '',
        luogo_nascita: profilo.luogo_nascita || '',
        indirizzo: profilo.indirizzo || '',
        citta: profilo.citta || '',
        cap: profilo.cap || '',
        provincia: profilo.provincia || '',
        codice_fiscale: profilo.codice_fiscale || ''
      });
    }
  }, [profilo]);

  const salvaMutation = useMutation({
    mutationFn: async (data) => {
      if (profilo) {
        await neunoi.entities.ProfiloSocio.update(profilo.id, data);
      } else {
        await neunoi.entities.ProfiloSocio.create({
          user_id: user.id,
          full_name: user.full_name,
          email: user.email,
          ruoli: user.roles || (user.role ? [user.role] : []),
          ...data,
          attivo: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profilo_socio'] });
      setEditing(false);
      toast.success('Dati salvati con successo');
    }
  });

  const handleUploadDocumento = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await neunoi.integrations.Core.UploadFile({ file });
      
      const updateData = { documento_identita_url: file_url };
      if (profilo) {
        await neunoi.entities.ProfiloSocio.update(profilo.id, updateData);
      } else {
        await neunoi.entities.ProfiloSocio.create({
          user_id: user.id,
          full_name: user.full_name,
          email: user.email,
          ruoli: user.roles || (user.role ? [user.role] : []),
          ...updateData,
          attivo: true
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['profilo_socio'] });
      toast.success('Documento caricato con successo');
    } catch (error) {
      toast.error('Errore nel caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    salvaMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#1f7a8c]" />
            Dati Anagrafici
          </CardTitle>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="outline" className="border-[#1f7a8c] text-[#1f7a8c]">
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={handleSave} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
                <Save className="w-4 h-4 mr-2" />
                Salva
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!editing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Telefono</p>
                  <p className="font-medium">{profilo?.telefono || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Data di nascita</p>
                  <p className="font-medium">
                    {profilo?.data_nascita ? new Date(profilo.data_nascita).toLocaleDateString('it-IT') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Luogo di nascita</p>
                  <p className="font-medium">{profilo?.luogo_nascita || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Codice Fiscale</p>
                  <p className="font-medium uppercase">{profilo?.codice_fiscale || '-'}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-slate-700 mb-2">Indirizzo di residenza</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Via/Piazza</p>
                    <p className="font-medium">{profilo?.indirizzo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">CAP</p>
                    <p className="font-medium">{profilo?.cap || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Città</p>
                    <p className="font-medium">{profilo?.citta || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Provincia</p>
                    <p className="font-medium uppercase">{profilo?.provincia || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-slate-700 mb-2">Documento di identità</p>
                {profilo?.documento_identita_url ? (
                  <div className="flex items-center gap-3">
                    <a 
                      href={profilo.documento_identita_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#1f7a8c] hover:text-[#053c5e]"
                    >
                      <FileText className="w-4 h-4" />
                      Visualizza documento
                    </a>
                    <Label htmlFor="upload-new" className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                      (Carica nuovo)
                      <Input 
                        id="upload-new"
                        type="file" 
                        onChange={handleUploadDocumento}
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                ) : (
                  <Label htmlFor="upload-doc" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#1f7a8c] hover:bg-slate-50">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {uploading ? 'Caricamento...' : 'Carica documento di identità (PDF o immagine)'}
                      </span>
                    </div>
                    <Input 
                      id="upload-doc"
                      type="file" 
                      onChange={handleUploadDocumento}
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploading}
                    />
                  </Label>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Telefono</Label>
                  <Input 
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    placeholder="+39 123 456 7890"
                  />
                </div>
                <div>
                  <Label>Data di nascita</Label>
                  <Input 
                    type="date"
                    value={formData.data_nascita}
                    onChange={(e) => setFormData({...formData, data_nascita: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Luogo di nascita</Label>
                  <Input 
                    value={formData.luogo_nascita}
                    onChange={(e) => setFormData({...formData, luogo_nascita: e.target.value})}
                    placeholder="Palermo"
                  />
                </div>
                <div>
                  <Label>Codice Fiscale</Label>
                  <Input 
                    value={formData.codice_fiscale}
                    onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value.toUpperCase()})}
                    placeholder="RSSMRA80A01G273X"
                    maxLength={16}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-slate-700 mb-3">Indirizzo di residenza</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <Label>Via/Piazza</Label>
                    <Input 
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({...formData, indirizzo: e.target.value})}
                      placeholder="Via Roma, 123"
                    />
                  </div>
                  <div>
                    <Label>CAP</Label>
                    <Input 
                      value={formData.cap}
                      onChange={(e) => setFormData({...formData, cap: e.target.value})}
                      placeholder="90133"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label>Città</Label>
                    <Input 
                      value={formData.citta}
                      onChange={(e) => setFormData({...formData, citta: e.target.value})}
                      placeholder="Palermo"
                    />
                  </div>
                  <div>
                    <Label>Provincia</Label>
                    <Input 
                      value={formData.provincia}
                      onChange={(e) => setFormData({...formData, provincia: e.target.value.toUpperCase()})}
                      placeholder="PA"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
