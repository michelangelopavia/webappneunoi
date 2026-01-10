import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, FileText, Trash2 } from 'lucide-react';
import { generateRicevutaPDF } from '@/utils/receiptGenerator';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ArchivioRicevute() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const queryClient = useQueryClient();

    const { data: ordini = [], isLoading } = useQuery({
        queryKey: ['ordini'],
        queryFn: () => neunoi.entities.OrdineCoworking.list('-data_ordine'),
        initialData: []
    });

    // Populate years for the filter
    const availableYears = Array.from(new Set(ordini.map(o => new Date(o.data_ordine).getFullYear().toString())))
        .sort((a, b) => b - a);

    const deleteMutation = useMutation({
        mutationFn: (id) => neunoi.entities.OrdineCoworking.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordini'] });
            toast.success('Ordine eliminato con successo');
            setDeleteDialogOpen(false);
            setOrderToDelete(null);
        },
        onError: (err) => {
            toast.error('Errore durante l\'eliminazione: ' + err.message);
        }
    });

    const filteredOrders = ordini.filter(o => {
        const matchesSearch = (o.profilo_nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (o.id?.toString().includes(searchTerm) ?? false) ||
            (o.numero_ricevuta?.toString().includes(searchTerm) ?? false) ||
            (o.profilo_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

        const orderYear = new Date(o.data_ordine).getFullYear().toString();
        const matchesYear = selectedYear === 'all' || orderYear === selectedYear;

        return matchesSearch && matchesYear;
    }).sort((a, b) => (b.id || 0) - (a.id || 0)); // Add an explicit descending sort by ID

    const handleDownload = async (ordine) => {
        let fullProfile = null;
        if (ordine.profilo_coworker_id) {
            try {
                fullProfile = await neunoi.entities.ProfiloCoworker.get(ordine.profilo_coworker_id);
            } catch (e) { }
        }
        generateRicevutaPDF(ordine, null, fullProfile);
    };

    const handleBulkDownload = async () => {
        if (filteredOrders.length === 0) {
            toast.info('Nessuna ricevuta da scaricare');
            return;
        }

        toast.info(`Download di ${filteredOrders.length} ricevute iniziato...`);
        // We can't easily zip in browser without extra libs, but we can trigger multiple downloads 
        // with delays to avoid browser blocking them
        for (let i = 0; i < filteredOrders.length; i++) {
            const ordine = filteredOrders[i];
            setTimeout(() => {
                handleDownload(ordine);
            }, i * 1000); // 1s delay between each to avoid browser blocking multiple downloads
        }
    };

    const confirmDelete = (ordine) => {
        setOrderToDelete(ordine);
        setDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-[#053c5e]">
                            <FileText className="w-5 h-5 text-[#1f7a8c]" />
                            Archivio Ricevute
                        </CardTitle>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md border">
                                <span className="text-xs font-semibold px-2 text-slate-500 uppercase">Anno:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer pr-8"
                                >
                                    <option value="all">Tutti</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDownload}
                                className="border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white"
                                disabled={filteredOrders.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Scarica Tutte ({filteredOrders.length})
                            </Button>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Cerca per nome, email o n. ordine..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#053c5e] text-white font-medium sticky top-0">
                                    <tr>
                                        <th className="p-3">N. Ricevuta</th>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3">Importo</th>
                                        <th className="p-3">Stato</th>
                                        <th className="p-3 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {isLoading ? (
                                        <tr><td colSpan="6" className="p-4 text-center">Caricamento...</td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan="6" className="p-4 text-center text-slate-500">Nessuna ricevuta trovata</td></tr>
                                    ) : (
                                        filteredOrders.map(ordine => (
                                            <tr key={ordine.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-mono font-bold text-[#053c5e]">
                                                    {ordine.numero_ricevuta ? `${ordine.numero_ricevuta}/${new Date(ordine.data_ordine).getFullYear()}` : `#${ordine.id}`}
                                                </td>
                                                <td className="p-3">{new Date(ordine.data_ordine).toLocaleDateString('it-IT')}</td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-[#1f7a8c]">{ordine.profilo_nome_completo}</div>
                                                    <div className="text-xs text-slate-500">{ordine.profilo_email}</div>
                                                </td>
                                                <td className="p-3 font-bold text-lg">EUR {(ordine.totale || 0).toFixed(2)}</td>
                                                <td className="p-3">
                                                    {ordine.stato === 'annullato' ? (
                                                        <Badge className="bg-red-50 text-red-700 border-red-200">
                                                            ANNULLATA
                                                        </Badge>
                                                    ) : (
                                                        <Badge className={ordine.stato_pagamento === 'pagato' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                                                            {ordine.stato_pagamento === 'pagato' ? 'PAGATA' : 'DA PAGARE'}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[#1f7a8c] hover:bg-slate-100"
                                                            onClick={() => handleDownload(ordine)}
                                                            title="Scarica PDF"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => confirmDelete(ordine)}
                                                            title="Elimina ordine"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei sicuro di voler eliminare questo ordine?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questa azione eliminerà definitivamente l'ordine {orderToDelete?.numero_ricevuta ? `${orderToDelete.numero_ricevuta}/${new Date(orderToDelete.data_ordine).getFullYear()}` : `#${orderToDelete?.id}`}.
                            Questa operazione non può essere annullata e i dati fiscali andranno persi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate(orderToDelete.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Conferma Eliminazione
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

