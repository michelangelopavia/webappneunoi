
const http = require('http');

const test = (path, method, data) => {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/entities${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`\nTesting ${method} ${path}`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            resolve();
        });

        req.write(postData);
        req.end();
    });
};

async function runTests() {
    await test('/ProfiloCoworker/filter', 'POST', { email: 'test@example.com' });
    await test('/ProfiloCoworker', 'POST', {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        genere: 'altro',
        data_nascita: '1990-01-01',
        citta_residenza: 'Palermo',
        privacy_accettata: true
    });
}

runTests();
