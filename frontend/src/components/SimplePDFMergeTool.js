import { useState } from 'react';
import { mergePDFs, downloadBlob, validatePDFFiles } from '@/services/pdfMergeService';

const SimplePDFMergeTool = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError(null);
    
    // Validate files
    const validation = validatePDFFiles(selectedFiles);
    if (!validation.isValid) {
      setError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    
    setFiles(selectedFiles);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await mergePDFs(files);
      
      // Auto-download the merged PDF
      downloadBlob(result.blob, result.filename);
      
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to merge PDFs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Simple PDF Merger</h2>
      
      {/* File Input */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Select PDF Files (2+)</label>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          disabled={isLoading}
          className="w-full border border-gray-300 rounded-md p-3"
        />
      </div>

      {/* File Count */}
      {files.length > 0 && (
        <div className="mb-4 text-center">
          <p className="text-gray-600">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          PDFs merged successfully! Download should start automatically.
        </div>
      )}

      {/* Merge Button */}
      <button
        onClick={handleMerge}
        disabled={files.length < 2 || isLoading}
        className={`w-full py-3 px-4 bg-${
          files.length < 2 || isLoading ? 'gray-400' : 'blue-600'
        } text-white font-medium rounded-md hover:bg-${
          files.length < 2 || isLoading ? 'gray-300' : 'blue-700'
        } disabled:cursor-not-allowed transition-colors`}
      >
        {isLoading ? 'Merging...' : 'Merge PDFs'}
      </button>

      {/* Reset Button */}
      {files.length > 0 && (
        <button
          onClick={handleReset}
          className="mt-3 w-full py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300"
        >
          Reset
        </button>
      )}
    </div>
  );
};

export default SimplePDFMergeTool;