import React from 'react';
import { Modal } from './Modal';
import { useTranslations } from '../../hooks/useTranslations';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isProcessing?: boolean;
  messageColor?: string;
  confirmButtonText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    isProcessing = false, 
    messageColor, 
    confirmButtonText 
}) => {
  const { t } = useTranslations();
  if (!isOpen) return null;
  
  const confirmBtnBg = confirmButtonText === t('confirmImportButton')
    ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300';

  return (
    <Modal isOpen={isOpen} onClose={isProcessing ? () => {} : onClose} title={title}>
      <div>
        <p className={`mb-6 ${messageColor || 'text-[rgb(var(--color-text-muted))]'}`}>{message}</p>
        <div className="flex justify-end pt-4 space-x-2 rtl:space-x-reverse border-t border-[rgb(var(--color-border))]">
          <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] disabled:opacity-50 transition-colors">
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-white rounded-md w-32 flex justify-center items-center ${confirmBtnBg}`}
          >
            {isProcessing ? (
                <i className="fas fa-spinner fa-spin"></i>
            ) : (
                confirmButtonText || t('confirmDelete')
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
