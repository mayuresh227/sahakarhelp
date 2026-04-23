'use client';

import { useState, useEffect } from 'react';
import { executeTool } from '@/services/toolService';

const PDFToolUI = ({ config, onSubmit, result: initialResult }) => {
    const [formData, setFormData] = useState({});
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(initialResult || null);
    const [error, setError] = useState(null);
    const [recentFiles, setRecentFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);

    // Initialize form data based on config inputs
    useEffect(() => {
        const initialData = {};
        const initialFiles = {};
        
        config.inputs.forEach(input => {
            if (input.type === 'file') {
                initialFiles[input.name] = input.multiple ? [] : null;
            } else {
                initialData[input.name] = input.default || '';
            }
        });
        
        setFormData(initialData);
        setFiles(initialFiles);
        
        // Load recent files from localStorage
        const saved = localStorage.getItem('pdfToolsRecentFiles');
        if (saved) {
            try {
                setRecentFiles(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent files:', e);
            }
        }
    }, [config]);

    const handleInputChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (name, fileList, isMultiple) => {
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        
        // Validate file sizes
        const filesArray = Array.from(fileList);
        const oversizedFiles = filesArray.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            setError(`File size exceeds 20MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }
        
        const newFiles = isMultiple ? filesArray : fileList[0];
        setFiles(prev => ({
            ...prev,
            [name]: newFiles
        }));

        // Add to recent files
        if (newFiles) {
            const filesToAdd = isMultiple ? newFiles : [newFiles];
            const newRecent = [...recentFiles];
            
            filesToAdd.forEach(file => {
                const fileInfo = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastUsed: new Date().toISOString()
                };
                
                // Remove if already exists
                const existingIndex = newRecent.findIndex(f => f.name === file.name && f.size === file.size);
                if (existingIndex >= 0) {
                    newRecent.splice(existingIndex, 1);
                }
                
                newRecent.unshift(fileInfo);
            });
            
            // Keep only last 10 files
            const trimmed = newRecent.slice(0, 10);
            setRecentFiles(trimmed);
            localStorage.setItem('pdfToolsRecentFiles', JSON.stringify(trimmed));
        }
        
        // Clear any previous errors
        if (error && error.includes('File size exceeds')) {
            setError(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (name, e, isMultiple) => {
        e.preventDefault();
        setDragOver(false);
        handleFileChange(name, e.dataTransfer.files, isMultiple);
    };

    const validateForm = () => {
        for (const input of config.inputs) {
            if (input.required) {
                if (input.type === 'file') {
                    const fileValue = files[input.name];
                    if (input.multiple) {
                        if (!fileValue || fileValue.length === 0) {
                            return `${input.label} is required`;
                        }
                    } else {
                        if (!fileValue) {
                            return `${input.label} is required`;
                        }
                    }
                } else {
                    if (!formData[input.name] && formData[input.name] !== 0) {
                        return `${input.label} is required`;
                    }
                }
            }
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Prepare FormData
            const formDataToSend = new FormData();
            
            // Add files
            Object.entries(files).forEach(([name, fileValue]) => {
                if (fileValue) {
                    if (Array.isArray(fileValue)) {
                        fileValue.forEach(file => {
                            formDataToSend.append(name, file);
                        });
                    } else {
                        formDataToSend.append(name, fileValue);
                    }
                }
            });

            // Add other form data as JSON
            const options = { ...formData };
            formDataToSend.append('options', JSON.stringify(options));

            // Call the API with progress tracking
            setUploadProgress(10);
            const response = await executeTool(config.slug, formDataToSend, {
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });
            setUploadProgress(100);
            setResult(response);
            
            if (onSubmit) {
                onSubmit(response);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Operation failed');
        } finally {
            setLoading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const downloadResult = () => {
        if (!result || !result.result) return;
        
        const { result: base64Data, format, fileName } = result;
        const mimeType = format === 'pdf' ? 'application/pdf' : 
                        format === 'zip' ? 'application/zip' : 
                        'application/octet-stream';
        
        const defaultName = `result-${config.slug}-${Date.now()}.${format}`;
        const finalFileName = fileName || defaultName;
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = finalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const renderInput = (input) => {
        const { name, type, label, required, placeholder, options, multiple, accept, min, max, step } = input;
        const value = formData[name] || '';
        const fileValue = files[name];

        switch (type) {
            case 'file':
                const isMultiple = multiple || false;
                const fileCount = isMultiple && fileValue ? fileValue.length : (fileValue ? 1 : 0);
                
                return (
                    <div key={name} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(name, e, isMultiple)}
                        >
                            <input
                                type="file"
                                id={name}
                                multiple={isMultiple}
                                accept={accept || '.pdf'}
                                onChange={(e) => handleFileChange(name, e.target.files, isMultiple)}
                                className="hidden"
                            />
                            <label htmlFor={name} className="cursor-pointer">
                                <div className="space-y-2">
                                    <div className="text-gray-600">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-blue-600 hover:text-blue-800 font-medium">
                                            Click to upload
                                        </span>
                                        <span className="text-gray-500"> or drag and drop</span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {accept ? `Supported: ${accept}` : 'PDF files only'}
                                    </p>
                                </div>
                            </label>
                            
                            {fileCount > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600">
                                        {isMultiple ? `${fileCount} file(s) selected` : fileValue.name}
                                    </p>
                                    {isMultiple && fileValue.map((file, idx) => (
                                        <div key={idx} className="text-xs text-gray-500 truncate">
                                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {recentFiles.length > 0 && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Recent files:</p>
                                <div className="flex flex-wrap gap-1">
                                    {recentFiles.slice(0, 3).map((file, idx) => (
                                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'select':
                return (
                    <div key={name} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            value={value}
                            onChange={(e) => handleInputChange(name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {options.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'number':
                return (
                    <div key={name} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => handleInputChange(name, e.target.value)}
                            min={min}
                            max={max}
                            step={step}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                );

            case 'text':
            case 'password':
                return (
                    <div key={name} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type={type}
                            value={value}
                            onChange={(e) => handleInputChange(name, e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                );

            case 'textarea':
                return (
                    <div key={name} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {label} {required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={value}
                            onChange={(e) => handleInputChange(name, e.target.value)}
                            placeholder={placeholder}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {config.inputs.map(input => renderInput(input))}
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Max file size: 20MB per file
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            `Process ${config.name}`
                        )}
                    </button>
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </form>

            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => setError(null)}
                                    className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        // Optionally retry last operation (could be implemented later)
                                    }}
                                    className="px-3 py-1 bg-white text-red-700 text-sm font-medium rounded-md border border-red-300 hover:bg-red-50"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {result && (
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-green-800">Success!</h3>
                            <p className="text-sm text-green-600 mt-1">
                                Operation completed successfully. Your {result.format.toUpperCase()} file is ready.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {showPreview ? 'Hide Preview' : 'Preview'}
                            </button>
                            <button
                                onClick={downloadResult}
                                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download {result.format.toUpperCase()}
                            </button>
                        </div>
                    </div>

                    {showPreview && (
                        <div className="mt-6 p-4 bg-white border border-gray-300 rounded-md">
                            <h4 className="font-medium text-gray-800 mb-2">Preview</h4>
                            {result.format === 'pdf' && (
                                <iframe
                                    src={`data:application/pdf;base64,${result.result}`}
                                    className="w-full h-96 border-0"
                                    title="PDF Preview"
                                />
                            )}
                            {(result.format === 'jpg' || result.format === 'png') && (
                                <img
                                    src={`data:image/${result.format};base64,${result.result}`}
                                    alt="Preview"
                                    className="max-w-full h-auto max-h-96 mx-auto"
                                />
                            )}
                            {result.format === 'zip' && (
                                <p className="text-gray-600">ZIP file cannot be previewed directly. Download and extract to view contents.</p>
                            )}
                            {result.format === 'json' && (
                                <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                    
                    {result.format === 'zip' && (
                        <div className="mt-4 p-3 bg-green-100 rounded">
                            <p className="text-sm text-green-800">
                                <strong>Note:</strong> Multiple files have been packaged into a ZIP archive. Extract the ZIP to access individual files.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PDFToolUI;