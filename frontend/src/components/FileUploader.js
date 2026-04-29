'use client';

import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

const FileUploader = ({
  onFilesSelected,
  accept = '.pdf',
  multiple = true,
  maxFiles = 10,
  maxSize = 20 * 1024 * 1024, // 20MB
  disabled = false,
  label = 'Upload PDF files',
  description = 'Drag & drop PDF files here or click to browse',
  validationRules = {}
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    const errors = [];

    // Check file count
    if (!multiple && fileArray.length > 1) {
      errors.push('Only one file is allowed');
    }

    if (fileArray.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
    }

    // Check each file
    fileArray.forEach((file, index) => {
      // Check file type
      if (accept && !accept.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`"${file.name}" is not a PDF file`);
      }

      // Check file size
      if (file.size > maxSize) {
        const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
        errors.push(`"${file.name}" exceeds ${sizeInMB}MB limit`);
      }

      // Custom validation rules
      if (validationRules.customValidator) {
        const customError = validationRules.customValidator(file, index);
        if (customError) {
          errors.push(customError);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [accept, multiple, maxFiles, maxSize, validationRules]);

  const handleFiles = useCallback((files) => {
    const validation = validateFiles(files);
    
    if (validation.isValid) {
      setValidationError(null);
      onFilesSelected(Array.from(files));
    } else {
      setValidationError(validation.errors.join(', '));
    }
  }, [validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  }, [handleFiles]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const getAcceptString = useCallback(() => {
    if (accept === '.pdf' || accept === 'application/pdf') {
      return '.pdf';
    }
    return accept;
  }, [accept]);

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
          aria-hidden="true"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-blue-100 rounded-full">
              <svg
                className="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {label}
            </h3>
            <p className="text-gray-600">
              {description}
            </p>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>Supported: {getAcceptString() || 'All files'}</p>
            <p>Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB per file</p>
            {multiple && <p>Max files: {maxFiles}</p>}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            disabled={disabled}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Browse Files
          </button>
        </div>

        {dragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <p className="text-blue-700 font-medium">Drop files here</p>
            </div>
          </div>
        )}
      </div>

      {validationError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-800 font-medium">Validation Error</p>
              <p className="text-red-700 text-sm mt-1">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p className="font-medium">Tips:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Ensure PDF files are not password protected</li>
          <li>Files will be merged in the order they are selected</li>
          <li>You can reorder files after uploading</li>
          <li>Maximum total size: 100MB for all files combined</li>
        </ul>
      </div>
    </div>
  );
};

FileUploader.propTypes = {
  onFilesSelected: PropTypes.func.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  maxFiles: PropTypes.number,
  maxSize: PropTypes.number,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  description: PropTypes.string,
  validationRules: PropTypes.shape({
    customValidator: PropTypes.func
  })
};

export default FileUploader;