const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');

// Setup Multer for local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.use(authMiddleware);

const adminOnly = (req, res, next) => {
    const roles = req.user?.roles || [req.user?.role];
    if (roles.some(r => ['admin', 'super_admin', 'host'].includes(r))) {
        return next();
    }
    res.status(403).json({ error: 'Accesso negato. Solo amministratori o host.' });
};

router.use(adminOnly);

// POST /api/integrations/upload
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return URL compatible with frontend expectation
    const file_url = `http://localhost:3000/uploads/${req.file.filename}`;
    res.json({ file_url });
});

// POST /api/integrations/extract (Mock for LLM/CSV extraction)
// The frontend uses `ExtractDataFromUploadedFile`. Since we are removing Base44, we need to implement parsing locally.
// Or we can just return the raw CSV content if the frontend parses it? 
// The Base44 `ExtractDataFromUploadedFile` was likely an AI/Utility.
// BUT `ImportaDati.jsx` uses it. It expects structured JSON back. 
// For CSV, we can parse it here using 'csv-parse' or just string splitting. 
// Given the complexity, let's look at `ImportaDati.jsx` again. It asks for specific schema extraction.
// Base44 likely used an LLM. I can simulate this for CSVs by parsing them deterministically if I know the format.
// ImportaDati.jsx handles the CSV format explanation, so the user uploads a CSV formatted in a specific way.
// The Base44 extraction likely just converted CSV to JSON matching the schema.
// I will implement a basic CSV-to-JSON parser here.

const fs = require('fs');

router.post('/extract', async (req, res) => {
    try {
        const { file_url } = req.body;
        // file_url is http://localhost:3000/uploads/filename. converts to local path
        const filename = file_url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ status: 'error', details: 'File not found' });
        }

        let content = fs.readFileSync(filePath, 'utf8');
        // Strip BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        // Robust CSV Parser: handles multiline and quoted strings
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;

        // Detect delimiter: check if first line has more ; or ,
        const firstLineEnd = content.indexOf('\n');
        const firstLineText = firstLineEnd > -1 ? content.substring(0, firstLineEnd) : content;
        const commaCount = (firstLineText.match(/,/g) || []).length;
        const semiCount = (firstLineText.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';

        while (i < content.length) {
            const char = content[i];
            const nextChar = content[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                // Escaped quote ""
                currentField += '"';
                i += 2;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
                currentRow.push(currentField.trim());
                if (currentRow.some(v => v !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                if (char === '\r') i++; // Skip \n
            } else {
                currentField += char;
            }
            i++;
        }
        // Final push
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(v => v !== '')) rows.push(currentRow);
        }

        if (rows.length === 0) {
            return res.json({ status: 'success', output: [] });
        }

        const rawHeaders = rows[0];
        const headers = rawHeaders.map(h => {
            const trimmed = h.replace(/^"|"$/g, '').trim();
            if (trimmed.includes(':')) return trimmed.split(':')[0];
            if (trimmed.includes('.')) return trimmed.split('.')[0];
            return trimmed;
        });

        const result = [];
        for (let r = 1; r < rows.length; r++) {
            const values = rows[r];
            const obj = {};
            headers.forEach((h, index) => {
                let val = values[index] || '';
                val = val.replace(/^"|"$/g, '').trim();

                // Convert Booleans ONLY if they look like booleans or are specific boolean fields
                const booleanFields = ['attivo', 'privacy_accettata', 'newsletter', 'confermato', 'completato', 'pagato', 'solo_staff', 'is_collettivo'];

                if (val.toLowerCase() === 'true' || val === '1') {
                    obj[h] = true;
                } else if (val.toLowerCase() === 'false' || val === '0') {
                    obj[h] = false;
                } else if (val === '' && booleanFields.includes(h)) {
                    // Default for empty boolean fields
                    obj[h] = (h === 'attivo'); // 'attivo' defaults to true, others to false
                } else if (val === '') {
                    obj[h] = ''; // Keep as empty string for text fields, cleaner for frontend to handle
                } else {
                    obj[h] = val;
                }

                // Convert numeric fields
                const numericFields = ['saldo_neu', 'saldo_neu_scadenza', 'ore_volontariato_anno', 'importo', 'totale', 'prezzo', 'durata_giorni', 'durata_mesi', 'numero_ingressi', 'ore_sale_incluse', 'crediti_sala', 'capienza', 'tariffa_oraria', 'ore', 'neu_guadagnati'];
                if (numericFields.includes(h)) {
                    if (val === '') {
                        obj[h] = null;
                    } else {
                        // Clean currency symbols, spaces and handle comma as decimal separator
                        let cleanVal = val.replace(/[€$£\s]/g, '').replace(/,/g, '.');
                        if (cleanVal !== '' && !isNaN(cleanVal)) {
                            obj[h] = Number(cleanVal);
                        }
                    }
                }

                // SMART DATE CONVERSION: Convert DD/MM/YYYY to YYYY-MM-DD for database
                if (h.includes('data_') || h.includes('_scadenza')) {
                    if (val && val.includes('/')) {
                        const parts = val.split('/');
                        if (parts.length === 3) {
                            let day = parts[0];
                            let month = parts[1];
                            let year = parts[2];
                            // Handle year if only 2 digits
                            if (year.length === 2) year = '20' + year;
                            // Pad single digits
                            if (day.length === 1) day = '0' + day;
                            if (month.length === 1) month = '0' + month;
                            obj[h] = `${year}-${month}-${day}`;
                        }
                    }
                }
            });
            result.push(obj);
        }

        res.json({
            status: 'success',
            output: result
        });

    } catch (error) {
        console.error(error);
        res.json({ status: 'error', details: error.message });
    }
});

// POST /api/integrations/send-email
const { sendEmail } = require('../utils/email');

router.post('/send-email', async (req, res) => {
    try {
        const { to, subject, text, html, base64_attachments } = req.body;

        const info = await sendEmail({
            to,
            subject,
            text,
            html: html || text,
            attachments: base64_attachments ? base64_attachments.map(a => ({
                filename: a.filename,
                content: Buffer.from(a.content, 'base64')
            })) : []
        });

        res.json({ status: 'success', messageId: info.messageId });

    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

module.exports = router;
