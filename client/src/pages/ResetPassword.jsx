import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { neunoi } from '@/api/neunoiClient';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState('');
    const [invalidToken, setInvalidToken] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('token');
        if (!t) {
            setInvalidToken(true);
        } else {
            setToken(t);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error('Le password non coincidono');
        }
        if (newPassword.length < 6) {
            return toast.error('La password deve essere di almeno 6 caratteri');
        }

        setLoading(true);
        try {
            await neunoi.auth.resetPassword(token, newPassword);
            setSuccess(true);
            toast.success('Password aggiornata con successo');
            setTimeout(() => {
                window.location.href = createPageUrl('Login');
            }, 3000);
        } catch (error) {
            toast.error(error.message || 'Token scaduto o non valido');
        } finally {
            setLoading(false);
        }
    };

    if (invalidToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-[#053c5e]">Link non valido</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Il link di reset della password non è valido o è mancante. Per favore, richiedi un nuovo link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-[#053c5e]"
                            onClick={() => window.location.href = createPageUrl('ForgotPassword')}
                        >
                            Vai a Password Dimenticata
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-[#053c5e]">Password Aggiornata!</CardTitle>
                        <CardDescription className="text-base mt-2">
                            La tua password è stata modificata con successo. Stai per essere reindirizzato al login...
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-[#053c5e]"
                            onClick={() => window.location.href = createPageUrl('Login')}
                        >
                            Accedi Ora
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="max-w-md w-full shadow-xl border-t-4 border-t-[#1f7a8c]">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-[#053c5e]">Nuova Password</CardTitle>
                    <CardDescription>
                        Scegli una password sicura per il tuo account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pass" className="text-sm font-medium">Nuova Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="pass"
                                    type={showPassword ? 'text' : 'password'}
                                    className="pl-10 pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-sm font-medium">Conferma Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    className="pl-10"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#053c5e] hover:bg-[#1f7a8c] text-white font-bold py-6 text-lg transition-all"
                            disabled={loading}
                        >
                            {loading ? 'Aggiornamento...' : 'Salva Nuova Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
