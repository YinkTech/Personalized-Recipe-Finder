import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';

const Error = ({ error, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <FaExclamationTriangle className="text-red-500 text-6xl" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Oops! Something went wrong</h1>
        
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-left">
          <p className="text-red-700">
            {error || "We encountered an unexpected error. Please try again later."}
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          {resetError && (
            <button
              onClick={resetError}
              className="btn-primary w-full"
            >
              Try Again
            </button>
          )}
          
          <Link to="/" className="btn-secondary w-full flex items-center justify-center">
            <FaHome className="mr-2" />
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Error; 