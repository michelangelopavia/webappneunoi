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

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await neunoi.auth.register(email, password, fullName);
            if (response.token) {
                window.location.href = '/Home';
            } else {
                setError('Registrazione fallita');
            }
        } catch (err) {
            setError(err.message || 'Errore durante la registrazione');
        } finally {
            setLoading(false);
        }
    };

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
                            <div className="text-red-500 text-sm font-medium">{error}</div>
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
