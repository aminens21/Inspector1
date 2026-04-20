import React from 'react';
import { Modal } from './ui/Modal';
import { ReportType } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface ReportTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: ReportType) => void;
}

export const ReportTypeSelectionModal: React.FC<ReportTypeSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslations();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('reportTypeModal_title')}>
      <div className="text-center">
        <p className="text-slate-600 mb-8">{t('reportTypeModal_description')}</p>
        <div className="flex justify-center gap-6">
          <button 
            onClick={() => onSelect(ReportType.VISIT)}
            className="flex flex-col items-center justify-center w-40 h-40 p-4 bg-sky-50 text-sky-700 rounded-xl border-2 border-sky-200 hover:bg-sky-100 hover:border-sky-400 transition-all duration-300 transform hover:scale-105"
          >
            <i className="fas fa-chalkboard-teacher text-4xl mb-3"></i>
            <span className="text-lg font-semibold">{t('visitReport')}</span>
          </button>
          <button 
            onClick={() => onSelect(ReportType.INSPECTION)}
            className="flex flex-col items-center justify-center w-40 h-40 p-4 bg-violet-50 text-violet-700 rounded-xl border-2 border-violet-200 hover:bg-violet-100 hover:border-violet-400 transition-all duration-300 transform hover:scale-105"
          >
            <i className="fas fa-search text-4xl mb-3"></i>
            <span className="text-lg font-semibold">{t('inspectionReport')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};