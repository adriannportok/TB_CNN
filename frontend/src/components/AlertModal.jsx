import React from 'react';

export default function AlertModal({ open, title, message, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full z-10 p-6">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
