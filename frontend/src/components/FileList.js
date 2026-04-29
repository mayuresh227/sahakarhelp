'use client';

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { formatFileSize, getFileIcon } from '@/services/pdfMergeService';

const FileList = ({
  files,
  onRemoveFile,
  onReorderFiles,
  onFileClick,
  removable = true,
  reorderable = true,
  showPreview = true,
  maxPreviewSize = 5 * 1024 * 1024, // 5MB
  className = ''
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = useCallback((e, index) => {
    if (!reorderable) return;
    
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
    e.currentTarget.classList.add('opacity-50');
  }, [reorderable]);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (!reorderable) return;
    
    setDragOverIndex(index);
  }, [reorderable]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (!reorderable || draggedIndex === null) return;
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex && onReorderFiles) {
      onReorderFiles(dragIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [reorderable, draggedIndex, onReorderFiles]);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleRemove = useCallback((index, e) => {
    e.stopPropagation();
    if (onRemoveFile) {
      onRemoveFile(index);
    }
  }, [onRemoveFile]);

  const handleFileClick = useCallback((index, file) => {
    if (onFileClick) {
      onFileClick(index, file);
    }
  }, [onFileClick]);

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg
          className="w-12 h-12 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2">No files selected</p>
        <p className="text-sm">Upload PDF files to get started</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Selected Files ({files.length})
        </h3>
        {reorderable && (
          <p className="text-sm text-gray-500">
            Drag to reorder • Click to preview
          </p>
        )}
      </div>

      <div className="space-y-2">
        {files.map((file, index) => {
          const isDragged = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const canPreview = showPreview && file.type === 'application/pdf' && file.size <= maxPreviewSize;
          
          return (
            <div
              key={`${file.name}-${file.size}-${index}`}
              draggable={reorderable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleFileClick(index, file)}
              className={`flex items-center p-4 bg-white border rounded-lg transition-all duration-200 cursor-pointer group ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 border-2'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              } ${isDragged ? 'opacity-50' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`File ${index + 1}: ${file.name}, ${formatFileSize(file.size)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFileClick(index, file);
                }
                if (e.key === 'Delete' && removable) {
                  e.preventDefault();
                  handleRemove(index, e);
                }
              }}
            >
              {/* Drag handle */}
              {reorderable && (
                <div className="mr-3 text-gray-400 hover:text-gray-600">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
              )}

              {/* File icon */}
              <div className="mr-4 text-2xl">
                {getFileIcon(file)}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">
                    {file.name}
                  </h4>
                  <span className="text-sm text-gray-500 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                
                <div className="flex items-center mt-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    PDF
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {file.type}
                  </span>
                  {canPreview && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded ml-2">
                      Preview available
                    </span>
                  )}
                </div>

                {/* Progress bar for uploads if needed */}
                {file.uploadProgress !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Uploading: {file.uploadProgress}%
                    </div>
                  </div>
                )}
              </div>

              {/* File actions */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Order indicator */}
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-full">
                  {index + 1}
                </div>

                {/* Remove button */}
                {removable && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(index, e)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Total files: <span className="font-semibold">{files.length}</span>
            </p>
            <p className="text-sm text-gray-600">
              Total size: <span className="font-semibold">
                {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
              </span>
            </p>
          </div>
          
          {reorderable && (
            <div className="text-sm text-gray-500">
              <p>Files will be merged in the order shown above</p>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-500 mt-2">
        <p>
          <span className="font-medium">Tip:</span>{' '}
          Use <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Delete</kbd> to remove files •{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to preview •{' '}
          Drag and drop to reorder
        </p>
      </div>
    </div>
  );
};

FileList.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      size: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      uploadProgress: PropTypes.number
    })
  ).isRequired,
  onRemoveFile: PropTypes.func,
  onReorderFiles: PropTypes.func,
  onFileClick: PropTypes.func,
  removable: PropTypes.bool,
  reorderable: PropTypes.bool,
  showPreview: PropTypes.bool,
  maxPreviewSize: PropTypes.number,
  className: PropTypes.string
};

export default FileList;