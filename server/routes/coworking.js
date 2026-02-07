const express = require('express');
const router = express.Router();
const { OrdineCoworking, User, ProfiloCoworker } = require('../models');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const authMiddleware = require('../middleware/auth');

// Middleware to check auth
router.use(authMiddleware);

// POST /orders/:id/send-receipt
router.post('/orders/:id/send-receipt', async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await OrdineCoworking.findByPk(orderId);
        const { DatiFatturazione } = require('../models');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch billing data
        const billingData = await DatiFatturazione.findOne({ where: { user_id: order.user_id } });
        const email = order.profilo_email;
        const clienteNome = billingData?.ragione_sociale || order.profilo_nome_completo || 'Cliente';

        // Generate PDF
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // --- PDF Generation Logic ---
        const pageWidth = 595.28;

        doc.fontSize(20).fillColor('#053c5e').text('neu [nòi]', 50, 50);
        doc.fontSize(10).fillColor('#646464').text('spazio al lavoro APS', 50, 75);
        doc.text('Via Alloro 64, 90133 Palermo', 50, 90);
        doc.text('C.F. 97334130823', 50, 105);
        doc.text('info@neunoi.it', 50, 120);

        const displayId = order.numero_ricevuta ? `${order.numero_ricevuta} / ${new Date(order.data_ordine).getFullYear()}` : order.id;
        doc.fontSize(12).fillColor('black').text(`RICEVUTA #${displayId}`, 0, 50, { align: 'right', width: pageWidth - 50 });
        doc.fontSize(10).text(`Data: ${new Date(order.data_ordine).toLocaleDateString('it-IT')}`, 0, 70, { align: 'right', width: pageWidth - 50 });

        const isAnnullato = order.stato === 'annullato';
        const statoLabel = isAnnullato ? 'STORNO / ANNULLATA' : (order.stato_pagamento === 'pagato' ? 'PAGATA' : 'DA PAGARE');
        const statoColor = isAnnullato ? '#969696' : (order.stato_pagamento === 'pagato' ? '#1f7a8c' : '#db222a');

        doc.fontSize(10).fillColor(statoColor).font('Helvetica-Bold')
            .text(`STATO: ${statoLabel}`, 0, 85, { align: 'right', width: pageWidth - 50 });

        doc.fontSize(11).fillColor('#053c5e').text('Intestato a:', 50, 160);
        doc.fontSize(10).fillColor('black').font('Helvetica');

        if (billingData) {
            doc.text(billingData.ragione_sociale || order.profilo_nome_completo, 50, 180);
            let curY = 195;
            doc.text(billingData.indirizzo, 50, curY); curY += 15;
            doc.text(`${billingData.cap} ${billingData.citta} ${billingData.provincia ? `(${billingData.provincia})` : ''}`, 50, curY); curY += 15;
            doc.text(billingData.paese, 50, curY); curY += 15;

            if (billingData.partita_iva) { doc.text(`P.IVA / VAT: ${billingData.partita_iva}`, 50, curY); curY += 15; }
            if (billingData.codice_fiscale) { doc.text(`C.F.: ${billingData.codice_fiscale}`, 50, curY); curY += 15; }
            if (billingData.codice_univoco) { doc.text(`Codice SDI: ${billingData.codice_univoco}`, 50, curY); curY += 15; }
            yAddr = curY;
        } else {
            doc.text(order.profilo_nome_completo, 50, 180);
            doc.text(`Email: ${order.profilo_email}`, 50, 195);
            yAddr = 210;
        }

        // Divider
        doc.moveTo(50, yAddr + 10).lineTo(pageWidth - 50, yAddr + 10).strokeColor('#c8c8c8').stroke();

        let yPos = yAddr + 30;
        doc.fontSize(10).font('Helvetica-Bold').text('Descrizione', 50, yPos);
        doc.text('Importo', 0, yPos, { align: 'right', width: pageWidth - 50 });

        yPos += 20;
        doc.font('Helvetica');

        let prodotti = [];
        try {
            const p = typeof order.prodotti === 'string' ? JSON.parse(order.prodotti || '[]') : order.prodotti;
            prodotti = Array.isArray(p) ? p : [{ nome_prodotto: 'Servizio Coworking' }];
        } catch { prodotti = [{ nome_prodotto: 'Servizio Coworking' }]; }

        prodotti.forEach(prod => {
            const nome = prod.tipo_abbonamento_nome || prod.nome_prodotto || prod.nome || 'Servizio';
            doc.text(nome, 50, yPos);
            // doc.text(`EUR ...`, 0, yPos, { align: 'right', width: pageWidth - 50 }); // Price per item optional if not tracked
            yPos += 20;
        });

        // Total
        doc.moveTo(50, yPos + 10).lineTo(pageWidth - 50, yPos + 10).stroke();
        yPos += 30;

        doc.fontSize(12).font('Helvetica-Bold').text('TOTALE', 350, yPos);
        doc.text(`EUR ${parseFloat(order.totale).toFixed(2)}`, 0, yPos, { align: 'right', width: pageWidth - 50 });

        // Footer
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#969696')
            .text('Documento non fiscale emesso per servizi associativi / coworking.', 0, 700, { align: 'center', width: pageWidth });

        doc.end();
        // --- End PDF Generation ---

        // Wait for PDF to end
        await new Promise(resolve => doc.on('end', resolve));
        const pdfData = Buffer.concat(buffers);

        // Send Email
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Neu Noi" <noreply@neunoi.it>',
                to: email,
                subject: `Ricevuta Ordine #${order.numero_ricevuta || order.id} - Neu Noi`,
                html: `
                    <p>Gentile ${clienteNome},</p>
                    <p>In allegato la ricevuta per il tuo ordine #${order.numero_ricevuta ? `${order.numero_ricevuta}/${new Date(order.data_ordine).getFullYear()}` : order.id}.</p>
                    <p>Grazie,<br>neu [nòi]</p>
                `,
                attachments: [
                    {
                        filename: `Ricevuta_${order.numero_ricevuta ? `${order.numero_ricevuta}_${new Date(order.data_ordine).getFullYear()}` : order.id}_${clienteNome.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
                        content: pdfData
                    }
                ]
            });

            console.log(`Email sent to ${email}`);
            res.json({ success: true, message: 'Email sent' });
        } else {
            console.log('SMTP not configured');
            // Mock success for development if SMTP missing
            res.json({ success: true, message: 'SMTP not configured, but pretending success.' });
        }

    } catch (error) {
        console.error('Error sending receipt:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
