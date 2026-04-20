import React, { useState, useEffect } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { TransmissionSlip, TransmissionSlipItem, SavedReport, OtherReport, Teacher } from '../types';
import { SelectActivitiesModal } from './SelectActivitiesModal';
import { PageHeader } from './ui/PageHeader';

interface TransmissionSlipPageProps {
  slips: TransmissionSlip[];
  reports: SavedReport[];
  otherReports: OtherReport[];
  onSave: (slip: Omit<TransmissionSlip, 'id'> | TransmissionSlip) => void;
  onViewSlip: (slip: TransmissionSlip) => void;
  onDeleteSlip: (slip: TransmissionSlip) => void;
  onGoHome: () => void;
  departments: string[];
  slipToEdit?: TransmissionSlip | null;
  onEditHandled?: () => void;
  teachers: Teacher[];
  onToggleSlipDelivered?: (slip: TransmissionSlip) => void;
  onMarkAllDelivered?: (slipIds: string[]) => void;
}

const initialFormState: Omit<TransmissionSlip, 'id'> = {
  slipNumber: '',
  date: new Date().toISOString().split('T')[0],
  concernedDepartment: '',
  items: [],
};

export const TransmissionSlipPage: React.FC<TransmissionSlipPageProps> = ({
  slips, reports, otherReports, teachers, onSave, onViewSlip, onDeleteSlip, onGoHome, departments, slipToEdit, onEditHandled, onToggleSlipDelivered, onMarkAllDelivered
}) => {
  const { t, language, dir } = useTranslations();

  // Helper to generate next slip number
  const generateNextSlipNumber = (dateString?: string) => {
    const date = dateString ? new Date(dateString) : new Date();
    const year = date.getFullYear();
    const pattern = new RegExp(`^(\\d+)/${year}$`);
    let maxNum = 0;

    // Check existing slips only
    slips.forEach(s => {
      if (s.slipNumber) {
        const match = s.slipNumber.trim().match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `${paddedNum}/${year}`;
  };

  const [formData, setFormData] = useState<Omit<TransmissionSlip, 'id'>>({
    ...initialFormState,
    slipNumber: generateNextSlipNumber()
  });
  const [editingSlip, setEditingSlip] = useState<TransmissionSlip | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [filterLang, setFilterLang] = useState<'all' | 'ar' | 'fr'>('all');

  useEffect(() => {
    if (slipToEdit) {
      setEditingSlip(slipToEdit);
      if (onEditHandled) onEditHandled();
    }
  }, [slipToEdit, onEditHandled]);

  useEffect(() => {
    if (editingSlip) {
      setFormData(editingSlip);
    } else {
      setFormData({
        ...initialFormState,
        slipNumber: generateNextSlipNumber()
      });
    }
  }, [editingSlip]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'date' && !editingSlip) {
        // If date changes and we are creating a new slip, update the slip number if it was the default one
        const currentYear = new Date(formData.date).getFullYear();
        const currentPattern = new RegExp(`^\\d+/${currentYear}$`);
        
        if (formData.slipNumber.match(currentPattern)) {
            const nextNum = generateNextSlipNumber(value);
            setFormData(prev => ({ ...prev, [name]: value, slipNumber: nextNum }));
            return;
        }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof TransmissionSlipItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      (newItems[index] as any)[field] = value;
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };
  
  const handleSave = () => {
    if (!formData.slipNumber || !formData.concernedDepartment || formData.items.length === 0) {
        alert(t('transmissionSlip_fillAllFields'));
        return;
    }
    onSave(editingSlip ? { ...formData, id: editingSlip.id } : formData);
    setEditingSlip(null);
  };
  
  const handleCancelEdit = () => {
    setEditingSlip(null);
  };
  
  const handleAddActivities = (selectedItems: TransmissionSlipItem[]) => {
      setFormData(prev => ({
          ...prev,
          items: [...prev.items, ...selectedItems]
      }));
      setIsSelectModalOpen(false);
  };

  return (
    <>
      <div className="container mx-auto p-4 md:p-6">
          <PageHeader
            title={
                <div className="flex items-center gap-4">
                    <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700">
                        <i className="fas fa-home"></i>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-stone-600">{t('transmissionSlip_pageTitle')}</h1>
                </div>
            }
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-1">
                  <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] shadow-sm sticky top-6">
                      <h2 className="text-2xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mb-4">
                          {editingSlip ? t('transmissionSlip_editTitle') : t('transmissionSlip_createTitle')}
                      </h2>
                      <div className="space-y-4">
                          <div>
                              <label htmlFor="slipNumber" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('slip_slipNumber')}</label>
                              <input type="text" name="slipNumber" id="slipNumber" value={formData.slipNumber} onChange={handleChange} placeholder={t('transmissionSlip_slipNumberPlaceholder')} className="input-style"/>
                          </div>
                          <div>
                              <label htmlFor="date" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('date')}</label>
                              <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className="input-style"/>
                          </div>
                          <div>
                              <label htmlFor="concernedDepartment" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('otherReports_department')}</label>
                              <select name="concernedDepartment" id="concernedDepartment" value={formData.concernedDepartment} onChange={handleChange} className="input-style">
                                  <option value="" disabled>-- {t('otherReports_selectDepartment')} --</option>
                                  {departments.map(dep => <option key={dep} value={dep}>{t(dep) || dep}</option>)}
                              </select>
                          </div>
                          <div>
                              <label htmlFor="language" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('language') || 'اللغة'}</label>
                              <select name="language" id="language" value={formData.language || 'ar'} onChange={handleChange} className="input-style">
                                  <option value="ar">{t('lang_ar_btn')}</option>
                                  <option value="fr">{t('lang_fr_btn')}</option>
                              </select>
                          </div>
                          
                          <div className="pt-2">
                              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-base))]">{t('transmissionSlip_attachedReports')}</h3>
                              {formData.items.length === 0 ? (
                                  <p className="text-sm text-[rgb(var(--color-text-muted))] mt-2">{t('transmissionSlip_noReportsAdded')}</p>
                              ) : (
                                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                      {formData.items.map((item, index) => (
                                          <div key={`${item.reportId}-${index}`} className="border border-[rgb(var(--color-border))] p-2 rounded-md">
                                              <div className="flex justify-between items-start">
                                                  <p className="text-sm font-semibold flex-grow">{item.reportSubject}</p>
                                                  <button onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 text-xs">
                                                      <i className="fas fa-times"></i>
                                                  </button>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 mt-2">
                                                  <div>
                                                      <label className="text-xs">{t('slip_item_copies')}</label>
                                                      <input type="number" min="1" value={item.copyCount} onChange={e => handleItemChange(index, 'copyCount', parseInt(e.target.value, 10))} className="input-style p-1 text-sm w-full"/>
                                                  </div>
                                                  <div className="col-span-2">
                                                      <label className="text-xs">{t('slip_item_notes')}</label>
                                                      <input type="text" value={item.notes} onChange={e => handleItemChange(index, 'notes', e.target.value)} className="input-style p-1 text-sm w-full" />
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                              <button onClick={() => setIsSelectModalOpen(true)} className="btn mt-4 w-full bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200">
                                  <i className="fas fa-plus ltr:mr-2 rtl:ml-2"></i>{t('transmissionSlip_addActivities')}
                              </button>
                          </div>

                          <div className="flex gap-2 mt-4">
                              <button onClick={handleSave} className="flex-grow px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition">
                                  <i className="fas fa-save ltr:mr-2 rtl:ml-2"></i> {editingSlip ? t('saveChanges') : t('save')}
                              </button>
                              {editingSlip && (
                                  <button onClick={handleCancelEdit} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition">
                                      {t('cancelEdit')}
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* List Section */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-base))]">{t('transmissionSlip_savedSlips')}</h2>
                        {onMarkAllDelivered && slips.some(s => !s.delivered) && (
                            <button 
                                onClick={() => onMarkAllDelivered(slips.map(s => String(s.id)))} 
                                title={t('deliverAll')} 
                                className="btn btn-secondary bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 text-sm py-1 px-3"
                            >
                                <i className="fas fa-check-double ml-1"></i> {t('deliverAll')}
                            </button>
                        )}
                    </div>
                    
                    {/* Language Filter */}
                    <div className="mb-4 bg-[rgb(var(--color-card))] p-3 rounded-xl border border-[rgb(var(--color-border))] flex items-center gap-4">
                        <span className="text-sm font-medium text-[rgb(var(--color-text-base))]">{t('filter_language')}</span>
                        <div className="flex bg-[rgb(var(--color-background))] p-1 rounded-lg border border-[rgb(var(--color-border))]">
                            <button
                                onClick={() => setFilterLang('all')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterLang === 'all' ? 'bg-stone-600 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))]'}`}
                            >
                                {t('lang_all')}
                            </button>
                            <button
                                onClick={() => setFilterLang('ar')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterLang === 'ar' ? 'bg-stone-600 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))]'}`}
                            >
                                {t('lang_ar_btn')}
                            </button>
                            <button
                                onClick={() => setFilterLang('fr')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filterLang === 'fr' ? 'bg-stone-600 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))]'}`}
                            >
                                {t('lang_fr_btn')}
                            </button>
                        </div>
                    </div>

                    {slips.length === 0 ? (
                        <div className="text-center py-16 bg-[rgb(var(--color-card))] rounded-xl border border-[rgb(var(--color-border))]">
                            <i className="fas fa-folder-open text-6xl text-slate-300 mb-4"></i>
                            <p className="text-[rgb(var(--color-text-muted))] text-xl">{t('transmissionSlip_noSavedSlips')}</p>
                        </div>
                    ) : (
                       <div className="space-y-4">
                            {slips.slice().filter(s => filterLang === 'all' || (s.language || 'ar') === filterLang).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((slip) => (
                                <div key={slip.id} className="bg-[rgb(var(--color-card))] rounded-lg shadow-sm border border-[rgb(var(--color-border))] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow">
                                    <div className="flex-grow mb-3 sm:mb-0">
                                        <h3 className="font-bold text-md text-[rgb(var(--color-text-base))]">{slip.slipNumber}</h3>
                                        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">{slip.concernedDepartment}</p>
                                        <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1">
                                            {new Date(slip.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-4 rtl:space-x-reverse self-end sm:self-center flex-shrink-0">
                                        {onToggleSlipDelivered && (
                                            <button 
                                                onClick={() => onToggleSlipDelivered(slip)} 
                                                className={`${slip.delivered ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-emerald-600'} transition-colors`} 
                                                title={slip.delivered ? t('cancelDelivery') : t('setAsDelivered')}
                                            >
                                                <i className={`fas fa-check-circle fa-lg ${slip.delivered ? '' : 'opacity-50'}`}></i>
                                            </button>
                                        )}
                                        <button onClick={() => onViewSlip(slip)} className="text-sky-600 hover:text-sky-900" title={t('view')}>
                                            <i className="fas fa-eye fa-lg"></i>
                                        </button>
                                        <button onClick={() => setEditingSlip(slip)} className="text-amber-600 hover:text-amber-900" title={t('edit')}>
                                            <i className="fas fa-edit fa-lg"></i>
                                        </button>
                                         <button onClick={() => onDeleteSlip(slip)} className="text-rose-600 hover:text-rose-900" title={t('delete')}>
                                            <i className="fas fa-trash-alt fa-lg"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
          </div>
      </div>
      <SelectActivitiesModal
          isOpen={isSelectModalOpen}
          onClose={() => setIsSelectModalOpen(false)}
          reports={reports}
          otherReports={otherReports}
          teachers={teachers}
          onAdd={handleAddActivities}
          existingItems={formData.items}
      />
    </>
  );
};