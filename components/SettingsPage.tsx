
import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { EvaluationCriterion, SportActivities } from '../types';
import { exportAllData } from '../services/localStorageManager';
import { PageHeader } from './ui/PageHeader';

interface SettingsPageProps {
  initialCriteria: EvaluationCriterion[];
  initialAcademies: string[];
  initialDirectorates: string[];
  initialActivities: SportActivities;
  initialLevels: string[];
  initialDepartments: string[];
  initialSubjects: string[];
  initialMinistryLogo: string;
  initialMinistryLogoFr?: string;
  initialMinistryLogoHeight: number;
  initialMinistryLogoHeightFr?: number;
  initialGeminiApiKey?: string;
  onSave: (data: { 
    criteria: EvaluationCriterion[], 
    academies: string[], 
    directorates: string[], 
    activities: SportActivities, 
    levels: string[], 
    departments: string[], 
    subjects: string[],
    ministryLogo: string,
    ministryLogoFr?: string,
    ministryLogoHeight: number,
    ministryLogoHeightFr?: number,
    geminiApiKey?: string,
  }) => void;
  onGoHome: () => void;
  onRestore: (jsonData: string) => void;
  onSyncFromCloud?: () => void;
  onSyncToCloud?: () => void;
}

type ActiveTab = 'general' | 'reports';

const TabButton: React.FC<{ tabId: ActiveTab; title: string; activeTab: ActiveTab; setActiveTab: (tabId: ActiveTab) => void; }> = ({ tabId, title, activeTab, setActiveTab }) => (
     <button
        type="button"
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-lg font-semibold transition-colors duration-200 ${
          activeTab === tabId
            ? 'border-b-2 border-sky-500 text-sky-600'
            : 'text-[rgb(var(--color-text-muted))] hover:text-sky-500'
        }`}
      >
        {title}
      </button>
  );

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  initialCriteria, initialAcademies, initialDirectorates, initialActivities, initialLevels, initialDepartments, initialSubjects,
  initialMinistryLogo, initialMinistryLogoFr, initialMinistryLogoHeight, initialMinistryLogoHeightFr, initialGeminiApiKey,
  onSave, onGoHome, onRestore, onSyncFromCloud, onSyncToCloud
}) => {
  const { t, language, fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useTranslations();
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [academies, setAcademies] = useState<string[]>([]);
  const [directorates, setDirectorates] = useState<string[]>([]);
  const [activities, setActivities] = useState<SportActivities>({});
  const [levels, setLevels] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [ministryLogo, setMinistryLogo] = useState<string>('');
  const [ministryLogoFr, setMinistryLogoFr] = useState<string>('');
  const [ministryLogoHeight, setMinistryLogoHeight] = useState<number>(125);
  const [ministryLogoHeightFr, setMinistryLogoHeightFr] = useState<number>(125);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newActivityName, setNewActivityName] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCriteria(JSON.parse(JSON.stringify(initialCriteria)));
    setAcademies([...initialAcademies]);
    setDirectorates([...initialDirectorates]);
    setActivities(JSON.parse(JSON.stringify(initialActivities)));
    setLevels([...initialLevels]);
    setDepartments([...initialDepartments]);
    setSubjects([...initialSubjects]);
    setMinistryLogo(initialMinistryLogo);
    setMinistryLogoFr(initialMinistryLogoFr || '');
    setMinistryLogoHeight(initialMinistryLogoHeight || 125);
    setMinistryLogoHeightFr(initialMinistryLogoHeightFr || 125);
    setGeminiApiKey(initialGeminiApiKey || '');
    if (initialActivities && Object.keys(initialActivities).length > 0) {
      setSelectedCategory(Object.keys(initialActivities)[0]);
    }
  }, [initialCriteria, initialAcademies, initialDirectorates, initialActivities, initialLevels, initialDepartments, initialSubjects, initialMinistryLogo, initialMinistryLogoHeight, initialGeminiApiKey]);

  const handleSave = () => {
    onSave({ criteria, academies, directorates, activities, levels, departments, subjects, ministryLogo, ministryLogoFr, ministryLogoHeight, ministryLogoHeightFr, geminiApiKey });
  };
  
  const handleItemChange = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, value: T) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, newItem: T) => {
    setter(prev => [...prev, newItem]);
  };

  const handleRemoveItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveItemUp = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    if (index === 0) return;
    setter(prev => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };

  const handleMoveItemDown = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setter(prev => {
      if (index === prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
  };
  
  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !activities[trimmedName]) {
      setActivities(prev => ({...prev, [trimmedName]: []}));
      setSelectedCategory(trimmedName);
      setNewCategoryName('');
    }
  };
  
  const handleRemoveCategory = (category: string) => {
      if(confirm(t('settings_confirmDeleteCategory', category))) {
          const newActivities = {...activities};
          delete newActivities[category];
          setActivities(newActivities);
          const remainingCategories = Object.keys(newActivities);
          // If we deleted the selected category, select another one or clear
          if (selectedCategory === category) {
             setSelectedCategory(remainingCategories.length > 0 ? remainingCategories[0] : '');
          }
      }
  };
  
  const handleCategoryNameChange = (oldName: string, newName: string, index: number) => {
    if (oldName === newName) return;
    
    setActivities(prev => {
        // Safe rename by reconstructing object to maintain order
        const entries = Object.entries(prev);
        const newActivities: Record<string, string[]> = {};
        
        // Check for duplicate key
        if (newName !== oldName && Object.prototype.hasOwnProperty.call(prev, newName)) {
            return prev; // Block if duplicate
        }

        entries.forEach(([key, val], i) => {
            const list = val as string[];
            if (i === index) {
                newActivities[newName] = list;
            } else {
                newActivities[key] = list;
            }
        });
        
        return newActivities;
    });

    if (selectedCategory === oldName) {
        setSelectedCategory(newName);
    }
  };

  const handleAddActivity = (category: string) => {
    const trimmedName = newActivityName.trim();
    if (trimmedName && activities[category]) {
      setActivities(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), trimmedName]
      }));
      setNewActivityName('');
    }
  };
  
  const handleRemoveActivity = (category: string, activityIndex: number) => {
      setActivities(prev => {
          const list: string[] = prev[category] || [];
          const updatedList = list.filter((_, index) => index !== activityIndex);
          return {
              ...prev,
              [category]: updatedList
          };
      });
  };
  
  const handleActivityNameChange = (category: string, index: number, newName: string) => {
    setActivities(prev => {
        const updatedCategoryActivities = [...(prev[category] || [])];
        updatedCategoryActivities[index] = newName;
        return {
            ...prev,
            [category]: updatedCategoryActivities,
        };
    });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB size limit
        alert(t('settings_logoSizeError'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setMinistryLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoFrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB size limit
        alert(t('settings_logoSizeError'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setMinistryLogoFr(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBackup = () => {
    try {
      const data = exportAllData();
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const date = new Date().toISOString().split('T')[0];
      const filename = `inspector-app-backup-${date}.json`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed", e);
      alert(t('errorBackup'));
    }
  };

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleRestoreFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onRestore(content);
    };
    reader.onerror = () => {
      alert(t('errorReadFile'));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const renderListEditor = (
    title: string,
    description: string,
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
    addButtonLabel: string,
    isReportTab: boolean = false
  ) => (
    <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
      <h2 className={`text-xl font-bold text-[rgb(var(--color-text-base))] ${isReportTab ? 'dark:text-amber-400' : ''}`}>{title}</h2>
      <p className="text-[rgb(var(--color-text-muted))] mb-4">{description}</p>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item || ''}
              onChange={(e) => handleItemChange(setter, index, e.target.value)}
              className="input-style flex-grow"
              placeholder={placeholder}
            />
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); handleRemoveItem(setter, index); }} 
              className="text-rose-500 hover:text-rose-700 p-2"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => handleAddItem<string>(setter, '')} className="btn mt-4 w-full bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200">
        {addButtonLabel}
      </button>
    </div>
  );
  
  return (
    <div className="container mx-auto p-4 md:p-6">
       <input 
        type="file" 
        ref={restoreInputRef} 
        onChange={handleRestoreFileChange} 
        className="hidden" 
        accept="application/json" 
      />
      <PageHeader
        title={<h1 className="text-2xl font-bold text-gray-500">{t('settings_pageTitle')}</h1>}
        actions={
            <button type="button" onClick={onGoHome} className="btn bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))]">
                {t('back')}
            </button>
        }
      />
      
      <div className="flex border-b border-[rgb(var(--color-border))] mb-8">
        <TabButton tabId="general" title={t('settings_tab_general')} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton tabId="reports" title={t('settings_tab_reports')} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="space-y-8">
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* Font Size Control */}
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))]">{t('settings_fontSize')}</h2>
                    <p className="text-[rgb(var(--color-text-muted))]">التحكم في حجم الكتابة لكامل التطبيق</p>
                </div>
                <div className="flex items-center gap-3 bg-[rgb(var(--color-background))] p-2 rounded-lg border border-[rgb(var(--color-border))]">
                    <button onClick={decreaseFontSize} className="w-10 h-10 flex items-center justify-center rounded-md bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-card-hover))] transition-colors">
                        <i className="fas fa-minus"></i>
                    </button>
                    <span className="font-bold text-lg w-12 text-center">{fontSize}px</span>
                    <button onClick={increaseFontSize} className="w-10 h-10 flex items-center justify-center rounded-md bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-card-hover))] transition-colors">
                        <i className="fas fa-plus"></i>
                    </button>
                    <div className="h-8 w-px bg-[rgb(var(--color-border))] mx-1"></div>
                    <button onClick={resetFontSize} className="text-sm text-sky-600 hover:text-sky-700 font-medium px-2">
                        {t('fontSize_reset')}
                    </button>
                </div>
            </div>

            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))]">{t('settings_ministryTitle')}</h2>
                <p className="text-[rgb(var(--color-text-muted))] mb-4">{t('settings_ministryDesc')}</p>
                <div className="space-y-10">
                    {/* Arabic Logo Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-4">{t('settings_ministryLogoLabel')}</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                            <div className="w-full sm:w-auto sm:max-w-[70%] overflow-hidden flex justify-center shrink-0 sm:shrink">
                                <img src={ministryLogo} alt={t('ministryLogoAlt')} style={{ height: `${ministryLogoHeight}px` }} className="object-contain max-w-full p-1 bg-white border border-slate-200 rounded-md" />
                            </div>
                            <div className="w-full sm:flex-grow min-w-0">
                                <input
                                type="file"
                                id="logoUpload"
                                className="hidden"
                                accept="image/png, image/jpeg"
                                onChange={handleLogoChange}
                                />
                                <label htmlFor="logoUpload" className="btn bg-sky-100 text-sky-700 cursor-pointer w-full text-center block whitespace-nowrap overflow-hidden text-ellipsis">
                                {t('settings_changeLogo')}
                                </label>
                                <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1 text-center sm:text-start">{t('settings_logoSpecs')}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-2">
                                {t('settings_logoHeight')}: <span className="font-bold text-sky-600">{ministryLogoHeight}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="50" 
                                max="250" 
                                step="5"
                                value={ministryLogoHeight}
                                onChange={(e) => setMinistryLogoHeight(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                            />
                        </div>
                    </div>

                    {/* French Logo Selection */}
                    <div className="pt-8 border-t border-[rgb(var(--color-border))]">
                        <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-4">{t('settings_ministryLogoFrLabel')}</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                            <div className="w-full sm:w-auto sm:max-w-[70%] overflow-hidden flex justify-center shrink-0 sm:shrink">
                                {ministryLogoFr ? (
                                    <img src={ministryLogoFr} alt={t('ministryLogoAlt')} style={{ height: `${ministryLogoHeightFr}px` }} className="object-contain max-w-full p-1 bg-white border border-slate-200 rounded-md" />
                                ) : (
                                    <div className="w-48 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-300">
                                        No Logo
                                    </div>
                                )}
                            </div>
                            <div className="w-full sm:flex-grow min-w-0">
                                <input
                                type="file"
                                id="logoUploadFr"
                                className="hidden"
                                accept="image/png, image/jpeg"
                                onChange={handleLogoFrChange}
                                />
                                <label htmlFor="logoUploadFr" className="btn bg-sky-100 text-sky-700 cursor-pointer w-full text-center block whitespace-nowrap overflow-hidden text-ellipsis">
                                {t('settings_changeLogo')}
                                </label>
                                <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1 text-center sm:text-start">{t('settings_logoSpecs')}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-2">
                                {t('settings_logoHeightFr')}: <span className="font-bold text-sky-600">{ministryLogoHeightFr}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="50" 
                                max="250" 
                                step="5"
                                value={ministryLogoHeightFr}
                                onChange={(e) => setMinistryLogoHeightFr(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-robot text-sky-500"></i>
                    {t('settings_aiConfig') || 'إعدادات الذكاء الاصطناعي'}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">
                            {t('settings_geminiApiKey') || 'مفتاح API الخاص بـ Gemini'}
                        </label>
                        <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                            dir="ltr"
                        />
                        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-2 leading-relaxed">
                            {t('settings_geminiApiKeyHelp') || 'مطلوب لاستخدام ميزات الذكاء الاصطناعي في صياغة التقارير. يمكنك الحصول عليه مجاناً من Google AI Studio.'}
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline mx-1">
                                {t('settings_getApiKey') || 'احصل على المفتاح من هنا'}
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {renderListEditor(
                t('settings_academiesTitle'),
                t('settings_academiesDesc'),
                academies,
                setAcademies,
                t('settings_academyPlaceholder'),
                t('settings_addAcademy')
              )}
              {renderListEditor(
                t('settings_directoratesTitle'),
                t('settings_directoratesDesc'),
                directorates,
                setDirectorates,
                t('settings_directoratePlaceholder'),
                t('settings_addDirectorate')
              )}
            </div>
             {renderListEditor(
                t('settings_departmentsTitle'),
                t('settings_departmentsDesc'),
                departments,
                setDepartments,
                t('settings_departmentPlaceholder'),
                t('settings_addDepartment')
            )}
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
              <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))]">{t('settings_backupRestoreTitle')}</h2>
              <p className="text-[rgb(var(--color-text-muted))] mb-4">{t('settings_backupRestoreDesc')}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={handleBackup} className="btn bg-sky-600 text-white hover:bg-sky-700 flex-1">
                  <i className="fas fa-download ltr:mr-2 rtl:ml-2"></i> {t('settings_backupButton')}
                </button>
                <button type="button" onClick={handleRestoreClick} className="btn bg-amber-600 text-white hover:bg-amber-700 flex-1">
                  <i className="fas fa-upload ltr:mr-2 rtl:ml-2"></i> {t('settings_restoreButton')}
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[rgb(var(--color-border))] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {onSyncFromCloud && (
                      <div>
                          <p className="text-sm text-[rgb(var(--color-text-muted))] mb-2">{t('settings_syncFromCloudDesc')}</p>
                          <button type="button" onClick={onSyncFromCloud} className="btn bg-cyan-600 text-white hover:bg-cyan-700 w-full flex items-center justify-center">
                              <i className="fas fa-cloud-download-alt ltr:mr-2 rtl:ml-2"></i> {t('settings_syncFromCloudButton')}
                          </button>
                      </div>
                  )}
                  {onSyncToCloud && (
                      <div>
                          <p className="text-sm text-[rgb(var(--color-text-muted))] mb-2">{t('settings_syncToCloudDesc')}</p>
                          <button type="button" onClick={onSyncToCloud} className="btn bg-indigo-600 text-white hover:bg-indigo-700 w-full flex items-center justify-center">
                              <i className="fas fa-cloud-upload-alt ltr:mr-2 rtl:ml-2"></i> {t('settings_syncToCloudButton')}
                          </button>
                      </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            {renderListEditor(
              t('settings_levelsTitle'),
              t('settings_levelsDesc'),
              levels,
              setLevels,
              t('settings_levelPlaceholder'),
              t('settings_addLevel'),
              true
            )}

            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
              <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] dark:text-amber-400">{t('settings_subjectsListTitle')}</h2>
              <p className="text-[rgb(var(--color-text-muted))] mb-4">{t('settings_subjectsManagementDesc')}</p>
              
              <div>
                  <div className="space-y-3">
                      {subjects.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                          <input
                          type="text"
                          value={item || ''}
                          onChange={(e) => handleItemChange(setSubjects, index, e.target.value)}
                          className="input-style flex-grow"
                          placeholder={t('settings_subjectPlaceholder')}
                          />
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); handleRemoveItem(setSubjects, index); }} 
                            className="text-rose-500 hover:text-rose-700 p-2"
                          >
                          <i className="fas fa-trash"></i>
                          </button>
                      </div>
                      ))}
                  </div>
                  <button type="button" onClick={() => handleAddItem<string>(setSubjects, '')} className="btn mt-4 w-full bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200">
                      {t('settings_addSubject')}
                  </button>
              </div>
            </div>
            
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
              <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] dark:text-amber-400">{t('settings_activitiesTitle')}</h2>
              <p className="text-[rgb(var(--color-text-muted))] mb-4">{t('settings_activitiesDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                   <h3 className="font-semibold text-slate-700 dark:text-slate-50 mb-2">{t('evaluation_field_activityCategory')}</h3>
                    <div className="space-y-2">
                        {/* Use index as key to prevent focus loss during rename */}
                        {Object.keys(activities).map((cat, index) => (
                           <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    onChange={(e) => handleCategoryNameChange(cat, e.target.value, index)}
                                    className={`input-style flex-grow cursor-pointer ${selectedCategory === cat ? 'border-sky-500 ring-2 ring-sky-500/20' : ''}`}
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleRemoveCategory(cat); }}
                                    className="btn bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex-shrink-0 h-11 w-11 p-0 flex items-center justify-center"
                                    aria-label={`Delete category ${cat}`}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="input-style flex-grow"
                            placeholder={t('settings_newCategoryPrompt')}
                        />
                        <button type="button" onClick={handleAddCategory} className="btn bg-sky-600 text-white p-2 h-10 w-10 flex-shrink-0">
                            <i className="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-50 mb-2">{t('evaluation_field_activity')}</h3>
                    {selectedCategory && activities[selectedCategory] ? (
                        <>
                        <div className="space-y-2">
                            {/* Use index as key to prevent focus loss */}
                            {activities[selectedCategory].map((act, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={act || ''}
                                        onChange={(e) => handleActivityNameChange(selectedCategory, index, e.target.value)}
                                        className="input-style flex-grow"
                                    />
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleRemoveActivity(selectedCategory, index);
                                        }}
                                        className="btn bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex-shrink-0 h-11 w-11 p-0 flex items-center justify-center"
                                        aria-label={`Delete activity ${act}`}
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="text"
                                value={newActivityName}
                                onChange={(e) => setNewActivityName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddActivity(selectedCategory)}
                                className="input-style flex-grow"
                                placeholder={t('settings_newActivityPrompt')}
                            />
                            <button type="button" onClick={() => handleAddActivity(selectedCategory)} className="btn bg-sky-600 text-white p-2 h-10 w-10 flex-shrink-0">
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>
                        </>
                    ) : (
                        <p className="text-[rgb(var(--color-text-muted))]">{t('settings_selectCategoryPrompt')}</p>
                    )}
                </div>
              </div>
            </div>
             <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))]">
              <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] dark:text-amber-400">{t('settings_criteriaTitle')}</h2>
              <p className="text-[rgb(var(--color-text-muted))] mb-4">{t('settings_criteriaDesc')}</p>
              <div className="space-y-3">
                {criteria.map((c, index) => (
                  <div key={c.id || index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.name || ''}
                      onChange={(e) => handleItemChange(setCriteria, index, { ...c, name: e.target.value })}
                      className="input-style flex-grow"
                      placeholder={t('settings_criterionPlaceholder')}
                    />
                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleMoveItemUp(setCriteria, index); }} 
                        className={`p-2 rounded-md transition-colors ${index === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-sky-500 hover:bg-sky-100 hover:text-sky-700'}`} 
                        title="تحريك لأعلى"
                        disabled={index === 0}
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleMoveItemDown(setCriteria, index); }} 
                        className={`p-2 rounded-md transition-colors ${index === criteria.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-sky-500 hover:bg-sky-100 hover:text-sky-700'}`} 
                        title="تحريك لأسفل"
                        disabled={index === criteria.length - 1}
                      >
                        <i className="fas fa-arrow-down"></i>
                      </button>
                    </div>
                    <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); handleRemoveItem(setCriteria, index); }}
                        className="text-rose-500 hover:text-rose-700 p-2"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => handleAddItem<EvaluationCriterion>(setCriteria, { id: crypto.randomUUID(), name: '', comment: '' })} className="btn mt-4 w-full bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200">
                {t('settings_addCriterion')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-[rgb(var(--color-border))] flex justify-end">
        <button type="button" onClick={handleSave} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700">
          <i className="fas fa-save ltr:mr-2 rtl:ml-2"></i> {t('saveChanges')}
        </button>
      </div>
    </div>
  );
};
