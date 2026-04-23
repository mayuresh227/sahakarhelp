'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToolConfig, executeTool } from '@/services/toolService';
import CalculatorUI from './CalculatorUI';
import PDFToolUI from './PDFToolUI';
import ResumeGeneratorUI from './ResumeGeneratorUI';
import ImageToolUI from './ImageToolUI';
import ImageCropperUI from './ImageCropperUI';
import GSTInvoiceUI from './GSTInvoiceUI';
import SatbaraHelperUI from './SatbaraHelperUI';

const ToolLoader = ({ slug }) => {
  const [toolConfig, setToolConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchToolConfig = async () => {
      try {
        setLoading(true);
        const config = await getToolConfig(slug);
        if (config) {
          setToolConfig(config);
        } else {
          setError({
            message: 'Failed to load tool configuration',
            type: 'generic'
          });
        }
      } catch (err) {
        const errorData = err.response?.data || {};
        setError({
          message: errorData.error || err.message || 'Failed to load tool',
          type: errorData.error === 'Upgrade required' ? 'upgrade' : 'generic',
          upgradeUrl: errorData.upgradeUrl,
          details: errorData.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchToolConfig();
  }, [slug]);

  const handleSubmit = async (inputs) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await executeTool(slug, inputs);
      setResult(result);
    } catch (err) {
      const errorData = err.response?.data || {};
      setError({
        message: errorData.error || err.message || 'Operation failed',
        type: errorData.error === 'Upgrade required' ? 'upgrade' : 'generic',
        upgradeUrl: errorData.upgradeUrl,
        details: errorData.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFSubmit = async (response) => {
    // For PDF tools, the component already executed the tool and returns the response
    setResult(response);
    setLoading(false);
  };

  if (loading) return <div className="p-4 text-center">Loading tool...</div>;
  if (error) {
    const isUpgrade = error.type === 'upgrade';
    const message = typeof error === 'string' ? error : error.message;
    const details = error.details;
    const upgradeUrl = error.upgradeUrl || '/dashboard/upgrade';
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className={`p-6 rounded-lg ${isUpgrade ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className={`text-lg font-semibold ${isUpgrade ? 'text-yellow-800' : 'text-red-800'}`}>
            {isUpgrade ? 'Upgrade Required' : 'Error'}
          </h3>
          <p className="mt-2 text-gray-700">{message}</p>
          {details && <p className="mt-1 text-sm text-gray-600">{details}</p>}
          {isUpgrade && (
            <div className="mt-4">
              <Link
                href={upgradeUrl}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700"
              >
                Upgrade to Pro
              </Link>
              <p className="mt-2 text-sm text-yellow-700">Upgrade to unlock this tool and many more features.</p>
            </div>
          )}
          {!isUpgrade && (
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{toolConfig.name}</h1>
      
      {/* Special handling for GST Invoice Generator */}
      {slug === 'gst-invoice-generator' && (
        <GSTInvoiceUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}

      {/* Special handling for 7/12 (Satbara) Helper */}
      {slug === 'satbara-helper' && (
        <SatbaraHelperUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}
      
      {slug !== 'gst-invoice-generator' && slug !== 'satbara-helper' && toolConfig.engineType === 'calculator' && (
        <CalculatorUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}
      
      {slug !== 'gst-invoice-generator' && toolConfig.engineType === 'pdf' && (
        <PDFToolUI
          config={toolConfig}
          onSubmit={handlePDFSubmit}
          result={result}
        />
      )}
      
      {slug !== 'gst-invoice-generator' && toolConfig.engineType === 'document' && (
        <ResumeGeneratorUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}
      
      {slug !== 'gst-invoice-generator' && toolConfig.engineType === 'image' && slug === 'image-cropper' && (
        <ImageCropperUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}
      
      {slug !== 'gst-invoice-generator' && toolConfig.engineType === 'image' && slug !== 'image-cropper' && (
        <ImageToolUI
          config={toolConfig}
          onSubmit={handleSubmit}
          result={result}
        />
      )}
    </div>
  );
};

export default ToolLoader;
