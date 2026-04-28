'use strict';

const PACSEKYCEngine = require('./engines/PACSEKYCEngine');
const fs = require('fs');
const path = require('path');

const engine = new PACSEKYCEngine();

const tool = {
  slug: 'pacs_ekyc_tool',
  name: 'PACS eKYC Tool',
  type: 'pacs_ekyc',
  version: 'v1'
};

async function runTests() {
  console.log('=== PACS eKYC Tool Tests ===\n');

  console.log('Test 1: Missing ekycForm');
  const result1 = await engine.execute(tool, { aadhaarCard: { buffer: Buffer.from('test') } });
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('Expected: VALIDATION_FAILED for ekycForm\n');

  console.log('Test 2: Missing aadhaarCard');
  const result2 = await engine.execute(tool, { ekycForm: { buffer: Buffer.from('test') } });
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('Expected: VALIDATION_FAILED for aadhaarCard\n');

  console.log('Test 3: Valid inputs (with test files if available)');
  const testFiles = {
    ekycForm: path.join(__dirname, 'test1.pdf'),
    aadhaarCard: path.join(__dirname, 'test2.pdf')
  };

  const ekycExists = fs.existsSync(testFiles.ekycForm);
  const aadhaarExists = fs.existsSync(testFiles.aadhaarCard);

  if (ekycExists && aadhaarExists) {
    const inputs = {
      ekycForm: { buffer: fs.readFileSync(testFiles.ekycForm) },
      aadhaarCard: { buffer: fs.readFileSync(testFiles.aadhaarCard) }
    };

    try {
      const result3 = await engine.execute(tool, inputs);
      console.log('Result:', JSON.stringify(result3, null, 2));
      console.log('Success:', result3.success);
      if (result3.data?.fileSizeKB) {
        console.log('File size:', result3.data.fileSizeKB, 'KB');
      }
    } catch (err) {
      console.log('Error:', err.message);
    }
  } else {
    console.log('Skipped: Test files not found');
    console.log('Expected locations:');
    console.log('  -', testFiles.ekycForm);
    console.log('  -', testFiles.aadhaarCard);
  }

  console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);