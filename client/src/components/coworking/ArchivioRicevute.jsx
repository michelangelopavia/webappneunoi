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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const queryClient = useQueryClient();

    const { data: ordini = [], isLoading } = useQuery({
        queryKey: ['admin_tutti_ordini'],
        queryFn: () => neunoi.entities.OrdineCoworking.list('-data_ordine'),
        initialData: []
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => neunoi.entities.OrdineCoworking.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_tutti_ordini'] });
            toast.success('Ordine eliminato con successo');
            setDeleteDialogOpen(false);
            setOrderToDelete(null);
        },
        onError: (err) => {
            toast.error('Errore durante l\'eliminazione: ' + err.message);
        }
    });

    const filteredOrders = ordini.filter(o =>
        (o.profilo_nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (o.id?.toString().includes(searchTerm) ?? false) ||
        (o.profilo_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    const handleDownload = async (ordine) => {
        let fullProfile = null;
        if (ordine.profilo_coworker_id) {
            try {
                fullProfile = await neunoi.entities.ProfiloCoworker.get(ordine.profilo_coworker_id);
            } catch (e) { }
        }
        generateRicevutaPDF(ordine, null, fullProfile);
    };

    const confirmDelete = (ordine) => {
        setOrderToDelete(ordine);
        setDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#1f7a8c]" />
                            Archivio Ricevute
                        </CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cerca per nome, email o n. ordine..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-medium sticky top-0">
                                    <tr>
                                        <th className="p-3">N. Ordine</th>
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
                                            <tr key={ordine.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-slate-500">#{ordine.id}</td>
                                                <td className="p-3">{new Date(ordine.data_ordine).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-[#053c5e]">{ordine.profilo_nome_completo}</div>
                                                    <div className="text-xs text-slate-500">{ordine.profilo_email}</div>
                                                </td>
                                                <td className="p-3 font-semibold">EUR {(ordine.totale || 0).toFixed(2)}</td>
                                                <td className="p-3">
                                                    <Badge variant={ordine.stato_pagamento === 'pagato' ? 'secondary' : 'outline'} className={ordine.stato_pagamento === 'pagato' ? 'bg-green-100 text-green-800' : ''}>
                                                        {ordine.stato_pagamento === 'pagato' ? 'Pagato' : 'Non Pagato'}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[#1f7a8c] hover:bg-slate-100"
                                                            onClick={() => handleDownload(ordine)}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => confirmDelete(ordine)}
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
                            Questa azione eliminerà definitivamente l'ordine #{orderToDelete?.id} e la relativa ricevuta.
                            Questa operazione non può essere annullata.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate(orderToDelete.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Elimina
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

