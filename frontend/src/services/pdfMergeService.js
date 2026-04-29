import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/tools`
  : '/api/tools';

const PDF_MERGE_SLUG = 'pdf-merge';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_COUNT = 10;
const REQUEST_TIMEOUT = 300000; // 5 minutes for large files

/**
 * Validates PDF files before upload
 * @param {File[]} files - Array of File objects
 * @returns {Object} Validation result with isValid and errors
 */
export const validatePDFFiles = (files) => {
  const errors = [];

  if (!files || files.length === 0) {
    errors.push('At least one PDF file is required');
    return { isValid: false, errors };
  }

  if (files.length > MAX_FILE_COUNT) {
    errors.push(`Maximum ${MAX_FILE_COUNT} files allowed`);
  }

  files.forEach((file, index) => {
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push(`File "${file.name}" is not a PDF`);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" exceeds 20MB limit`);
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push(`File "${file.name}" is empty`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Creates FormData with files for upload
 * @param {File[]} files - Array of File objects
 * @returns {FormData} FormData instance
 */
export const createMergeFormData = (files) => {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append('files', file);
  });

  // Add options if needed
  const options = {
    timestamp: new Date().toISOString(),
    fileCount: files.length
  };
  formData.append('options', JSON.stringify(options));

  return formData;
};

/**
 * Merges PDF files using the backend API
 * @param {File[]} files - Array of PDF files to merge
 * @param {Object} options - Configuration options
 * @param {Function} options.onUploadProgress - Progress callback
 * @param {Function} options.onDownloadProgress - Download progress callback
 * @param {number} options.timeout - Request timeout in ms
 * @param {AbortSignal} options.signal - Abort signal for cancellation
 * @returns {Promise<Object>} Response data with merged PDF
 */
export const mergePDFs = async (files, options = {}) => {
  const {
    onUploadProgress,
    onDownloadProgress,
    timeout = REQUEST_TIMEOUT,
    signal = null
  } = options;

  // Validate files
  const validation = validatePDFFiles(files);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Create FormData
  const formData = createMergeFormData(files);

  // Configure request
  const config = {
    timeout,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob', // Expect binary response
    onUploadProgress,
    onDownloadProgress,
    signal
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}/${PDF_MERGE_SLUG}`,
      formData,
      config
    );

    // Extract filename from response headers or generate one
    const contentDisposition = response.headers['content-disposition'];
    let filename = `merged-${Date.now()}.pdf`;
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    return {
      blob: response.data,
      filename,
      contentType: response.headers['content-type'] || 'application/pdf',
      size: response.data.size,
      status: response.status
    };
  } catch (error) {
    // Handle specific error types
    if (axios.isCancel(error)) {
      throw new Error('Request cancelled');
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again with smaller files');
    }

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 413) {
        throw new Error('File size too large - please reduce file sizes');
      }
      
      if (status === 415) {
        throw new Error('Invalid file type - only PDF files are allowed');
      }
      
      if (status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      }

      // Try to extract error message from response
      let errorMessage = `Server error (${status})`;
      if (data && typeof data === 'object') {
        errorMessage = data.error || data.message || errorMessage;
      } else if (typeof data === 'string') {
        errorMessage = data;
      }
      
      throw new Error(errorMessage);
    } else if (error.request) {
      // No response received
      throw new Error('Network error - please check your connection');
    } else {
      // Request setup error
      throw new Error(`Request failed: ${error.message}`);
    }
  }
};

/**
 * Downloads a blob as a file
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Name for the downloaded file
 */
export const downloadBlob = (blob, filename) => {
  // Create object URL
  const url = URL.createObjectURL(blob);
  
  // Create temporary link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Converts file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Human readable size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Extracts file icon based on file type
 * @param {File} file - File object
 * @returns {string} Icon SVG or emoji
 */
export const getFileIcon = (file) => {
  if (file.type === 'application/pdf') {
    return '📄';
  }
  return '📎';
};

export default {
  validatePDFFiles,
  createMergeFormData,
  mergePDFs,
  downloadBlob,
  formatFileSize,
  getFileIcon
};