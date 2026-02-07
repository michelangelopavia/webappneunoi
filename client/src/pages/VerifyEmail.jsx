import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { neunoi } from '@/api/neunoiClient';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function VerifyEmail() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token di verifica mancante.');
            setLoading(false);
            return;
        }

        const verify = async () => {
            try {
                const res = await neunoi.auth.verifyEmail(token);
                setStatus('success');
                setMessage(res.message || 'Email verificata con successo!');
                toast.success('Email verificata!');
            } catch (error) {
                setStatus('error');
                setMessage(error.message || 'Link di verifica non valido o scaduto.');
            } finally {
                setLoading(false);
            }
        };

        verify();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full text-center shadow-lg border-t-4 border-t-[#053c5e]">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        {status === 'verifying' && (
                            <div className="p-3 bg-blue-100 rounded-full animate-pulse">
                                <Loader2 className="w-8 h-8 text-[#053c5e] animate-spin" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        )}
                    </div>

                    <CardTitle className="text-2xl font-bold text-[#053c5e]">
                        {status === 'verifying' && 'Verifica in corso...'}
                        {status === 'success' && 'Email Verificata!'}
                        {status === 'error' && 'Errore di Verifica'}
                    </CardTitle>

                    <CardDescription className="text-base mt-2">
                        {message || 'Stiamo verificando la validità del tuo indirizzo email.'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {status === 'success' && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                            <p>Il tuo account è ora confermato. Un amministratore dovrà approvare la tua richiesta di iscrizione prima che tu possa accedere a tutte le funzionalità.</p>
                        </div>
                    )}

                    <Button
                        className="w-full bg-[#053c5e] hover:bg-[#1f7a8c] transition-colors"
                        onClick={() => window.location.href = createPageUrl('Login')}
                    >
                        Vai al Login
                    </Button>

                    {status === 'error' && (
                        <p className="text-sm text-slate-500">
                            Hai problemi con la verifica? <br />
                            <a
                                href={createPageUrl('Login')}
                                className="text-[#1f7a8c] hover:underline font-medium"
                            >
                                Prova a richiedere un nuovo link
                            </a>
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
