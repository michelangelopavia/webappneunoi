import { jsPDF } from 'jspdf';
import { neunoi } from '@/api/neunoiClient';

export const generateRicevutaPDF = async (ordine, user, profiloOverride = null) => {
    // Determine profile data: either provided override or fetch from order info
    let profilo = profiloOverride;

    // If not provided, try to fetch fresh Profile data if user_id is present in order
    // But typically the Order snapshot contains names. However, address/VAT might be in Profile.
    // If we have access to neunoiClient here we can fetch.
    if (!profilo && ordine.profilo_coworker_id) {
        try {
            profilo = await neunoi.entities.ProfiloCoworker.get(ordine.profilo_coworker_id);
        } catch (e) { console.log('Error fetching profil for receipt', e) }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(5, 60, 94); // #053c5e
    doc.text('neu [nòi]', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('spazio al lavoro APS', 20, 25);
    doc.text('Via Alloro 64, 90133 Palermo', 20, 30);
    doc.text('C.F. 97334130823', 20, 35);
    doc.text('info@neunoi.it', 20, 40);

    // Order Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`RICEVUTA #${ordine.id}`, pageWidth - 20, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(ordine.data_ordine).toLocaleDateString('it-IT')}`, pageWidth - 20, 26, { align: 'right' });

    // Customer Info
    doc.setFontSize(11);
    doc.setTextColor(5, 60, 94);
    doc.text('Intestato a:', 20, 55);

    doc.setFontSize(10);
    doc.setTextColor(0);

    // Use profile data if available, fallback to order snapshot
    const clienteNome = profilo?.ragione_sociale ||
        (profilo?.first_name && profilo?.last_name ? `${profilo.first_name} ${profilo.last_name}` : ordine.profilo_nome_completo) ||
        'Cliente';

    doc.text(clienteNome, 20, 62);

    if (profilo) {
        if (profilo.indirizzo) doc.text(profilo.indirizzo, 20, 67);
        if (profilo.citta_residenza) doc.text(`${profilo.citta_residenza} ${profilo.paese_residenza ? '(' + profilo.paese_residenza + ')' : ''}`, 20, 72);
        if (profilo.p_iva) doc.text(`P.IVA: ${profilo.p_iva}`, 20, 77);
        if (profilo.codice_fiscale) doc.text(`C.F.: ${profilo.codice_fiscale}`, 20, 82);
    } else {
        // Fallback if we only have order flat data (email likely in order)
        if (ordine.profilo_email) doc.text(`Email: ${ordine.profilo_email}`, 20, 67);
    }

    // Line Divider
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(20, 90, pageWidth - 20, 90);

    // Items
    let yPos = 100;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Descrizione', 20, yPos);
    doc.text('Importo', pageWidth - 20, yPos, { align: 'right' });

    yPos += 10;
    doc.setFont('helvetica', 'normal');

    const prodotti = (() => {
        try {
            const p = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti || '[]') : ordine.prodotti;
            return Array.isArray(p) ? p : [{ nome_prodotto: 'Servizio Coworking' }];
        } catch { return [{ nome_prodotto: 'Servizio Coworking' }]; }
    })();

    prodotti.forEach(prod => {
        const nome = prod.tipo_abbonamento_nome || prod.nome_prodotto || prod.nome || 'Servizio';
        doc.text(nome, 20, yPos);

        const prezzo = prod.prezzo_totale || prod.prezzo || ordine.totale;
        if (prezzo) {
            // doc.text(`EUR ${prezzo.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
        }
        yPos += 8;
    });

    // Total
    yPos += 10;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALE', pageWidth - 60, yPos);
    doc.text(`EUR ${ordine.totale?.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('Documento non fiscale emesso per servizi associativi / coworking.', pageWidth / 2, 280, { align: 'center' });

    // Filename: progressivo - data - nome coworker
    // Using ID as Progressive for now.
    const dateStr = new Date(ordine.data_ordine).toISOString().split('T')[0];
    const safeName = clienteNome.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${ordine.id} - ${dateStr} - ${safeName}.pdf`;

    doc.save(fileName);
};
