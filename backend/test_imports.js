const fs = require('fs');
const path = require('path');

function testRequire(name, modulePath) {
    try {
        console.log(`Testing ${name}...`);
        require(modulePath);
        console.log(`  OK`);
        return true;
    } catch (e) {
        console.log(`  FAILED: ${e.message}`);
        console.log(`  Stack: ${e.stack}`);
        return false;
    }
}

console.log('Starting import tests...');
testRequire('ToolRegistry', './services/ToolRegistry');
testRequire('CalculatorEngine', './engines/CalculatorEngine');
testRequire('PDFEngine', './engines/PDFEngine');
testRequire('DocumentEngine', './engines/DocumentEngine');
testRequire('ImageEngine', './engines/ImageEngine');
testRequire('initToolRegistry', './initToolRegistry');
console.log('Done.');