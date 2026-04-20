
import React, { useState, useEffect } from 'react';
import { Inspector } from '../types';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Inspector) => void;
  initialData: Inspector;
  academies: string[];
  directorates: string[];
  subjects: string[];
}

export const InspectorModal: React.FC<InspectorModalProps> = ({ isOpen, onClose, onSave, initialData, academies, directorates, subjects }) => {
  const { t } = useTranslations();
  const [inspector, setInspector] = useState<Inspector>(initialData);

  useEffect(() => {
    setInspector(initialData);
  }, [initialData, isOpen]);

  const frameworks = [
    { key: "framework_inspector_primary", value: "مفتش التعليم الإبتدائي" },
    { key: "framework_inspector_middle", value: "مفتش التعليم الثانوي الإعدادي" },
    { key: "framework_inspector_high", value: "مفتش التعليم الثانوي التأهيلي" }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('inspectorModal_title')}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_fullName')}</label>
          <input
            type="text"
            id="fullName"
            className="input-style w-full"
            value={inspector.fullName}
            onChange={(e) => setInspector({ ...inspector, fullName: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="fullNameFr" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_fullNameFr')}</label>
          <input
            type="text"
            id="fullNameFr"
            className="input-style w-full"
            value={inspector.fullNameFr || ''}
            onChange={(e) => setInspector({ ...inspector, fullNameFr: e.target.value })}
            placeholder={t('inspectorModal_fullNameFrPlaceholder')}
          />
        </div>
        
        {/* Payment ID Input */}
        <div>
          <label htmlFor="financialId" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_financialId')}</label>
          <input
            type="text"
            id="financialId"
            className="input-style w-full"
            value={inspector.financialId || ''}
            onChange={(e) => setInspector({ ...inspector, financialId: e.target.value })}
            placeholder={t('inspectorModal_financialIdPlaceholder')} 
          />
        </div>

        <div>
          <label htmlFor="framework" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_framework')}</label>
          <select
            id="framework"
            className="input-style w-full"
            value={inspector.framework || ''}
            onChange={(e) => setInspector({ ...inspector, framework: e.target.value })}
          >
            <option value="" disabled>-- {t('inspectorModal_selectFramework')} --</option>
            {frameworks.map(fw => (
              <option key={fw.value} value={fw.value}>
                {t(fw.key)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="regionalAcademy" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_academy')}</label>
          <select
            id="regionalAcademy"
            className="input-style w-full"
            value={inspector.regionalAcademy || ''}
            onChange={(e) => setInspector({ ...inspector, regionalAcademy: e.target.value })}
          >
            <option value="" disabled>-- {t('select_academy')} --</option>
            {academies.map(academy => (
              <option key={academy} value={academy}>
                {academy}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="regionalDirectorate" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_directorate')}</label>
          <select
            id="regionalDirectorate"
            className="input-style w-full"
            value={inspector.regionalDirectorate || ''}
            onChange={(e) => setInspector({ ...inspector, regionalDirectorate: e.target.value })}
          >
            <option value="" disabled>-- {t('select_directorate')} --</option>
            {directorates.map(directorate => (
              <option key={directorate} value={directorate}>
                {directorate}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="regionalDirectorTitle" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_regionalDirectorTitle')}</label>
          <input
            type="text"
            id="regionalDirectorTitle"
            className="input-style w-full"
            value={inspector.regionalDirectorTitle || ''}
            onChange={(e) => setInspector({ ...inspector, regionalDirectorTitle: e.target.value })}
            placeholder={t('inspectorModal_regionalDirectorTitlePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('inspectorModal_subject')}</label>
          <input
            type="text"
            id="subject"
            list="subjects-list"
            className="input-style w-full"
            value={inspector.subject || ''}
            onChange={(e) => setInspector({ ...inspector, subject: e.target.value })}
            placeholder={t('inspectorModal_subjectPlaceholder')}
          />
          <datalist id="subjects-list">
            {subjects.map(subject => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
        </div>

        <div className="flex justify-end pt-4 space-x-2 rtl:space-x-reverse border-t border-[rgb(var(--color-border))]">
          <button onClick={onClose} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors">{t('inspectorModal_cancelBtn')}</button>
          <button onClick={onSave.bind(null, inspector)} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">{t('save')}</button>
        </div>
      </div>
    </Modal>
  );
};
