import React, { useState, useMemo } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, Download, Clock, Coins, AlertCircle, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function RiepilogoSoci() {
    const [searchTerm, setSearchTerm] = useState('');
    const [exportYear, setExportYear] = useState('');

    // 1. Dati Soci (Utenti con saldo e ore già calcolate nel database)
    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['admin_soci_summary'],
        queryFn: async () => {
            const allUsers = await neunoi.entities.User.list('-saldo_neu');
            // Filtriamo per chi ha ruolo socio o admin (evitiamo host puri o coworker esterni se necessario)
            return allUsers.filter(u =>
                u.role === 'socio' ||
                u.role === 'admin' ||
                u.role === 'super_admin' ||
                (u.roles && u.roles.includes('socio'))
            );
        }
    });

    // 2. Dichiarazioni (per export PDF)
    const { data: dichiarazioni = [] } = useQuery({
        queryKey: ['admin_dichiarazioni_export'],
        queryFn: () => neunoi.entities.DichiarazioneVolontariato.list({
            include: 'all',
            sort: '-data_dichiarazione'
        })
    });

    const years = useMemo(() => {
        const y = new Set();
        dichiarazioni.forEach(d => {
            if (d.anno_associativo) y.add(d.anno_associativo);
            else {
                const date = new Date(d.data_dichiarazione || d.createdAt);
                const year = date.getFullYear();
                const month = date.getMonth();
                const assocYear = month >= 9 ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
                y.add(assocYear);
            }
        });
        return Array.from(y).sort().reverse();
    }, [dichiarazioni]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const downloadVolontariatoReport = () => {
        if (!exportYear) {
            toast.error("Seleziona un anno associativo per il report");
            return;
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 20;
        let yPos = 20;

        // Header stilizzato
        pdf.setFillColor(31, 122, 140);
        pdf.rect(0, 0, 210, 40, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text('neu [nòi]', margin, 18);
        pdf.setFontSize(14);
        pdf.text(`RIEPILOGO VOLONTARIATO - ANNO ${exportYear}`, margin, 30);

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        yPos = 55;

        // Raggruppa ore per utente per l'anno selezionato
        const userStats = {};
        dichiarazioni.forEach(d => {
            let dYear = d.anno_associativo;
            if (!dYear) {
                const date = new Date(d.data_dichiarazione || d.createdAt);
                const year = date.getFullYear();
                const month = date.getMonth();
                dYear = month >= 9 ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
            }

            if (dYear === exportYear && d.confermato) {
                const uid = d.user_id;
                const name = d.User?.full_name || d.utente_nome || 'Utente Sconosciuto';
                if (!userStats[uid]) userStats[uid] = { name, ore: 0, neu: 0 };
                userStats[uid].ore += (d.ore || 0);
                userStats[uid].neu += (d.neu_guadagnati || 0);
            }
        });

        const statsArray = Object.values(userStats).sort((a, b) => b.ore - a.ore);

        if (statsArray.length === 0) {
            pdf.text("Nessun dato trovato per l'anno selezionato.", margin, yPos);
        } else {
            // Tabella Header
            pdf.setFont('helvetica', 'bold');
            pdf.text('SOCIO/A', margin, yPos);
            pdf.text('ORE TOTALI', 130, yPos);
            pdf.text('NEU RICEVUTI', 170, yPos);
            yPos += 4;
            pdf.line(margin, yPos, 190, yPos);
            yPos += 8;

            pdf.setFont('helvetica', 'normal');
            statsArray.forEach(stat => {
                if (yPos > 270) {
                    pdf.addPage();
                    yPos = 20;
                }
                pdf.text(stat.name, margin, yPos);
                pdf.text(`${stat.ore.toFixed(1)} h`, 130, yPos);
                pdf.text(`${stat.neu.toFixed(0)} NEU`, 170, yPos);
                yPos += 8;
            });
        }

        // Footer
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Generato il ${new Date().toLocaleDateString()} - Pagina ${i} di ${pageCount}`, 105, 290, { align: 'center' });
        }

        pdf.save(`Riepilogo_Volontariato_${exportYear.replace('/', '-')}.pdf`);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center gap-4">
                    <div className="bg-[#053c5e] p-3 rounded-lg text-white">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Riepilogo Soci</h1>
                        <p className="text-slate-500">Saldo NEU e Volontariato Annuale</p>
                    </div>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Cerca socio per nome o email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#edf6f9] border-none shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Soci Attivi</span>
                        </div>
                        <div className="text-3xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-[#fff1f2] border-none shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-rose-600 mb-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">NEU in Scadenza (Tot.)</span>
                        </div>
                        <div className="text-3xl font-bold text-rose-700">
                            {users.reduce((sum, u) => sum + (u.saldo_neu_scadenza || 0), 0).toFixed(0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#f0f9ff] border-none shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Ore Volontariato Anno</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-700">
                            {(users.reduce((sum, u) => sum + (u.ore_volontariato_anno || 0), 0)).toFixed(1)} h
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Socio / Email</TableHead>
                                <TableHead className="text-right">Saldo NEU</TableHead>
                                <TableHead className="text-right">Scadenza</TableHead>
                                <TableHead className="text-right">Ore Volontariato</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                                        Caricamento soci in corso...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                                        Nessun socio trovato con i criteri di ricerca.
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.map((u) => (
                                <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell>
                                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-[#1f7a8c]">
                                        {u.saldo_neu?.toFixed(1) || '0.0'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={u.saldo_neu_scadenza > 0 ? "destructive" : "outline"} className="font-mono">
                                            {u.saldo_neu_scadenza?.toFixed(1) || '0.0'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1 font-semibold">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {u.ore_volontariato_anno?.toFixed(1) || '0.0'} h
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <CardTitle className="text-lg">Export Report Volontariato</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400">
                        Genera un documento PDF con il dettaglio delle ore e dei NEU ricevuti per ogni socio nell'anno selezionato.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="space-y-2 w-full sm:w-64">
                            <label className="text-xs font-bold uppercase text-slate-500">Seleziona Anno Associativo</label>
                            <Select value={exportYear} onValueChange={setExportYear}>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Scegli un anno..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 text-white border-slate-700">
                                    {years.map(y => (
                                        <SelectItem key={y} value={y} className="hover:bg-slate-700 focus:bg-slate-700">
                                            Anno {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={downloadVolontariatoReport}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white border-none h-10 px-6"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Scarica Report PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
