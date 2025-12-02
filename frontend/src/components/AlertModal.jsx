import React from 'react';

export default function AlertModal({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  secondaryAction,
}) {
  if (!open) return null;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      try {
        onConfirm();
      } catch (e) {
      }
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleClose = () => {
    if (typeof onClose === 'function') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={handleClose}></div>
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full z-10 p-6 text-center">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-center gap-3">
          {typeof onConfirm === 'function' ? (
            <>
              {secondaryAction && typeof secondaryAction.onClick === 'function' ? (
                <button onClick={() => { try { secondaryAction.onClick(); } catch(e){} if (typeof onClose === 'function') onClose(); }} className="px-4 py-2  border-teal-200 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300">
                  {secondaryAction.text || 'Ir'}
                </button>
              ) : (
                <button onClick={handleClose} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50">
                  {cancelText}
                </button>
              )}
              <button onClick={handleConfirm} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500">
                {confirmText}
              </button>
            </>
          ) : (
            <button onClick={handleClose} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500">
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
