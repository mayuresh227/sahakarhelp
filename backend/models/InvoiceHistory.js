const mongoose = require('mongoose');

const invoiceHistorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    totalTax: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    shipping: {
        type: Number,
        default: 0
    },
    itemCount: {
        type: Number,
        required: true
    },
    // Store the full invoice data as JSON for reference
    invoiceData: {
        type: Object,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for user + invoice number uniqueness
invoiceHistorySchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('InvoiceHistory', invoiceHistorySchema);