const { z } = require('zod');

// ====================
// EMI Calculator Schema
// ====================
const emiCalculatorSchema = z.object({
  principal: z.number({
    required_error: 'Principal is required',
    invalid_type_error: 'Principal must be a number'
  }).min(1, 'Principal must be greater than 0'),
  
  rate: z.number({
    required_error: 'Rate is required',
    invalid_type_error: 'Rate must be a number'
  }).min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%'),
  
  tenure: z.number({
    required_error: 'Tenure is required',
    invalid_type_error: 'Tenure must be a number'
  }).int('Tenure must be a whole number').min(1, 'Tenure must be at least 1 month'),
  
  // Optional fields with defaults
  processingFee: z.number().min(0).optional().default(0),
  prePaymentAmount: z.number().min(0).optional().default(0)
}).strict();

module.exports = { emiCalculatorSchema };
