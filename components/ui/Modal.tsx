
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = '2xl' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
      'md': 'max-w-md',
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className={`bg-[rgb(var(--color-card))] rounded-xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all flex flex-col max-h-[90vh]`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[rgb(var(--color-border))]">
          <h3 className="text-xl font-bold text-[rgb(var(--color-text-base))]" id="modal-title">{title}</h3>
          <button onClick={onClose} className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))] transition-colors">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
