import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Search, Calendar as CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';

export default function GestioneIngressiAdmin() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: ingressi = [], isLoading } = useQuery({
        queryKey: ['admin_ingressi'],
        queryFn: () => neunoi.entities.IngressoCoworking.list('-data_ingresso'),
        initialData: []
    });

    const exportToCSV = () => {
        if (ingressi.length === 0) {
            toast.error('Nessun ingresso da esportare');
            return;
        }

        const headers = ['ID', 'Data', 'Nome Utente', 'Tipo Ingresso', 'Durata', 'Ingressi Consumati'];
        const rows = ingressi.map(i => [
            i.id,
            new Date(i.data_ingresso).toLocaleString('it-IT'),
            i.profilo_nome_completo || 'N/D',
            i.tipo_ingresso || i.tipo || 'carnet',
            i.durata || 'giornata_intera',
            i.ingressi_consumati || 1
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ingressi_neunoi_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Esportazione completata');
    };

    const filteredIngressi = ingressi.filter(i =>
        (i.profilo_nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (i.tipo_ingresso?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-[#053c5e] flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Registro Ingressi
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cerca nome o tipo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            onClick={exportToCSV}
                            className="bg-[#1f7a8c] hover:bg-[#053c5e]"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500">Caricamento...</div>
                ) : (
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                            {filteredIngressi.map(i => (
                                <div key={i.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                        <div className="font-bold text-[#053c5e]">{i.profilo_nome_completo}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(i.data_ingresso).toLocaleString('it-IT')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 bg-slate-100 rounded uppercase font-semibold text-slate-600">
                                            {i.tipo_ingresso || i.tipo || 'carnet'}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-[#bfdbf7] rounded uppercase font-semibold text-[#053c5e]">
                                            {i.durata?.replace('_', ' ') || 'giornata intera'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {filteredIngressi.length === 0 && (
                                <div className="text-center py-12 text-slate-400">Nessun ingresso trovato</div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
