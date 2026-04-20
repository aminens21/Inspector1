import React, { useState, useMemo } from 'react';
import { SavedReport, OtherReport, Memo } from '../types';
import { useTranslations } from '../hooks/useTranslations';

import { Modal } from './ui/Modal';

interface StatisticsPageProps {
  reports: SavedReport[];
  otherReports: OtherReport[];
  memos: Memo[];
  onSaveMemo: (memo: Omit<Memo, 'id'> & { id?: string }) => void;
  onDeleteMemo: (id: string) => void;
  onGoHome: () => void;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ 
    otherReports, 
    memos,
    onSaveMemo,
    onDeleteMemo,
    onGoHome 
}) => {
  const { t, language } = useTranslations();
  const isRtl = language === 'ar';
  
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [viewingMemo, setViewingMemo] = useState<Memo | null>(null);

  // Get unique activity types from other reports
  const activityTypes = useMemo(() => {
    const defaultTypes = [
        "التفتيشات والزيارات",
        "الدروس التجريبية",
        "الندوات واللقاءات التربوية",
        "التكوينات",
        "أنشطة أخرى",
        "العمل المشترك",
        "الترسيم والكفاءة"
    ];
    const typesSet = new Set<string>(defaultTypes);
    
    otherReports.forEach(report => {
      if (report.activityType && report.activityType !== 'درس تجريبي') {
        typesSet.add(report.activityType);
      }
    });
    return Array.from(typesSet).sort();
  }, [otherReports]);

  const handleSave = () => {
    if (!selectedActivityType || !memoContent.trim()) return;
    
    onSaveMemo({
      id: editingMemoId || undefined,
      title: memoTitle.trim(),
      activityType: selectedActivityType,
      content: memoContent.trim()
    });

    setMemoTitle('');
    setMemoContent('');
    setSelectedActivityType('');
    setEditingMemoId(null);
  };

  const handleEdit = (memo: Memo) => {
    setSelectedActivityType(memo.activityType);
    setMemoTitle(memo.title || '');
    setMemoContent(memo.content);
    setEditingMemoId(String(memo.id));
  };

  return (
    <div className="max-w-4xl mx-auto pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text-base))] flex items-center gap-3">
          <i className="fas fa-book text-cyan-500"></i>
          {t('memos_management')}
        </h1>
        <button
          onClick={onGoHome}
          className="p-2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))] transition-colors"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="bg-[rgb(var(--color-card))] p-6 rounded-2xl border border-[rgb(var(--color-border))] shadow-sm mb-8">
        <h2 className={`text-lg font-bold text-[rgb(var(--color-text-base))] mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
          {editingMemoId ? t('memo_edit_title') : t('memo_add_title')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium text-[rgb(var(--color-text-muted))] mb-1 ${isRtl ? 'text-right' : 'text-left'}`}>
              {t('memo_activity_type_label')}
            </label>
            <select
              value={selectedActivityType}
              onChange={(e) => setSelectedActivityType(e.target.value)}
              className={`w-full p-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-base))] focus:ring-2 focus:ring-cyan-500 outline-none ${isRtl ? 'text-right' : 'text-left'}`}
            >
              <option value="">{t('memo_select_activity_placeholder')}</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>{t(type) || type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium text-[rgb(var(--color-text-muted))] mb-1 ${isRtl ? 'text-right' : 'text-left'}`}>
              {t('memo_title_label')}
            </label>
            <input
              type="text"
              value={memoTitle}
              onChange={(e) => setMemoTitle(e.target.value)}
              placeholder={t('memo_title_placeholder')}
              className={`w-full p-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-base))] focus:ring-2 focus:ring-cyan-500 outline-none ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium text-[rgb(var(--color-text-muted))] mb-1 ${isRtl ? 'text-right' : 'text-left'}`}>
              {t('memo_content_label')}
            </label>
            <textarea
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              placeholder={t('memo_content_placeholder')}
              className={`w-full p-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-base))] focus:ring-2 focus:ring-cyan-500 outline-none min-h-[120px] ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!selectedActivityType || !memoContent.trim()}
              className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-bold hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingMemoId ? t('memo_update_btn') : t('memo_save_btn')}
            </button>
            {editingMemoId && (
              <button
                onClick={() => {
                  setEditingMemoId(null);
                  setMemoTitle('');
                  setMemoContent('');
                  setSelectedActivityType('');
                }}
                className="px-6 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                {t('memo_cancel_btn')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className={`text-lg font-bold text-[rgb(var(--color-text-base))] mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
          {t('memos_list')}
        </h2>
        
        {memos.length === 0 ? (
          <div className="text-center py-12 bg-[rgb(var(--color-card))] rounded-2xl border border-dashed border-[rgb(var(--color-border))]">
            <i className="fas fa-sticky-note text-4xl text-slate-300 mb-3"></i>
            <p className="text-slate-500">{t('memo_no_memos')}</p>
          </div>
        ) : (
          memos.map(memo => (
            <div key={memo.id} className={`bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4`}>
              <div className={`flex-1 w-full ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                  {memo.title && (
                    <h3 className="text-sm font-bold text-[rgb(var(--color-text-base))]">{memo.title}</h3>
                  )}
                  <div className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-700 text-xs font-bold">
                    {t(memo.activityType) || memo.activityType}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setViewingMemo(memo)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 transition-colors rounded-lg"
                  title={t('memo_view_btn')}
                >
                  <i className="fas fa-eye"></i>
                </button>
                <button
                  onClick={() => handleEdit(memo)}
                  className="p-2 text-sky-600 hover:bg-sky-50 transition-colors rounded-lg"
                  title={t('memo_edit_btn')}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  onClick={() => onDeleteMemo(String(memo.id))}
                  className="p-2 text-rose-600 hover:bg-rose-50 transition-colors rounded-lg"
                  title={t('memo_delete_btn')}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={!!viewingMemo} onClose={() => setViewingMemo(null)} title={viewingMemo?.title || t('memo_view_title')}>
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className={`mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-700 text-xs font-bold">
                {t(viewingMemo?.activityType || '') || viewingMemo?.activityType}
              </span>
            </div>
            <p className={`text-[rgb(var(--color-text-base))] whitespace-pre-wrap leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              {viewingMemo?.content}
            </p>
          </div>
          <div className={`flex ${isRtl ? 'justify-end' : 'justify-start'} pt-4`}>
            <button
              onClick={() => setViewingMemo(null)}
              className="px-6 py-2 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
