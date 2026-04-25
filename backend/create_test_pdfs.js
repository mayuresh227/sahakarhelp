const fs = require('fs');
const path = require('path');

// Minimal PDF content (single blank page)
const pdfContent = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n' +
  '<< /Type /Catalog /Pages 2 0 R >>\n' +
  'endobj\n' +
  '2 0 obj\n' +
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n' +
  'endobj\n' +
  '3 0 obj\n' +
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\n' +
  'endobj\n' +
  'xref\n' +
  '0 4\n' +
  '0000000000 65535 f \n' +
  '0000000010 00000 n \n' +
  '0000000053 00000 n \n' +
  '0000000102 00000 n \n' +
  'trailer\n' +
  '<< /Size 4 /Root 1 0 R >>\n' +
  'startxref\n' +
  '184\n' +
  '%%EOF',
  'binary'
);

const pdf1 = path.join(__dirname, 'test1.pdf');
const pdf2 = path.join(__dirname, 'test2.pdf');

fs.writeFileSync(pdf1, pdfContent);
fs.writeFileSync(pdf2, pdfContent);

console.log(`Created test PDFs:\n  ${pdf1}\n  ${pdf2}`);