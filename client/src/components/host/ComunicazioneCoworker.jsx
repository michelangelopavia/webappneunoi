import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Mail, Send, Paperclip, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ComunicazioneCoworker() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCoworker, setSelectedCoworker] = useState(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);

    const { data: profili = [] } = useQuery({
        queryKey: ['profili'],
        queryFn: () => neunoi.entities.ProfiloCoworker.list(),
        initialData: []
    });

    const filteredProfili = profili.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    base64: reader.result.split(',')[1]
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!selectedCoworker) {
            toast.error('Seleziona un coworker');
            return;
        }
        if (!subject || !message) {
            toast.error('Oggetto e messaggio sono obbligatori');
            return;
        }

        setSending(true);
        try {
            await neunoi.integrations.Core.SendEmail({
                to: selectedCoworker.email,
                subject: subject,
                body: message,
                from_name: 'neu [nòi] Staff',
                base64_attachments: attachments.map(a => ({
                    filename: a.name,
                    content: a.base64
                }))
            });

            toast.success('Comunicazione inviata con successo');
            setSubject('');
            setMessage('');
            setAttachments([]);
            setSelectedCoworker(null);
        } catch (error) {
            console.error('Errore invio:', error);
            toast.error('Errore durante l\'invio della comunicazione');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search and List */}
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Cerca Coworker
                    </CardTitle>
                    <Input
                        placeholder="Nome o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-2"
                    />
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <div className="divide-y divide-slate-100">
                            {filteredProfili.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedCoworker(p)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-3 ${selectedCoworker?.id === p.id ? 'bg-slate-100 border-l-4 border-[#1f7a8c]' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#bfdbf7] flex items-center justify-center text-[#053c5e]">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm truncate">{p.first_name} {p.last_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{p.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Composition Form */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#1f7a8c]" />
                        Invia Comunicazione
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedCoworker ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Mail className="w-12 h-12 mb-4 opacity-20" />
                            <p>Seleziona un coworker dalla lista per iniziare</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Destinatario:</p>
                                    <p className="font-bold text-[#053c5e]">{selectedCoworker.first_name} {selectedCoworker.last_name} ({selectedCoworker.email})</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCoworker(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Oggetto *</Label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Es: Informazioni abbonamento..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Messaggio *</Label>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Scrivi qui il tuo messaggio..."
                                    rows={8}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Allegati</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-[#bfdbf7] text-[#053c5e] px-2 py-1 rounded text-xs">
                                            <Paperclip className="w-3 h-3" />
                                            <span className="max-w-[150px] truncate">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(idx)} className="hover:text-red-600">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="file-upload"
                                        multiple
                                    />
                                    <Label
                                        htmlFor="file-upload"
                                        className="cursor-pointer flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-md transition-colors border border-dashed border-slate-300"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                        Allega File
                                    </Label>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    className="bg-[#053c5e] hover:bg-[#1f7a8c] min-w-[150px]"
                                    disabled={sending}
                                >
                                    {sending ? 'Invio in corso...' : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Invia Email
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
