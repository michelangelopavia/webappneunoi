const fs = require('fs');
const path = require('path');
const { TipoAbbonamento } = require('./models');

async function fixPricesFromCsv() {
    const csvPath = path.join(__dirname, 'uploads', '1767435016462-965053492.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('CSV not found');
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    console.log('Starting data repair...');

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple split but need to handle quotes for price like "€80,00"
        const row = [];
        let current = '';
        let inQuotes = false;
        for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current);

        const nome = row[0];
        const prezzoStr = row[2];

        if (nome && prezzoStr) {
            const cleanPrezzo = parseFloat(prezzoStr.replace(/[€$£\s]/g, '').replace(/,/g, '.'));

            if (!isNaN(cleanPrezzo)) {
                const [affected] = await TipoAbbonamento.update(
                    { prezzo: cleanPrezzo },
                    { where: { nome: nome } }
                );
                if (affected > 0) {
                    console.log(`Updated "${nome}": ${cleanPrezzo}€`);
                }
            }
        }
    }
    console.log('Repair completed.');
    process.exit(0);
}

fixPricesFromCsv().catch(err => {
    console.error(err);
    process.exit(1);
});
