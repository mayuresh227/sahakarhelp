import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/tools`
  : '/api/tools';

export const getActiveTools = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return [];
  }
};

export const getToolConfig = async (slug) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${slug}/config`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tool config:', error);
    return null;
  }
};

export const executeTool = async (slug, inputs, options = {}) => {
  try {
    const config = {};
    if (options.onUploadProgress) {
      config.onUploadProgress = options.onUploadProgress;
    }
    const response = await axios.post(`${API_BASE_URL}/${slug}`, inputs, config);
    return response.data;
  } catch (error) {
    console.error('Tool execution failed:', error);
    throw error;
  }
};