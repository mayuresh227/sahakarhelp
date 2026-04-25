const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const toolsRouter = require('./routes/tools');

const app = express();
app.use(express.json());
app.use('/api/tools', toolsRouter);

const PORT = 3003;
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
        console.log('=== Testing GET /api/tools ===');
        const res1 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools', method: 'GET' });
        console.log('Status:', res1.status);
        console.log('Response:', res1.body);
        const tools = JSON.parse(res1.body);
        console.log('Number of tools:', tools.length);
        
        // Test GET /api/tools/calculator/config
        console.log('\n=== Testing GET /api/tools/calculator/config ===');
        const res2 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools/calculator/config', method: 'GET' });
        console.log('Status:', res2.status);
        console.log('Response:', res2.body);
        
        // Test GET /api/tools/pdf-compressor/config
        console.log('\n=== Testing GET /api/tools/pdf-compressor/config ===');
        const res3 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools/pdf-compressor/config', method: 'GET' });
        console.log('Status:', res3.status);
        console.log('Response:', res3.body);
        
        // Test GET /api/tools/nonexistent/config (should 404)
        console.log('\n=== Testing GET /api/tools/nonexistent/config ===');
        const res4 = await httpRequest({ hostname: 'localhost', port: PORT, path: '/api/tools/nonexistent/config', method: 'GET' });
        console.log('Status:', res4.status);
        console.log('Response:', res4.body);
        
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        server.close();
        process.exit(0);
    }
}, 1000);