'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ImageCropperUI = ({ config, onSubmit, result }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cropType, setCropType] = useState('custom');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        
        // Set default crop dimensions for square/circle
        if (cropType === 'square' || cropType === 'circle') {
          const size = Math.min(img.width, img.height);
          setWidth(size.toString());
          setHeight(size.toString());
          setX(Math.floor((img.width - size) / 2).toString());
          setY(Math.floor((img.height - size) / 2).toString());
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
  };
  
  const handleCropTypeChange = (e) => {
    const newCropType = e.target.value;
    setCropType(newCropType);
    
    if (preview && (newCropType === 'square' || newCropType === 'circle')) {
      const size = Math.min(imageDimensions.width, imageDimensions.height);
      setWidth(size.toString());
      setHeight(size.toString());
      setX(Math.floor((imageDimensions.width - size) / 2).toString());
      setY(Math.floor((imageDimensions.height - size) / 2).toString());
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file');
      return;
    }
    
    if (cropType === 'custom' && (!width || !height)) {
      setError('Width and height are required for custom crop');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('cropType', cropType);
      
      if (width) formData.append('width', width);
      if (height) formData.append('height', height);
      if (x) formData.append('x', x);
      if (y) formData.append('y', y);
      
      const response = await axios.post(`/api/tools/${config.slug}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onSubmit(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadResult = () => {
    if (!result?.croppedImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${result.croppedImage}`;
    link.download = `cropped-image-${Date.now()}.jpg`;
    link.click();
  };
  
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setCropType('custom');
    setWidth('');
    setHeight('');
    setX('');
    setY('');
    setError(null);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Image
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">Supports JPG, PNG, WEBP</p>
        </div>
        
        {/* Image Preview */}
        {preview && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="border rounded-md p-2 bg-gray-50">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-w-full h-auto max-h-64 mx-auto"
                ref={imageRef}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Original dimensions: {imageDimensions.width} × {imageDimensions.height} pixels
              </p>
            </div>
          </div>
        )}
        
        {/* Crop Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Crop Options</h3>
            
            {/* Crop Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crop Type
              </label>
              <select
                value={cropType}
                onChange={handleCropTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="custom">Custom Crop</option>
                <option value="square">Square (1:1)</option>
                <option value="circle">Circle (Profile Picture)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {cropType === 'custom' && 'Specify exact dimensions and position'}
                {cropType === 'square' && 'Automatically crops to square from center'}
                {cropType === 'circle' && 'Creates circular crop with transparent background'}
              </p>
            </div>
            
            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                  disabled={cropType === 'square' || cropType === 'circle'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                  disabled={cropType === 'square' || cropType === 'circle'}
                />
              </div>
            </div>
            
            {/* Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X Position (px)
                </label>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  disabled={cropType === 'square' || cropType === 'circle'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y Position (px)
                </label>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  disabled={cropType === 'square' || cropType === 'circle'}
                />
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">How to use:</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Upload an image using the file selector</li>
              <li>• Choose your crop type:
                <ul className="ml-4 mt-1">
                  <li>- <strong>Custom</strong>: Specify exact width, height, and position</li>
                  <li>- <strong>Square</strong>: Automatically crops to 1:1 aspect ratio</li>
                  <li>- <strong>Circle</strong>: Creates a circular profile picture</li>
                </ul>
              </li>
              <li>• For square/circle crops, the tool will automatically calculate the largest possible square from the center</li>
              <li>• Click "Crop Image" to process</li>
              <li>• Download the result when complete</li>
            </ul>
            
            {preview && (
              <div className="mt-4 p-3 bg-blue-100 rounded">
                <p className="text-sm font-medium text-blue-800">Current Settings:</p>
                <p className="text-xs text-blue-700 mt-1">
                  Crop: {cropType} | Size: {width || 'auto'} × {height || 'auto'} | Position: ({x || '0'}, {y || '0'})
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !file}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Crop Image'}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
          
          {result?.croppedImage && (
            <button
              type="button"
              onClick={downloadResult}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download Result
            </button>
          )}
        </div>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Result Display */}
      {result?.croppedImage && (
        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Cropped Result</h3>
            <button
              onClick={downloadResult}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download Image
            </button>
          </div>
          
          <div className="border rounded-md p-4 bg-gray-50">
            <img 
              src={`data:image/jpeg;base64,${result.croppedImage}`} 
              alt="Cropped result"
              className="max-w-full h-auto mx-auto max-h-96"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              {cropType === 'circle' ? 'Circular crop with transparent background' : 'Cropped image'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropperUI;