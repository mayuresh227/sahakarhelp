const PDFDocument = require('pdfkit');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

class DocumentEngine {
    async execute(tool, inputs) {
        switch (tool.slug) {
            case 'resume-generator':
                return this.generateResume(inputs);
            case 'gst-invoice-generator':
                return this.generateGSTInvoice(inputs);
            default:
                throw new Error(`Unsupported tool for document engine: ${tool.slug}`);
        }
    }

    async generateResume(data) {
        try {
            // Create a PDF document
            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));

            // Add content to the resume
            doc.fontSize(20).text(`${data.firstName} ${data.lastName}`, { align: 'center' });
            doc.fontSize(12).text(data.email, { align: 'center' });
            doc.fontSize(12).text(data.phone, { align: 'center' });
            doc.moveDown();

            // Add sections
            if (data.summary) {
                doc.fontSize(14).text('Professional Summary', { underline: true });
                doc.fontSize(12).text(data.summary);
                doc.moveDown();
            }

            if (data.experience && data.experience.length > 0) {
                doc.fontSize(14).text('Work Experience', { underline: true });
                data.experience.forEach(exp => {
                    doc.fontSize(12).text(`${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate})`);
                    doc.fontSize(10).text(exp.description);
                    doc.moveDown();
                });
            }

            if (data.education && data.education.length > 0) {
                doc.fontSize(14).text('Education', { underline: true });
                data.education.forEach(edu => {
                    doc.fontSize(12).text(`${edu.degree} at ${edu.institution} (${edu.year})`);
                    doc.moveDown();
                });
            }

            // Finalize PDF
            doc.end();

            // Wait for PDF to finish
            const pdfBuffer = await new Promise(resolve => {
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
            });

            return {
                success: true,
                resumePdf: pdfBuffer.toString('base64')
            };
        } catch (error) {
            throw new Error(`Resume generation failed: ${error.message}`);
        }
    }

    async generateGSTInvoice(data) {
        try {
            // Calculate totals
            let subtotal = 0;
            let totalTax = 0;
            const items = data.items || [];
            
            const itemDetails = items.map(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                const taxRate = parseFloat(item.taxRate) || 0;
                const itemTotal = quantity * price;
                const itemTax = itemTotal * (taxRate / 100);
                subtotal += itemTotal;
                totalTax += itemTax;
                
                return {
                    ...item,
                    itemTotal: itemTotal.toFixed(2),
                    itemTax: itemTax.toFixed(2)
                };
            });
            
            const discount = parseFloat(data.discount) || 0;
            const shipping = parseFloat(data.shipping) || 0;
            const finalTotal = subtotal + totalTax - discount + shipping;
            
            // Determine GST type (CGST+SGST or IGST)
            // For simplicity, assume same state -> CGST+SGST, else IGST
            // We'll just show both for demo
            const gstType = data.customerGST ? 'IGST' : 'CGST+SGST';
            
            // Create PDF
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            
            // Logo (if provided)
            if (data.logo && data.logo.data) {
                try {
                    const logoBuffer = Buffer.from(data.logo.data, 'base64');
                    doc.image(logoBuffer, 50, 45, { width: 100 });
                } catch (e) {
                    // If logo fails, continue without it
                }
            }
            
            // Header
            doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
            doc.moveDown();
            
            // Seller Details (left)
            doc.fontSize(12).text('Seller Details:', { underline: true });
            doc.fontSize(10).text(data.businessName || '');
            doc.fontSize(10).text(data.businessAddress || '');
            doc.fontSize(10).text(`GST: ${data.gstNumber || ''}`);
            if (data.phone) doc.fontSize(10).text(`Phone: ${data.phone}`);
            if (data.email) doc.fontSize(10).text(`Email: ${data.email}`);
            doc.moveDown();
            
            // Customer Details (right)
            const customerY = doc.y;
            doc.text('', 300, customerY - 100); // Move to right column
            doc.fontSize(12).text('Customer Details:', { underline: true });
            doc.fontSize(10).text(data.customerName || '');
            doc.fontSize(10).text(data.customerAddress || '');
            if (data.customerGST) doc.fontSize(10).text(`GST: ${data.customerGST}`);
            doc.moveDown();
            
            // Invoice Info
            doc.fontSize(12).text('Invoice Information:', { underline: true });
            doc.fontSize(10).text(`Invoice Number: ${data.invoiceNumber || ''}`);
            doc.fontSize(10).text(`Invoice Date: ${data.invoiceDate || ''}`);
            doc.moveDown();
            
            // Items Table
            const tableTop = doc.y + 10;
            const itemX = 50;
            const quantityX = 250;
            const priceX = 300;
            const totalX = 400;
            const taxX = 450;
            
            // Table Headers
            doc.fontSize(10).text('Item', itemX, tableTop);
            doc.fontSize(10).text('Qty', quantityX, tableTop);
            doc.fontSize(10).text('Price', priceX, tableTop);
            doc.fontSize(10).text('Total', totalX, tableTop);
            doc.fontSize(10).text('Tax', taxX, tableTop);
            
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            
            // Table Rows
            let rowY = tableTop + 25;
            itemDetails.forEach(item => {
                doc.fontSize(10).text(item.itemName || '', itemX, rowY);
                doc.fontSize(10).text(item.quantity, quantityX, rowY);
                doc.fontSize(10).text(`₹${item.price}`, priceX, rowY);
                doc.fontSize(10).text(`₹${item.itemTotal}`, totalX, rowY);
                doc.fontSize(10).text(`₹${item.itemTax}`, taxX, rowY);
                rowY += 20;
            });
            
            // Summary
            const summaryY = rowY + 20;
            doc.fontSize(10).text(`Subtotal: ₹${subtotal.toFixed(2)}`, 400, summaryY);
            doc.fontSize(10).text(`Total Tax: ₹${totalTax.toFixed(2)}`, 400, summaryY + 15);
            if (discount > 0) doc.fontSize(10).text(`Discount: -₹${discount.toFixed(2)}`, 400, summaryY + 30);
            if (shipping > 0) doc.fontSize(10).text(`Shipping: +₹${shipping.toFixed(2)}`, 400, summaryY + 45);
            doc.fontSize(12).text(`Final Total: ₹${finalTotal.toFixed(2)}`, 400, summaryY + 65, { bold: true });
            
            // GST Type
            doc.fontSize(10).text(`GST Type: ${gstType}`, 50, summaryY);
            
            // Signature (if provided)
            if (data.signature && data.signature.data) {
                try {
                    const signatureBuffer = Buffer.from(data.signature.data, 'base64');
                    doc.image(signatureBuffer, 450, summaryY + 100, { width: 80 });
                    doc.fontSize(10).text('Authorized Signature', 450, summaryY + 130);
                } catch (e) {
                    // If signature fails, skip
                }
            }
            
            // Footer
            doc.fontSize(8).text('Thank you for your business!', 50, doc.page.height - 50, { align: 'center' });
            
            // Finalize PDF
            doc.end();
            
            // Wait for PDF to finish
            const pdfBuffer = await new Promise(resolve => {
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
            });
            
            // Prepare invoice data for history
            const invoiceData = {
                invoiceNumber: data.invoiceNumber,
                invoiceDate: data.invoiceDate,
                customerName: data.customerName,
                totalAmount: finalTotal,
                subtotal,
                totalTax,
                discount,
                shipping,
                itemCount: items.length
            };
            
            return {
                success: true,
                invoicePdf: pdfBuffer.toString('base64'),
                invoiceData
            };
        } catch (error) {
            throw new Error(`GST Invoice generation failed: ${error.message}`);
        }
    }
}

module.exports = DocumentEngine;