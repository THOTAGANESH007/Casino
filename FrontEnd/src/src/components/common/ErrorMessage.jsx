import React from "react";

const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-xl">⚠️</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-600 hover:text-red-800 text-2xl leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
