import { jsPDF } from 'jspdf';
import { neunoi } from '@/api/neunoiClient';

export const generateRicevutaPDF = async (ordine, user, profiloOverride = null) => {
    // Determine profile data: either provided override or fetch from order info
    let profilo = profiloOverride;

    // If not provided, try to fetch fresh Profile data if user_id is present in order
    // But typically the Order snapshot contains names. However, address/VAT might be in Profile.
    // If we have access to neunoiClient here we can fetch.
    // If not provided, try to fetch fresh Profile data and Billing Data
    let billingData = null;
    if (ordine.user_id) {
        try {
            const billArr = await neunoi.entities.DatiFatturazione.filter({ user_id: ordine.user_id });
            if (billArr[0]) billingData = billArr[0];
        } catch (e) { console.log('Error fetching billing data for receipt', e) }
    }

    try {
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
        const displayId = ordine.numero_ricevuta ? `${ordine.numero_ricevuta} / ${new Date(ordine.data_ordine).getFullYear()}` : ordine.id;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`RICEVUTA #${displayId}`, pageWidth - 20, 20, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Data: ${new Date(ordine.data_ordine).toLocaleDateString('it-IT')}`, pageWidth - 20, 26, { align: 'right' });

        // Payment Status
        const isPagato = ordine.stato_pagamento === 'pagato';
        const isAnnullato = ordine.stato === 'annullato';

        if (isAnnullato) {
            doc.setFontSize(40);
            doc.setTextColor(230, 230, 230); // Very light gray for watermark
            doc.text('ANNULLATA', pageWidth / 2, 80, { align: 'center', angle: 45 });
        }

        doc.setFontSize(10);
        if (isAnnullato) {
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'bold');
            doc.text(`STATO: ANNULLATA / STORNO`, pageWidth - 20, 32, { align: 'right' });
        } else {
            if (isPagato) doc.setTextColor(31, 122, 140);
            else doc.setTextColor(219, 34, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(`STATO: ${isPagato ? 'PAGATA' : 'DA PAGARE'}`, pageWidth - 20, 32, { align: 'right' });
        }
        doc.setFont('helvetica', 'normal');

        // Customer Info
        doc.setFontSize(11);
        doc.setTextColor(5, 60, 94);
        doc.text('Intestato a:', 20, 55);

        doc.setFontSize(10);
        doc.setTextColor(0);

        if (billingData) {
            doc.text(billingData.ragione_sociale || ordine.profilo_nome_completo || '', 20, 62);
            let curY = 67;
            doc.text(billingData.indirizzo || '', 20, curY); curY += 5;
            doc.text(`${billingData.cap || ''} ${billingData.citta || ''} ${billingData.provincia ? `(${billingData.provincia})` : ''}`, 20, curY); curY += 5;
            doc.text(billingData.paese || '', 20, curY); curY += 5;

            if (billingData.partita_iva) { doc.text(`P.IVA / VAT: ${billingData.partita_iva}`, 20, curY); curY += 5; }
            if (billingData.codice_fiscale) { doc.text(`C.F.: ${billingData.codice_fiscale}`, 20, curY); curY += 5; }
            if (billingData.codice_univoco) { doc.text(`Codice SDI: ${billingData.codice_univoco}`, 20, curY); curY += 5; }
        } else {
            doc.text(ordine.profilo_nome_completo || 'Cliente', 20, 62);
            doc.text(`Email: ${ordine.profilo_email || ''}`, 20, 67);
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
            const nome = (prod.tipo_abbonamento_nome || prod.nome_prodotto || prod.nome || 'Servizio');
            const quantita = prod.quantita > 1 ? ` (x${prod.quantita})` : '';
            doc.text(`${nome}${quantita}`, 20, yPos);

            const prezzo = prod.prezzo_totale !== undefined ? prod.prezzo_totale : (prod.prezzo || ordine.totale);
            doc.text(`€ ${prezzo.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
            yPos += 8;
        });

        // Total
        yPos += 10;
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTALE', pageWidth - 60, yPos);
        doc.text(`EUR ${ordine.totale?.toFixed(2) || '0.00'}`, pageWidth - 20, yPos, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('Documento non fiscale emesso per servizi associativi / coworking.', pageWidth / 2, 280, { align: 'center' });

        // Filename: progressivo - data - nome coworker
        const fileNameNome = billingData?.ragione_sociale || ordine.profilo_nome_completo || 'Cliente';
        const dateStr = new Date(ordine.data_ordine || Date.now()).toISOString().split('T')[0];
        const safeName = fileNameNome.toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const filePrefix = ordine.numero_ricevuta
            ? `${ordine.numero_ricevuta}_${new Date(ordine.data_ordine).getFullYear()}`
            : ordine.id;

        const fileName = `Ricevuta_${filePrefix}_${safeName}.pdf`;

        doc.save(fileName);
    } catch (error) {
        console.error('❌ Errore generazione PDF:', error);
        alert('Errore durante la generazione della ricevuta: ' + error.message);
    }
};
