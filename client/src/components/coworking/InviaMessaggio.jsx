import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function InviaMessaggio({ user }) {
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    oggetto: '',
    messaggio: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await neunoi.integrations.Core.SendEmail({
        to: 'coworking@neunoi.it',
        subject: `[${user.full_name}] ${formData.oggetto}`,
        body: `
          <h3>Messaggio da: ${user.full_name}</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <hr />
          <p>${formData.messaggio.replace(/\n/g, '<br>')}</p>
        `
      });

      setFormData({ oggetto: '', messaggio: '' });
      toast.success('Messaggio inviato con successo!');
    } catch (error) {
      console.error('Errore invio:', error);
      toast.error('Errore nell\'invio del messaggio');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#1f7a8c]" />
          Invia Messaggio alla Reception
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Oggetto</Label>
            <Input
              value={formData.oggetto}
              onChange={(e) => setFormData({...formData, oggetto: e.target.value})}
              placeholder="Richiesta informazioni..."
              required
            />
          </div>
          <div>
            <Label>Messaggio</Label>
            <Textarea
              value={formData.messaggio}
              onChange={(e) => setFormData({...formData, messaggio: e.target.value})}
              placeholder="Scrivi qui il tuo messaggio..."
              rows={6}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#053c5e] hover:bg-[#1f7a8c]"
            disabled={sending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Invio...' : 'Invia a coworking@neunoi.it'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
