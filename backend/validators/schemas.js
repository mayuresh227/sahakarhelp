const { z } = require('zod');

// ====================
// EMI Calculator Schema
// ====================
const emiCalculatorSchema = z.object({
  loanAmount: z.number({
    required_error: 'Loan amount is required',
    invalid_type_error: 'Loan amount must be a number'
  }).min(1, 'Loan amount must be greater than 0'),
  
  interestRate: z.number({
    required_error: 'Interest rate is required',
    invalid_type_error: 'Interest rate must be a number'
  }).min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%'),
  
  tenureMonths: z.number({
    required_error: 'Tenure is required',
    invalid_type_error: 'Tenure must be a number'
  }).int('Tenure must be a whole number').min(1, 'Tenure must be at least 1 month'),
  
  // Optional fields with defaults
  processingFee: z.number().min(0).optional().default(0),
  prePaymentAmount: z.number().min(0).optional().default(0)
}).strict();

module.exports = { emiCalculatorSchema };