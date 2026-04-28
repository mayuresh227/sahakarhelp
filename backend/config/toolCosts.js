/**
 * Tool cost configuration
 * Defines the credit cost for each tool
 */

const TOOL_COSTS = {
  // Calculator tools - cost 1 credit
  'calculator': 1,
  'gst-calculator': 1,
  'simple-interest-calculator': 1,
  'compound-interest-calculator': 1,

  // PDF tools - cost 5 credits
  'pdf-merge': 5,
  'pdf-compress': 5,
  'pdf-split': 5,
  'pdf-to-images': 5,
  'image-to-pdf': 5,
  'pdf-resume-generator': 5,

  // Image tools - cost 5 credits
  'image-resize': 5,
  'image-crop': 5,
  'image-rotate': 5,
  'image-filter': 5,
  'image-compress': 5,

  // Document tools - cost 3 credits
  'document-generator': 3,
  'invoice-generator': 3,
};

/**
 * Default cost for unknown tools
 */
const DEFAULT_COST = 2;

/**
 * Get cost for a tool by slug
 * @param {string} toolSlug - Tool identifier
 * @returns {number} Credit cost
 */
function getToolCost(toolSlug) {
  return TOOL_COSTS[toolSlug] || DEFAULT_COST;
}

/**
 * Get all tool costs
 * @returns {object} Tool costs map
 */
function getAllToolCosts() {
  return { ...TOOL_COSTS };
}

/**
 * Check if tool exists in cost config
 * @param {string} toolSlug - Tool identifier
 * @returns {boolean}
 */
function hasToolCost(toolSlug) {
  return toolSlug in TOOL_COSTS;
}

module.exports = {
  TOOL_COSTS,
  DEFAULT_COST,
  getToolCost,
  getAllToolCosts,
  hasToolCost,
};