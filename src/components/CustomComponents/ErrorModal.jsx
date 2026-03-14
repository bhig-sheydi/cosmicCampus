import React from 'react';

const ErrorModal = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold text-red-600 mb-2">Submission Error</h2>
        <p className="text-gray-800 dark:text-gray-200">{error}</p>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;