'use client';

import { useState, useCallback, useRef } from 'react';
import FileUploader from './FileUploader';
import FileList from './FileList';
import ProgressIndicator from './ProgressIndicator';
import { mergePDFs, downloadBlob, validatePDFFiles } from '@/services/pdfMergeService';

const PDFMergeUI = () => {
  // State
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle', 'uploading', 'processing', 'success', 'error'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  
  // Refs
  const abortControllerRef = useRef(null);

  // Handlers
  const handleFilesSelected = useCallback((newFiles) => {
    // Filter out duplicates by name and size
    const existingFiles = new Set(files.map(f => `${f.name}-${f.size}`));
    const uniqueNewFiles = newFiles.filter(
      file => !existingFiles.has(`${file.name}-${file.size}`)
    );

    if (uniqueNewFiles.length === 0) {
      setError('All selected files are already in the list');
      return;
    }

    // Validate new files
    const validation = validatePDFFiles(uniqueNewFiles);
    if (!validation.isValid) {
      setError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setFiles(prev => [...prev, ...uniqueNewFiles]);
    setError(null);
  }, [files]);

  const handleRemoveFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleReorderFiles = useCallback((fromIndex, toIndex) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  }, []);

  const handleFileClick = useCallback((index, file) => {
    // Preview file if it's a PDF
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      // Note: URL.revokeObjectURL should be called after window loads, but browser handles it
    }
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsMerging(true);
      setStatus('uploading');
      setError(null);
      setResult(null);
      setUploadProgress(0);

      const onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      // Merge PDFs
      const mergeResult = await mergePDFs(files, {
        onUploadProgress,
        signal: abortControllerRef.current.signal,
        timeout: 300000 // 5 minutes
      });

      setStatus('success');
      setResult(mergeResult);

      // Auto-download the merged PDF
      setTimeout(() => {
        downloadBlob(mergeResult.blob, mergeResult.filename);
      }, 500);

    } catch (err) {
      if (err.message === 'Request cancelled') {
        setStatus('cancelled');
        setError('Merge operation was cancelled');
      } else {
        setStatus('error');
        setError(err.message || 'Failed to merge PDFs');
      }
      console.error('PDF merge error:', err);
    } finally {
      setIsMerging(false);
      abortControllerRef.current = null;
    }
  }, [files]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('cancelled');
      setIsMerging(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setFiles([]);
    setUploadProgress(0);
    setStatus('idle');
    setError(null);
    setResult(null);
    setIsMerging(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (result) {
      downloadBlob(result.blob, result.filename);
    }
  }, [result]);

  const handleRetry = useCallback(() => {
    if (files.length >= 2) {
      handleMerge();
    }
  }, [files, handleMerge]);

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 100 * 1024 * 1024; // 100MB

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          PDF Merger Tool
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Merge multiple PDF files into a single document. Upload your PDFs, reorder them as needed, and download the merged result.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - File upload and list */}
        <div className="lg:col-span-2 space-y-6">
          {/* File upload section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Upload PDF Files
            </h2>
            <FileUploader
              onFilesSelected={handleFilesSelected}
              accept=".pdf"
              multiple={true}
              maxFiles={10}
              maxSize={20 * 1024 * 1024}
              disabled={isMerging}
              label="Select PDF files to merge"
              description="Drag & drop PDF files here or click to browse"
            />
          </div>

          {/* File list section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <FileList
              files={files}
              onRemoveFile={handleRemoveFile}
              onReorderFiles={handleReorderFiles}
              onFileClick={handleFileClick}
              removable={!isMerging}
              reorderable={!isMerging}
              showPreview={true}
            />
          </div>

          {/* Validation warnings */}
          {totalSize > maxTotalSize && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-medium text-yellow-800">Large File Size</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Total size exceeds 100MB. Merging may take longer and could fail due to server limits.
                    Consider compressing files before merging.
                  </p>
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && files.length < 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-800">Add More Files</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    You need at least 2 PDF files to merge. Add one more file to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Controls and progress */}
        <div className="space-y-6">
          {/* Progress indicator */}
          {(status === 'uploading' || status === 'processing' || status === 'success' || status === 'error' || status === 'cancelled') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <ProgressIndicator
                progress={uploadProgress}
                status={status}
                message={
                  status === 'uploading' ? `Uploading ${files.length} files...` :
                  status === 'processing' ? 'Merging PDFs...' :
                  status === 'success' ? 'PDFs merged successfully!' :
                  status === 'error' ? 'Merge failed' :
                  status === 'cancelled' ? 'Merge cancelled' :
                  'Ready to merge'
                }
                showDetails={true}
                showTimeEstimate={status === 'uploading' || status === 'processing'}
                indeterminate={status === 'processing'}
                size="large"
                variant="circular"
              />
            </div>
          )}

          {/* Action panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Merge Actions
            </h3>

            <div className="space-y-4">
              {/* File count and size summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Files</p>
                    <p className="text-2xl font-bold text-gray-900">{files.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Size</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(totalSize / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Files will be merged in the order shown.
                    {files.length >= 2 && ' Ready to merge!'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleMerge}
                  disabled={files.length < 2 || isMerging}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {isMerging ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Merging...
                    </span>
                  ) : (
                    `Merge ${files.length} PDF${files.length !== 1 ? 's' : ''}`
                  )}
                </button>

                {isMerging && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel Merge
                  </button>
                )}

                {(status === 'success' || status === 'error' || status === 'cancelled') && (
                  <>
                    {status === 'success' && (
                      <button
                        onClick={handleDownload}
                        className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        Download Merged PDF
                      </button>
                    )}

                    {(status === 'error' || status === 'cancelled') && (
                      <button
                        onClick={handleRetry}
                        className="w-full py-3 px-4 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                      >
                        Retry Merge
                      </button>
                    )}

                    <button
                      onClick={handleReset}
                      className="w-full py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Start Over
                    </button>
                  </>
                )}
              </div>

              {/* Status messages */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800">Error</h4>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {status === 'success' && result && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-green-800">Success!</h4>
                      <p className="text-green-700 text-sm mt-1">
                        PDFs merged successfully. File "{result.filename}" ({result.size} bytes) is ready.
                      </p>
                      <p className="text-green-600 text-xs mt-2">
                        If download doesn't start automatically, click the download button above.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Help panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              How to Use
            </h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start">
                <span className="inline-block w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-center mr-2 flex-shrink-0">1</span>
                Upload 2 or more PDF files using drag & drop or browse button
              </li>
              <li className="flex items-start">
                <span className="inline-block w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-center mr-2 flex-shrink-0">2</span>
                Reorder files by dragging them to desired merge order
              </li>
              <li className="flex items-start">
                <span className="inline-block w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-center mr-2 flex-shrink-0">3</span>
                Click "Merge PDFs" to combine files into a single PDF
              </li>
              <li className="flex items-start">
                <span className="inline-block w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-center mr-2 flex-shrink-0">4</span>
                Download the merged PDF when processing completes
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                <strong>Note:</strong> Maximum 10 files, 20MB each. Total size should not exceed 100MB for best results.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          This tool uses secure server-side processing. Your files are not stored permanently and are deleted after processing.
        </p>
        <p className="mt-1">
          Need help? Check the documentation or contact support.
        </p>
      </div>
    </div>
  );
};

export default PDFMergeUI;