import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [success, setSuccess] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await neunoi.auth.register(email, password, fullName);
            // Se c'è un warning ma l'account è creato, non mostriamo la schermata di successo totale
            // ma restiamo qui per mostrare il warning
            if (response.warning) {
                setSuccess(response);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            console.error('[REGISTRATION-ERROR]', err);
            setError(err.message || 'Errore durante la registrazione');
        } finally {
            setLoading(false);
        }
    };

    if (success === true) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#053c5e] p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-[#053c5e]">Registrazione effettuata!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-slate-600">
                            Abbiamo inviato un link di verifica all'indirizzo <strong>{email}</strong>.
                        </p>
                        <p className="text-sm text-slate-500">
                            Per favore, controlla la tua casella di posta (e la cartella spam) e clicca sul link per attivare il tuo account.
                        </p>
                        <Button
                            className="w-full bg-[#1f7a8c]"
                            onClick={() => window.location.href = '/Login'}
                        >
                            Vai al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#053c5e] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-red.png" alt="neu [nòi]" className="h-16" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-[#053c5e]">Registrazione</CardTitle>
                    <p className="text-center text-slate-500">Crea un nuovo account</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Mario Rossi"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
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
                                minLength={6}
                            />
                        </div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm font-medium">
                                {error}
                            </div>
                        )}
                        {success && typeof success === 'object' && success.warning && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md text-sm">
                                <strong>Attenzione:</strong> {success.message}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#1f7a8c] hover:bg-[#053c5e]"
                            disabled={loading}
                        >
                            {loading ? (
                                'Creazione account...'
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" /> Registrati
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-slate-500">
                        Hai già un account? <Link to="/Login" className="text-[#1f7a8c] hover:underline">Accedi</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
