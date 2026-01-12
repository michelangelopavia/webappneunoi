import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { neunoi } from '@/api/neunoiClient';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await neunoi.auth.forgotPassword(email);
            setSubmitted(true);
            toast.success('Richiesta inviata con successo');
        } catch (error) {
            toast.error(error.message || 'Errore durante la richiesta');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-[#053c5e]">Controlla la tua email</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Se l'indirizzo <strong>{email}</strong> è registrato, riceverai a breve un link per reimpostare la password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Controlla anche la cartella Spam se non vedi l'email entro pochi minuti.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = createPageUrl('Login')}
                        >
                            Torna al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="max-w-md w-full shadow-xl border-t-4 border-t-[#db222a]">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto hover:bg-transparent text-slate-500"
                            onClick={() => window.location.href = createPageUrl('Login')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Torna al login
                        </Button>
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#053c5e]">Password dimenticata?</CardTitle>
                    <CardDescription>
                        Inserisci la tua email e ti invieremo un link per creare una nuova password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Indirizzo Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@esempio.it"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-[#053c5e] hover:bg-[#1f7a8c] text-white font-bold py-6 text-lg transition-all"
                            disabled={loading}
                        >
                            {loading ? 'Invio in corso...' : 'Invia Link di Reset'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
