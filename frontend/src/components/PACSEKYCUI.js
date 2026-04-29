'use strict';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, CreditCard, FileCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const PACSEKYCUI = ({ onSubmit, loading, result, error }) => {
  const [ekycForm, setEkycForm] = useState(null);
  const [aadhaarCard, setAadhaarCard] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);
  const [dragActive, setDragActive] = useState(null);

  const handleDrag = useCallback((e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(setter);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  }, []);

  const handleDrop = useCallback((e, setter, name) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file, setter, name);
    }
  }, []);

  const handleFileChange = useCallback((e, setter, name) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0], setter, name);
    }
  }, []);

  const validateAndSetFile = (file, setter, name) => {
    const validTypes = {
      ekycForm: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      aadhaarCard: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      identityProof: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    };

    if (validTypes[name] && !validTypes[name].includes(file.type)) {
      alert(`Invalid file type for ${name}. Accepted: ${validTypes[name].join(', ')}`);
      return;
    }
    setter(file);
  };

  const handleSubmit = () => {
    if (!ekycForm || !aadhaarCard) {
      alert('eKYC Form and Aadhaar Card are required');
      return;
    }

    const formData = new FormData();
    formData.append('ekycForm', ekycForm);
    formData.append('aadhaarCard', aadhaarCard);
    if (identityProof) {
      formData.append('identityProof', identityProof);
    }

    onSubmit(formData);
  };

  const FileUploadBox = ({ label, icon: Icon, file, setter, name, required, accept }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {required && <span className="text-red-500">* </span>}
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive === setter
            ? 'border-blue-500 bg-blue-50'
            : file
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={(e) => handleDrag(e, setter)}
        onDragLeave={(e) => handleDrag(e, null)}
        onDragOver={(e) => handleDrag(e, setter)}
        onDrop={(e) => handleDrop(e, setter, name)}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => setter(null)}
              className="ml-4 text-sm text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <Icon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">Drag & drop or click to upload</p>
            <input
              type="file"
              accept={accept || '.pdf,.jpg,.jpeg,.png'}
              onChange={(e) => handleFileChange(e, setter, name)}
              className="hidden"
              id={`file-${name}`}
            />
            <label
              htmlFor={`file-${name}`}
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Choose File
            </label>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">PACS eKYC Tool</h2>
        <p className="text-sm text-gray-600 mt-1">
          Upload eKYC documents to create a compressed PDF (max 250KB)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <FileUploadBox
          label="eKYC Form"
          icon={FileText}
          file={ekycForm}
          setter={setEkycForm}
          name="ekycForm"
          required
          accept=".pdf,.jpg,.jpeg,.png"
        />

        <FileUploadBox
          label="Aadhaar Card"
          icon={CreditCard}
          file={aadhaarCard}
          setter={setAadhaarCard}
          name="aadhaarCard"
          required
          accept=".jpg,.jpeg,.png,.pdf"
        />

        <FileUploadBox
          label="Identity Proof (Optional)"
          icon={FileCheck}
          file={identityProof}
          setter={setIdentityProof}
          name="identityProof"
          required={false}
          accept=".jpg,.jpeg,.png,.pdf"
        />

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Processing Details:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Aadhaar card will be preprocessed (grayscale, resized to 800px max)</li>
            <li>• All documents merged into A4 PDF</li>
            <li>• Smart compression to achieve ≤250KB target</li>
            <li>• eKYC form readability preserved</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !ekycForm || !aadhaarCard}
          className={`mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            loading || !ekycForm || !aadhaarCard
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Generate eKYC PDF'
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {result && result.success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h4 className="font-medium text-green-900">Success!</h4>
              <p className="text-sm text-green-700">
                PDF generated ({result.data.fileSizeKB} KB)
              </p>
            </div>
          </div>
          <a
            href={result.data.fileUrl}
            download
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default PACSEKYCUI;