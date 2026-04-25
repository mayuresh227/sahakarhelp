console.error('Testing initToolRegistry require...');
try {
    const registry = require('./initToolRegistry');
    console.error('SUCCESS');
} catch (e) {
    console.error('ERROR:', e.message);
    console.error('STACK:', e.stack);
}