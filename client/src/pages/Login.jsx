import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';

import { toast } from 'sonner';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();
    const [showResend, setShowResend] = useState(false);
    const [resending, setResending] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowResend(false);

        try {
            const response = await neunoi.auth.login(email, password);
            if (response.token) {
                const redirect = searchParams.get('redirect');
                window.location.href = redirect || '/Home';
            } else {
                setError('Login fallito');
            }
        } catch (err) {
            setError(err.message || 'Errore durante il login');
            // Check if error is due to missing verification
            if (err.message?.includes('verificare') || err.requires_verification) {
                setShowResend(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const res = await neunoi.auth.resendVerification(email);
            toast.success(res.message || 'Email inviata con successo');
            setShowResend(false);
        } catch (err) {
            toast.error(err.message || 'Errore durante l\'invio');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#053c5e] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-red.png" alt="neu [nòi]" className="h-16" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-[#053c5e]">Accedi</CardTitle>
                    <p className="text-center text-slate-500">Inserisci le tue credenziali per continuare</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="mario.rossi@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="space-y-2">
                                <div className="text-red-500 text-sm font-medium">{error}</div>
                                {showResend && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full text-[#1f7a8c] border-[#1f7a8c] hover:bg-slate-50"
                                        onClick={handleResend}
                                        disabled={resending}
                                    >
                                        {resending ? 'Invio in corso...' : 'Invia di nuovo email di verifica'}
                                    </Button>
                                )}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#1f7a8c] hover:bg-[#053c5e]"
                            disabled={loading}
                        >
                            {loading ? (
                                'Accesso in corso...'
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4 mr-2" /> Accedi
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <p className="text-sm text-slate-500">
                        <Link to="/ForgotPassword" title="Ripristina la tua password" className="text-[#1f7a8c] hover:underline font-medium">Password dimenticata?</Link>
                    </p>
                    <p className="text-sm text-slate-500">
                        Non hai un account? <Link to="/Register" className="text-[#1f7a8c] hover:underline">Registrati</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
