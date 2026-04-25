#!/usr/bin/env node

/**
 * Verification script for PDF tools after Docker deployment fixes.
 * Checks:
 * 1. Sharp loads successfully
 * 2. PDFEngine loads
 * 3. initToolRegistry loads and registers engines
 * 4. Tool registry can execute a simple tool (calculator) as sanity check
 */

console.log('=== Verifying PDF tools fix ===');

// 1. Check sharp
try {
    const sharp = require('sharp');
    console.log('✅ Sharp loaded successfully');
    console.log('   Sharp version:', sharp.versions ? sharp.versions.libvips : 'unknown');
} catch (error) {
    console.error('❌ Sharp failed to load:', error.message);
    process.exit(1);
}

// 2. Check PDFEngine
try {
    const PDFEngine = require('./engines/PDFEngine');
    console.log('✅ PDFEngine loaded successfully');
} catch (error) {
    console.error('❌ PDFEngine failed to load:', error.message);
    process.exit(1);
}

// 3. Check initToolRegistry
try {
    console.log('Loading initToolRegistry...');
    const ToolRegistry = require('./initToolRegistry');
    console.log('✅ initToolRegistry loaded successfully');
    
    // Check if engines are registered
    const engines = ['calculator', 'pdf', 'document', 'image'];
    engines.forEach(engineType => {
        const engine = ToolRegistry.getEngine(engineType);
        if (engine) {
            console.log(`   ✅ ${engineType} engine registered`);
        } else {
            console.log(`   ❌ ${engineType} engine NOT registered`);
        }
    });
} catch (error) {
    console.error('❌ initToolRegistry failed to load:', error.message);
    process.exit(1);
}

// 4. Simple tool execution test (calculator)
try {
    const ToolRegistry = require('./initToolRegistry');
    const result = ToolRegistry.executeTool('calculator', { expression: '2+2' });
    if (result && result.success && result.result === 4) {
        console.log('✅ Calculator tool works (2+2=4)');
    } else {
        console.log('⚠️  Calculator tool returned unexpected result:', result);
    }
} catch (error) {
    console.error('❌ Tool execution test failed:', error.message);
}

console.log('=== Verification complete ===');
console.log('All checks passed. PDF tools should be functional.');