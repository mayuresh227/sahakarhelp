const fs = require('fs');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('/tmp/test.log', msg + '\n');
};

log('Testing requires...');
try {
    log('1. Requiring ToolRegistry...');
    const ToolRegistry = require('./services/ToolRegistry');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
try {
    log('2. Requiring CalculatorEngine...');
    const CalculatorEngine = require('./engines/CalculatorEngine');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
try {
    log('3. Requiring PDFEngine...');
    const PDFEngine = require('./engines/PDFEngine');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
try {
    log('4. Requiring DocumentEngine...');
    const DocumentEngine = require('./engines/DocumentEngine');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
try {
    log('5. Requiring ImageEngine...');
    const ImageEngine = require('./engines/ImageEngine');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
try {
    log('6. Requiring initToolRegistry...');
    const initToolRegistry = require('./initToolRegistry');
    log('   OK');
} catch (e) {
    log('   FAILED: ' + e.message);
}
log('All requires tested.');