const express = require('express');
const http = require('http');

const routeFiles = [
    { name: 'tools', path: './routes/tools.js', prefix: '/api/tools' },
    { name: 'user', path: './routes/user.js', prefix: '/api/user' },
    { name: 'admin', path: './routes/admin.js', prefix: '/api/admin' },
    { name: 'analytics', path: './routes/analytics.js', prefix: '/api/analytics' },
    { name: 'invoice', path: './routes/invoiceRoutes.js', prefix: '/api/invoice' },
    { name: 'payment', path: './routes/payment.js', prefix: '/api/payment' }
];

async function testRoute(routeFile) {
    return new Promise((resolve, reject) => {
        console.log(`\n=== Testing ${routeFile.name} ===`);
        const app = express();
        app.use(express.json());
        
        // Mock mongoose to avoid DB hangs
        jestMockMongoose();
        
        let router;
        try {
            router = require(routeFile.path);
        } catch (err) {
            console.error(`  ❌ Failed to load module: ${err.message}`);
            resolve({ name: routeFile.name, status: 'module_load_failed', error: err.message });
            return;
        }
        
        app.use(routeFile.prefix, router);
        
        // Add a catch-all route for testing
        app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not found in this test' });
        });
        
        const server = app.listen(0, 'localhost', async () => {
            const port = server.address().port;
            const baseUrl = `http://localhost:${port}${routeFile.prefix}`;
            
            console.log(`  Server listening on port ${port}`);
            console.log(`  Testing GET ${baseUrl} ...`);
            
            try {
                const response = await fetch(`${baseUrl}`, { method: 'GET', timeout: 5000 });
                const status = response.status;
                console.log(`  Response status: ${status}`);
                resolve({ name: routeFile.name, status: 'ok', httpStatus: status });
            } catch (err) {
                console.log(`  Request failed: ${err.message}`);
                resolve({ name: routeFile.name, status: 'request_failed', error: err.message });
            } finally {
                server.close();
            }
        });
        
        server.on('error', (err) => {
            console.error(`  Server error: ${err.message}`);
            resolve({ name: routeFile.name, status: 'server_error', error: err.message });
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            console.log(`  ⚠️  Test timeout`);
            server.close();
            resolve({ name: routeFile.name, status: 'timeout' });
        }, 10000);
    });
}

// Mock mongoose to prevent DB hangs
function jestMockMongoose() {
    // Override mongoose model methods to return immediately
    const mongoose = require('mongoose');
    const originalConnect = mongoose.connect;
    mongoose.connect = () => Promise.resolve();
    
    // Mock model methods
    const models = ['Analytics', 'User', 'ToolMetadata', 'ToolUsage', 'Subscription', 'InvoiceHistory'];
    models.forEach(modelName => {
        if (mongoose.models[modelName]) {
            const model = mongoose.models[modelName];
            model.find = () => ({ sort: () => ({ skip: () => ({ limit: () => Promise.resolve([]) }) }) });
            model.findOne = () => Promise.resolve(null);
            model.countDocuments = () => Promise.resolve(0);
            model.distinct = () => Promise.resolve([]);
            model.aggregate = () => Promise.resolve([]);
            model.prototype.save = function() { return Promise.resolve(this); };
        }
    });
}

async function runAllTests() {
    console.log('Starting route tests...');
    const results = [];
    for (const routeFile of routeFiles) {
        const result = await testRoute(routeFile);
        results.push(result);
    }
    
    console.log('\n=== SUMMARY ===');
    results.forEach(r => {
        console.log(`${r.name}: ${r.status} ${r.httpStatus ? `(${r.httpStatus})` : ''} ${r.error ? `- ${r.error}` : ''}`);
    });
    
    const problematic = results.filter(r => r.status !== 'ok' || (r.httpStatus && r.httpStatus >= 500));
    if (problematic.length > 0) {
        console.log('\n⚠️  Problematic routes:');
        problematic.forEach(r => console.log(`  - ${r.name}: ${r.status}`));
    } else {
        console.log('\n✅ All routes passed basic tests.');
    }
    
    process.exit(0);
}

// Polyfill fetch if not available
if (!global.fetch) {
    global.fetch = require('node-fetch');
}

runAllTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});