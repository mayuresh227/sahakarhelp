import { useState } from 'react';
import axios from 'axios';

const ImageToolUI = ({ config, onSubmit }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('image', file);
      
      // Add other inputs
      Object.entries(config.config.inputs).forEach(([name, field]) => {
        if (name !== 'image') {
          const input = e.target.elements[name];
          if (input) formData.append(name, input.value);
        }
      });
      
      const response = await axios.post(`/api/tools/${config.slug}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${result.result}`;
    link.download = `result-${config.slug}.jpg`;
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.config.inputs.find(i => i.name === 'image')?.label || 'Image'}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        {config.config.inputs
          .filter(input => input.name !== 'image')
          .map(input => (
            <div key={input.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {input.label}
              </label>
              {input.type === 'select' ? (
                <select
                  name={input.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {input.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={input.type}
                  name={input.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={input.min}
                  max={input.max}
                />
              )}
            </div>
          ))}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Process Image'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Result</h3>
            <button
              onClick={downloadResult}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download Result
            </button>
          </div>
          
          <div className="mt-4">
            <img 
              src={`data:image/jpeg;base64,${result.result}`} 
              alt="Processed result"
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageToolUI;