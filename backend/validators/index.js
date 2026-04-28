const { z } = require('zod');
const { emiCalculatorSchema } = require('./schemas');
const { gstInvoiceSchema } = require('./gstInvoice');

// ====================
// Version-Aware Tool Schema Registry
// Format: `${slug}:${version}` -> ZodSchema
// ====================
const toolSchemas = {
  // EMI Calculator versions
  'emi_calculator:v1': emiCalculatorSchema,
  
  // GST Invoice Generator versions
  'gst_invoice_generator:v1': gstInvoiceSchema
};

/**
 * Get schema key for a tool
 * @param {string} slug - Tool slug
 * @param {string} version - Tool version
 * @returns {string} Schema key
 */
const getSchemaKey = (slug, version) => {
  return `${slug}:${version}`;
};

/**
 * Validates input data against a tool's Zod schema (version-aware)
 * @param {string} toolKey - The tool identifier with version (e.g., "emi_calculator:v1")
 * @param {object} input - The input data to validate
 * @returns {{ success: boolean, data?: object, error?: string, details?: array }}
 */
function validateToolInput(toolKey, input) {
  // Parse toolKey to get slug and version
  const parts = toolKey.split(':');
  const slug = parts[0];
  const version = parts.length > 1 ? parts[1] : null;

  if (!version) {
    // No version in toolKey - cannot validate with versioned schema
    console.warn(`No version specified in toolKey: ${toolKey}. Skipping schema validation.`);
    return {
      success: true,
      data: input,
      warning: `No version specified, validation skipped for ${toolKey}`
    };
  }

  const schemaKey = getSchemaKey(slug, version);
  const schema = toolSchemas[schemaKey];

  if (!schema) {
    // Schema not found for this version - allow request but log warning
    console.warn(`No validation schema found for tool version: ${schemaKey}`);
    return {
      success: true,
      data: input,
      warning: `No validation schema defined for ${schemaKey}`
    };
  }

  try {
    // Parse with strict mode (rejects unknown keys) and coerce types safely
    const validatedData = schema.parse(input);
    return { success: true, data: validatedData };
  } catch (err) {
    // Handle ZodError - use .issues property
    if (err.name === 'ZodError' && err.issues) {
      const errors = err.issues.map(issue => ({
        field: Array.isArray(issue.path) ? issue.path.join('.') : issue.path,
        message: issue.message || 'Invalid value'
      }));
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        details: errors
      };
    }

    // Unexpected error
    console.error(`Validation error for ${schemaKey}:`, err);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      details: [{ field: '_general', message: 'An unexpected validation error occurred' }]
    };
  }
}

/**
 * Validates input and throws if invalid (for internal use)
 * @param {string} toolKey - Tool identifier with version
 * @param {object} input - Input data
 * @returns {object} Validated data
 * @throws {z.ZodError}
 */
function validateToolInputStrict(toolKey, input) {
  const parts = toolKey.split(':');
  const slug = parts[0];
  const version = parts.length > 1 ? parts[1] : null;

  if (!version) {
    return input;
  }

  const schemaKey = getSchemaKey(slug, version);
  const schema = toolSchemas[schemaKey];
  
  if (!schema) {
    return input;
  }
  
  return schema.parse(input);
}

/**
 * Register a schema for a specific tool version
 * @param {string} slug - Tool slug
 * @param {string} version - Tool version
 * @param {z.ZodSchema} schema - Zod schema
 */
function registerSchema(slug, version, schema) {
  const key = getSchemaKey(slug, version);
  toolSchemas[key] = schema;
}

/**
 * Get list of all tools with defined schemas
 * @returns {string[]} Array of schema keys
 */
function getRegisteredSchemas() {
  return Object.keys(toolSchemas);
}

/**
 * Check if a tool version has a validation schema
 * @param {string} slug - Tool slug
 * @param {string} version - Tool version
 * @returns {boolean}
 */
function hasSchema(slug, version) {
  return getSchemaKey(slug, version) in toolSchemas;
}

module.exports = {
  validateToolInput,
  validateToolInputStrict,
  validateToolInputWithVersion, // Alias for clarity
  getRegisteredSchemas,
  hasSchema,
  registerSchema,
  toolSchemas
};

// Alias for backward compatibility
function validateToolInputWithVersion(slug, version, input) {
  return validateToolInput(getSchemaKey(slug, version), input);
}