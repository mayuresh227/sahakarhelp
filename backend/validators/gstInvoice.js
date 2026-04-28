const { z } = require('zod');

// ====================
// GST Invoice Item Schema
// ====================
const gstInvoiceItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price cannot be negative'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%')
});

// ====================
// GST Invoice Generator Schema
// ====================
const gstInvoiceSchema = z.object({
  // Seller Details
  businessName: z.string().min(1, 'Business name is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
  gstNumber: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GST number format'
  ),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),

  // Customer Details
  customerName: z.string().min(1, 'Customer name is required'),
  customerAddress: z.string().min(1, 'Customer address is required'),
  customerGST: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid customer GST number format')
    .optional()
    .or(z.literal('')),

  // Invoice Info
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),

  // Items array
  items: z.array(gstInvoiceItemSchema).min(1, 'At least one item is required'),

  // Extra Fields
  discount: z.number().min(0).optional().default(0),
  shipping: z.number().min(0).optional().default(0)
}).strict();

module.exports = { gstInvoiceSchema, gstInvoiceItemSchema };