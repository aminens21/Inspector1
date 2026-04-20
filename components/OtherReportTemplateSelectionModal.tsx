
import React from 'react';
import { Modal } from './ui/Modal';
import { REPORT_TEMPLATES } from '../constants/templates';

interface OtherReportTemplateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (templateId: string) => void;
}

export const OtherReportTemplateSelectionModal: React.FC<OtherReportTemplateSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="اختيار نموذج للتقرير/المراسلة" size="2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                    onClick={() => onSelect('blank')}
                    className="p-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-sky-500 hover:bg-sky-50 transition-all group flex flex-col items-center justify-center gap-3"
                >
                    <i className="fas fa-file text-3xl text-slate-400 group-hover:text-sky-500"></i>
                    <span className="font-bold text-slate-600 group-hover:text-sky-600 text-lg">تقرير فارغ</span>
                </button>

                {REPORT_TEMPLATES.map(template => (
                    <button 
                        key={template.id} 
                        onClick={() => onSelect(template.id)}
                        className="p-6 border border-[rgb(var(--color-border))] rounded-2xl hover:border-violet-500 hover:bg-violet-500/10 transition-all group flex flex-col items-center justify-center text-center gap-3"
                    >
                        <i className={`fas ${template.subType === 'report' ? 'fa-file-alt' : 'fa-envelope'} text-3xl text-violet-400 group-hover:text-violet-600`}></i>
                        <span className="font-bold text-violet-700 dark:text-violet-400 group-hover:text-violet-800 text-lg leading-tight">
                            {template.title}
                        </span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};
