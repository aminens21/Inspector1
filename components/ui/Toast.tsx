import React, { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  autoClose?: boolean;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

const ToastItem: React.FC<ToastMessage & { onClose: (id: number) => void }> = ({ id, message, type, autoClose = true, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [id, autoClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  };

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'info' ? 'bg-sky-600' : 'bg-rose-600';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-triangle';

  return (
    <div className={`toast-item ${isExiting ? 'fade-out' : ''} flex items-center p-4 rounded-xl shadow-2xl ${bgColor} text-white w-auto min-w-[300px] max-w-sm border border-white/20 backdrop-blur-sm transition-all duration-200`}>
      <div className="flex-shrink-0">
        <i className={`fas ${icon} fa-2x text-white ${type === 'info' ? 'animate-pulse' : ''}`}></i>
      </div>
      <div className="mx-4 flex-grow text-center" dir="auto">
        <p className="text-base font-bold">{message}</p>
      </div>
      <button onClick={handleClose} className="flex-shrink-0 rounded-lg p-1.5 inline-flex h-8 w-8 text-white hover:bg-white/20 transition-colors">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};
