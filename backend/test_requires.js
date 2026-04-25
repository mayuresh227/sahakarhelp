console.log('Testing requires...');
try {
    console.log('1. Requiring ToolRegistry...');
    const ToolRegistry = require('./services/ToolRegistry');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
try {
    console.log('2. Requiring CalculatorEngine...');
    const CalculatorEngine = require('./engines/CalculatorEngine');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
try {
    console.log('3. Requiring PDFEngine...');
    const PDFEngine = require('./engines/PDFEngine');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
try {
    console.log('4. Requiring DocumentEngine...');
    const DocumentEngine = require('./engines/DocumentEngine');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
try {
    console.log('5. Requiring ImageEngine...');
    const ImageEngine = require('./engines/ImageEngine');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
try {
    console.log('6. Requiring initToolRegistry...');
    const initToolRegistry = require('./initToolRegistry');
    console.log('   OK');
} catch (e) {
    console.error('   FAILED:', e.message);
}
console.log('All requires tested.');