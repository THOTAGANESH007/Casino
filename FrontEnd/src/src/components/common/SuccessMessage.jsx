import React from "react";

const SuccessMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="bg-green-50 border border-green-400 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-xl">✓</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-green-600 hover:text-green-800 text-2xl leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SuccessMessage;
