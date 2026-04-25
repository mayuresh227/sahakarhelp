const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const toolsRouter = require('./routes/tools');

const app = express();
app.use(express.json());
app.use('/api/tools', toolsRouter);

const PORT = 3002;
const server = app.listen(PORT, () => {
    console.log(`Test server listening on port ${PORT}`);
});

function httpRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

// Wait for server to start
setTimeout(async () => {
    try {
        // Test GET /api/tools
        const res1 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools', method: 'GET' });
        console.log('GET /api/tools status:', res1.status);
        console.log('Response:', res1.body);
        
        // Test GET /api/tools/calculator/config
        const res2 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools/calculator/config', method: 'GET' });
        console.log('GET /api/tools/calculator/config status:', res2.status);
        console.log('Response:', res2.body);
        
        // Test POST /api/tools/calculator (optional)
        // const res3 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools/calculator', method: 'POST', headers: { 'Content-Type': 'application/json' } });
        // console.log('POST /api/tools/calculator status:', res3.status);
        // console.log('Response:', res3.body);
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        server.close();
        process.exit(0);
    }
}, 1000);