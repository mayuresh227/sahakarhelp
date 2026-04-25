const express = require('express');
const toolsRouter = require('./routes/tools');

const app = express();
app.use(express.json());
app.use('/api/tools', toolsRouter);

const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`Test server listening on port ${port}`);
    // Make a POST request to /api/tools/calculator
    const http = require('http');
    const postData = JSON.stringify({ expression: '2+2' });
    const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/tools/calculator',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
            server.close();
            process.exit(0);
        });
    });
    req.on('error', (err) => {
        console.error('Request error:', err);
        server.close();
        process.exit(1);
    });
    req.write(postData);
    req.end();
});