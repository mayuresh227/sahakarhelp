const express = require('express');
const mongoose = require('mongoose');
const toolsRouter = require('./routes/tools');

const app = express();
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
    req.user = {
        id: 'temporary-user-id',
        email: 'guest@example.com',
        name: 'Guest User',
        role: 'user',
        plan: 'free',
        usageCount: 0
    };
    req.isAuthenticated = false;
    next();
});

app.use('/api/tools', toolsRouter);

app.get('/api/test', (req, res) => {
    res.json({ message: 'API working 🚀' });
});

// Start server
const PORT = 3003;
const server = app.listen(PORT, () => {
    console.log(`Test server listening on port ${PORT}`);
    
    // Make test requests
    const http = require('http');
    
    function makeRequest(path, callback) {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`${path} -> ${res.statusCode} ${data.substring(0, 100)}`);
                callback(null, res.statusCode);
            });
        });
        
        req.on('error', (err) => {
            console.error(`${path} -> ERROR: ${err.message}`);
            callback(err);
        });
        
        req.setTimeout(5000, () => {
            console.error(`${path} -> TIMEOUT`);
            req.destroy();
            callback(new Error('timeout'));
        });
        
        req.end();
    }
    
    // Test after a short delay
    setTimeout(() => {
        console.log('\n--- Testing routes ---');
        makeRequest('/api/test', (err) => {
            if (err) console.log('Test route failed');
            makeRequest('/api/tools', (err) => {
                if (err) console.log('Tools route failed');
                console.log('\n--- Tests complete ---');
                server.close();
                process.exit(0);
            });
        });
    }, 1000);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

setTimeout(() => {
    console.error('Overall timeout');
    server.close();
    process.exit(1);
}, 15000);