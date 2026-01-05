import React from 'react';

interface UserFacingError {
  title: string;
  message: string;
  reason: string;
  suggestion: string;
  category: string;
  related_block_id?: string;
}

interface ErrorDisplayProps {
  error: UserFacingError;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, className = '' }) => {
  return (
    <div className={`bg-gray-50 dark:bg-gray-900 border-l-4 border-amber-600 p-4 rounded-r ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {error.title}
          </h3>
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            <p className="mb-2">{error.message}</p>
            
            <div className="mt-3 space-y-2 text-gray-600 dark:text-gray-400">
              <div className="flex items-start">
                <span className="font-medium mr-2 text-gray-900 dark:text-gray-200">Why:</span>
                <span className="flex-1">{error.reason}</span>
              </div>
              
              <div className="flex items-start">
                <span className="font-medium mr-2 text-gray-900 dark:text-gray-200">Try:</span>
                <span className="flex-1">{error.suggestion}</span>
              </div>
            </div>
            
            {error.related_block_id && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Block: {error.related_block_id}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
