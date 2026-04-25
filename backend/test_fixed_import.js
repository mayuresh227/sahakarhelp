console.log('Testing fixed initToolRegistry require...');
try {
    const registry = require('./initToolRegistry');
    console.log('SUCCESS: registry loaded');
    console.log('Registered engines:', Array.from(registry.engines.keys()));
} catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
}