import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import SuccessAnimation from '../components/SuccessAnimation';

export default function CheckIn() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    genere: '',
    email: '',
    telefono: '',
    data_nascita: '',
    citta_residenza: '',
    paese_residenza: '',
    privacy_accettata: false,
    newsletter: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Nome, cognome ed email sono obbligatori');
      return;
    }

    if (!formData.genere || !formData.data_nascita || !formData.citta_residenza || !formData.paese_residenza) {
      toast.error('Tutti i campi obbligatori devono essere compilati');
      return;
    }

    if (!formData.privacy_accettata) {
      toast.error('Devi accettare la privacy policy per continuare');
      return;
    }

    setSaving(true);
    try {
      // Controlla se l'utente è loggato
      let currentUser = null;
      try {
        currentUser = await neunoi.auth.me();
      } catch (error) {
        // Utente non loggato, continua normalmente
      }

      // Check duplicati
      const profiliEsistenti = await neunoi.entities.ProfiloCoworker.filter({ email: formData.email });
      if (profiliEsistenti.length > 0) {
        toast.error('Esiste già un profilo registrato con questa email.');
        // Se l'utente è loggato, potrebbe essere utile dirgli che è già collegato, ma per il check-in semplice basta bloccare.
        setSaving(false);
        return;
      }

      await neunoi.entities.ProfiloCoworker.create({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        genere: formData.genere,
        telefono: formData.telefono,
        data_nascita: formData.data_nascita,
        citta_residenza: formData.citta_residenza,
        paese_residenza: formData.paese_residenza,
        privacy_accettata: formData.privacy_accettata,
        data_accettazione_privacy: new Date().toISOString(),
        data_compilazione: new Date().toISOString(),
        newsletter: formData.newsletter,
        user_id: currentUser?.id || null,
        stato: currentUser ? 'iscritto' : 'check_in_completato'
      });

      setSuccess(true);

      setTimeout(() => {
        setFormData({
          first_name: '',
          last_name: '',
          genere: '',
          email: '',
          telefono: '',
          data_nascita: '',
          citta_residenza: '',
          paese_residenza: '',
          privacy_accettata: false,
          newsletter: false
        });
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error(error.message || 'Errore durante il check-in');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#bfdbf7] to-white flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-4xl font-bold text-[#053c5e] mb-4">
              Grazie!
            </h1>
            <p className="text-xl text-[#1f7a8c] mb-2">
              Benvenuto/a al coworking neu [nòi]
            </p>
            <p className="text-slate-600">
              Il tuo check-in è stato completato con successo
            </p>
          </div>
          <img
            src="/logo-white.png"
            alt="neu [nòi]"
            className="h-16 mx-auto opacity-50"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#bfdbf7] to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img
            src="/logo-white.png"
            alt="neu [nòi]"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#053c5e] mb-2">Check-in Form</h1>
          <p className="text-slate-600">Benvenuto/a in neu [nòi] - Compila il form per il check-in</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome / First Name *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Mario"
                    required
                  />
                </div>
                <div>
                  <Label>Cognome / Last Name *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Rossi"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Genere / Gender *</Label>
                <Select value={formData.genere} onValueChange={(value) => setFormData({ ...formData, genere: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona genere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maschio">Maschio / Male</SelectItem>
                    <SelectItem value="femmina">Femmina / Female</SelectItem>
                    <SelectItem value="altro">Altro / Other</SelectItem>
                    <SelectItem value="ente giuridico">Ente Giuridico / Legal Entity</SelectItem>
                    <SelectItem value="preferisco_non_rispondere">Preferisco non rispondere / Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="mario.rossi@example.com"
                  required
                />
              </div>

              <div>
                <Label>Tel</Label>
                <Input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>

              <div>
                <Label>Data di nascita / Date of birth *</Label>
                <Input
                  type="date"
                  value={formData.data_nascita}
                  onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Città di residenza / City of residence *</Label>
                  <Input
                    value={formData.citta_residenza}
                    onChange={(e) => setFormData({ ...formData, citta_residenza: e.target.value })}
                    placeholder="Es: Palermo"
                    required
                  />
                </div>
                <div>
                  <Label>Stato / Country *</Label>
                  <Input
                    value={formData.paese_residenza}
                    onChange={(e) => setFormData({ ...formData, paese_residenza: e.target.value })}
                    placeholder="Es: Italy"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.privacy_accettata}
                    onCheckedChange={(checked) => setFormData({ ...formData, privacy_accettata: checked })}
                  />
                  <div className="flex-1">
                    <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                      Autorizzazione al trattamento dati / Data processing authorization *
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      <a
                        href="https://neunoi.org/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1f7a8c] hover:underline"
                      >
                        https://neunoi.org/privacy-policy
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="newsletter"
                    checked={formData.newsletter}
                    onCheckedChange={(checked) => setFormData({ ...formData, newsletter: checked })}
                  />
                  <label htmlFor="newsletter" className="text-sm cursor-pointer">
                    Desidero ricevere informazioni sulle iniziative e gli eventi dell'associazione / I would like to receive information about the association's initiatives and events
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#053c5e] hover:bg-[#1f7a8c] text-white"
                disabled={saving}
              >
                {saving ? 'Salvataggio...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Completa Check-in
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-4">
          I campi contrassegnati con * sono obbligatori
        </p>
      </div>
    </div>
  );
}
