/**
 * API Utility for SahakarHelp Backend
 * Base URL: https://sahakarhelp-production.up.railway.app
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sahakarhelp-production.up.railway.app';

/**
 * Helper to construct full API URL
 */
export function getApiUrl(endpoint) {
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    // Provide a user-friendly error message
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
    }
    throw error;
  }
}

/**
 * Test API connection
 * GET /api/test
 */
export async function getTest() {
  return fetchAPI('/api/test');
}

/**
 * Get all tools
 * GET /api/tools
 */
export async function getTools() {
  return fetchAPI('/api/tools');
}

/**
 * Get tool configuration
 * GET /api/tools/:slug/config
 */
export async function getToolConfig(slug) {
  return fetchAPI(`/api/tools/${slug}/config`);
}

/**
 * Execute a tool
 * POST /api/tools/:slug
 */
export async function executeTool(slug, inputs) {
  return fetchAPI(`/api/tools/${slug}`, {
    method: 'POST',
    body: JSON.stringify(inputs),
  });
}

/**
 * Create an invoice
 * POST /api/invoice
 */
export async function createInvoice(data) {
  return fetchAPI('/api/invoice', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get invoice history
 * GET /api/invoice/history
 */
export async function getInvoiceHistory() {
  return fetchAPI('/api/invoice/history');
}

export default {
  getTest,
  getTools,
  getToolConfig,
  executeTool,
  createInvoice,
  getInvoiceHistory,
};