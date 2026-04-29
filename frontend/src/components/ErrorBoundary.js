'use client';

import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to external service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleRetry = () => {
    this.handleReset();
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset,
          retry: this.handleRetry
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                {this.props.message || 'An unexpected error occurred while rendering this component.'}
              </p>
              
              {this.props.showDetails && this.state.error && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                  <h3 className="font-semibold text-gray-800 mb-2">Error Details</h3>
                  <pre className="text-sm text-gray-700 overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset
              </button>
              {this.props.showReport && (
                <button
                  onClick={() => window.location.href = '/support'}
                  className="px-6 py-3 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Report Issue
                </button>
              )}
            </div>

            {this.props.showHomeLink && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href="/"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Return to Home
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  message: PropTypes.string,
  showDetails: PropTypes.bool,
  showReport: PropTypes.bool,
  showHomeLink: PropTypes.bool,
  onError: PropTypes.func,
  onReset: PropTypes.func,
  onRetry: PropTypes.func
};

ErrorBoundary.defaultProps = {
  message: '',
  showDetails: false,
  showReport: true,
  showHomeLink: true
};

export default ErrorBoundary;