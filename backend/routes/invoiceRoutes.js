const express = require('express');
const router = express.Router();
const InvoiceHistory = require('../models/InvoiceHistory');

// Save invoice to history
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { invoiceNumber, invoiceDate, customerName, totalAmount, subtotal, totalTax, discount, shipping, itemCount, invoiceData } = req.body;
        
        if (!invoiceNumber || !invoiceDate || !customerName || totalAmount === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const invoice = new InvoiceHistory({
            userId,
            invoiceNumber,
            invoiceDate: new Date(invoiceDate),
            customerName,
            totalAmount,
            subtotal: subtotal || 0,
            totalTax: totalTax || 0,
            discount: discount || 0,
            shipping: shipping || 0,
            itemCount: itemCount || 0,
            invoiceData: invoiceData || {}
        });
        
        await invoice.save();
        
        res.status(201).json({
            success: true,
            message: 'Invoice saved to history',
            invoiceId: invoice._id
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Invoice with this number already exists for this user' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get invoice history for user (alias for /history)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const invoices = await InvoiceHistory.find({ userId })
            .sort({ createdAt: -1 })
            .select('invoiceNumber invoiceDate customerName totalAmount itemCount createdAt status');
        
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invoice history for user (same as above, kept for backward compatibility)
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const invoices = await InvoiceHistory.find({ userId })
            .sort({ createdAt: -1 })
            .select('invoiceNumber invoiceDate customerName totalAmount itemCount createdAt status');
        
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const invoice = await InvoiceHistory.findOne({ _id: req.params.id, userId });
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;