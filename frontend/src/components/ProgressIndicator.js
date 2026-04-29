'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ProgressIndicator = ({
  progress = 0,
  status = 'idle',
  message = '',
  showDetails = true,
  showTimeEstimate = true,
  indeterminate = false,
  size = 'medium',
  variant = 'linear',
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Update elapsed time every second when in progress
  useEffect(() => {
    let interval;
    if (status === 'uploading' || status === 'processing') {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startTime]);

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-purple-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'uploading':
        return 'Uploading files...';
      case 'processing':
        return 'Processing PDFs...';
      case 'success':
        return 'Complete!';
      case 'error':
        return 'Error occurred';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'success':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  const getTimeEstimate = () => {
    if (status !== 'uploading' && status !== 'processing') return null;
    if (progress <= 0) return 'Estimating time...';

    const remaining = 100 - progress;
    if (elapsedTime === 0) return 'Starting...';

    const estimatedTotalTime = (elapsedTime * 100) / progress;
    const estimatedRemaining = Math.max(0, estimatedTotalTime - elapsedTime);

    if (estimatedRemaining < 60) {
      return `About ${Math.ceil(estimatedRemaining)} seconds remaining`;
    } else {
      return `About ${Math.ceil(estimatedRemaining / 60)} minutes remaining`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'p-2',
          progressBar: 'h-1.5',
          text: 'text-xs'
        };
      case 'medium':
        return {
          container: 'p-4',
          progressBar: 'h-2.5',
          text: 'text-sm'
        };
      case 'large':
        return {
          container: 'p-6',
          progressBar: 'h-4',
          text: 'text-base'
        };
      default:
        return {
          container: 'p-4',
          progressBar: 'h-2.5',
          text: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === 'circular') {
    // Circular progress indicator
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="8"
              className="stroke-gray-200 fill-none"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="8"
              className={`${getStatusColor()} fill-none transition-all duration-300 ease-out`}
              strokeDasharray={circumference}
              strokeDashoffset={indeterminate ? circumference * 0.25 : strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {getStatusIcon() && (
                <div className="flex justify-center mb-1">
                  {getStatusIcon()}
                </div>
              )}
              <div className={`font-semibold ${sizeClasses.text}`}>
                {indeterminate ? '' : `${Math.round(progress)}%`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className={`font-medium ${sizeClasses.text}`}>
            {getStatusText()}
          </p>
          {message && (
            <p className={`text-gray-600 mt-1 ${sizeClasses.text}`}>
              {message}
            </p>
          )}
          {showTimeEstimate && getTimeEstimate() && (
            <p className={`text-gray-500 mt-1 ${sizeClasses.text}`}>
              {getTimeEstimate()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Linear progress indicator (default)
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${sizeClasses.container} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {getStatusIcon() && (
            <div className="mr-3">
              {getStatusIcon()}
            </div>
          )}
          <div>
            <h4 className={`font-semibold ${sizeClasses.text}`}>
              {getStatusText()}
            </h4>
            {showDetails && (
              <p className={`text-gray-600 ${sizeClasses.text}`}>
                {message || (indeterminate ? 'Processing...' : `${Math.round(progress)}% complete`)}
              </p>
            )}
          </div>
        </div>
        
        {!indeterminate && (
          <div className={`font-bold ${getStatusColor().replace('bg-', 'text-')} ${sizeClasses.text}`}>
            {Math.round(progress)}%
          </div>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`${getStatusColor()} ${sizeClasses.progressBar} rounded-full transition-all duration-300 ease-out ${
            indeterminate ? 'animate-pulse' : ''
          }`}
          style={{
            width: indeterminate ? '50%' : `${progress}%`,
            ...(indeterminate && {
              animation: 'indeterminate 1.5s infinite ease-in-out'
            })
          }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : progress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Progress: ${progress}%`}
        />
      </div>

      {showDetails && (
        <div className="mt-3 flex justify-between items-center">
          <div className={`text-gray-500 ${sizeClasses.text}`}>
            {elapsedTime > 0 && `Elapsed: ${elapsedTime}s`}
          </div>
          
          {showTimeEstimate && getTimeEstimate() && (
            <div className={`text-gray-600 ${sizeClasses.text}`}>
              {getTimeEstimate()}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

ProgressIndicator.propTypes = {
  progress: PropTypes.number,
  status: PropTypes.oneOf(['idle', 'uploading', 'processing', 'success', 'error', 'cancelled']),
  message: PropTypes.string,
  showDetails: PropTypes.bool,
  showTimeEstimate: PropTypes.bool,
  indeterminate: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['linear', 'circular']),
  className: PropTypes.string
};

ProgressIndicator.defaultProps = {
  progress: 0,
  status: 'idle',
  message: '',
  showDetails: true,
  showTimeEstimate: true,
  indeterminate: false,
  size: 'medium',
  variant: 'linear',
  className: ''
};

export default ProgressIndicator;