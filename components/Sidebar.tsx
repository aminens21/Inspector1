import React, { useEffect, useRef } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { exportAllData } from '../services/localStorageManager';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  onOpenInspectorModal: () => void;
  onSyncToCloud?: () => void;
  onSyncFromCloud?: () => void;
  onRestore?: (jsonData: string) => void;
  isSuperAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentPage, onLogout, onOpenInspectorModal, onSyncToCloud, onSyncFromCloud, onRestore, isSuperAdmin }) => {
  const { t, theme, setTheme, dir, language } = useTranslations();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    { id: 'inspectionSpace', icon: 'fa-users', label: t('home_teachersCardTitle') || 'هيئة التدريس', desc: t('home_teachersCardDesc') || 'تدبير ملفات الأساتذة والزيارات', colorClass: 'text-emerald-500', borderHoverClass: 'hover:border-emerald-500', activeBorderClass: 'border-emerald-500' },
    { id: 'reports', icon: 'fa-file-alt', label: t('home_reportsCardTitle') || 'تقارير الزيارة والتفتيش', desc: t('home_reportsCardDesc') || 'الاطلاع على تقارير التفتيش والزيارات', colorClass: 'text-amber-500', borderHoverClass: 'hover:border-amber-500', activeBorderClass: 'border-amber-500' },
    { id: 'otherReports', icon: 'fa-folder-open', label: t('home_otherReportsCardTitle') || 'تقارير أخرى', desc: t('home_otherReportsCardDesc') || 'المراسلات والتقارير الإدارية', colorClass: 'text-violet-500', borderHoverClass: 'hover:border-violet-500', activeBorderClass: 'border-violet-500' },
    { id: 'activitySummary', icon: 'fa-chart-pie', label: t('home_activitySummaryCardTitle') || 'ملخص الأنشطة', desc: t('home_activitySummaryCardDesc') || 'الحصيلة الدورية والسنوية للأنشطة', colorClass: 'text-red-500', borderHoverClass: 'hover:border-red-500', activeBorderClass: 'border-red-500' },
    { id: 'transmissionSlip', icon: 'fa-paper-plane', label: t('home_transmissionSlipCardTitle') || 'إرساليات', desc: t('home_transmissionSlipCardDesc') || 'وثيقة ضبط المراسلات الإدارية', colorClass: 'text-stone-600', borderHoverClass: 'hover:border-stone-600', activeBorderClass: 'border-stone-600' },
    { id: 'statistics', icon: 'fa-book', label: t('memos') || 'المذكرات', desc: t('memos_desc') || 'تدبير والاطلاع على المذكرات', colorClass: 'text-cyan-500', borderHoverClass: 'hover:border-cyan-500', activeBorderClass: 'border-cyan-500' },
    { id: 'research', icon: 'fa-lightbulb', label: t('home_researchCardTitle') || 'البحث التربوي', desc: t('home_researchCardDesc') || 'موجه منهجي لإعداد البحوث التربوية', colorClass: 'text-indigo-500', borderHoverClass: 'hover:border-indigo-500', activeBorderClass: 'border-indigo-500' },
  ];

  const handleLocalBackup = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_inspector_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (onRestore) onRestore(content);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={onClose}></div>
      )}
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full w-64 bg-[rgb(var(--color-card))] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir={dir}
      >
        <div className="p-3 border-b border-[rgb(var(--color-border))] flex justify-between items-center bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="hover:text-gray-300 dark:hover:text-slate-700 transition-colors">
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-sm font-bold">{t('menuList') || 'القائمة'}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                onNavigate('home');
                onClose();
              }} 
              className="hover:text-gray-300 dark:hover:text-slate-700 transition-colors"
              title={t('home_pageTitle') || 'الرئيسية'}
            >
              <i className="fas fa-home"></i>
            </button>
            <button 
              onClick={() => {
                onNavigate('settings');
                onClose();
              }} 
              className="hover:text-gray-300 dark:hover:text-slate-700 transition-colors"
              title={t('home_settingsCardTitle') || 'الإعدادات'}
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col">
          <ul className="space-y-3 px-3 flex-1">
            <li className="pb-2 mb-2 border-b border-[rgb(var(--color-border))]">
              <button
                onClick={() => {
                  onOpenInspectorModal();
                  onClose();
                }}
                className="w-full bg-[rgb(var(--color-card))] p-3 rounded-xl border border-[rgb(var(--color-border))] hover:border-blue-500 hover:shadow-md transition-all duration-300 text-start group flex items-center gap-3 min-h-[70px]"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-user-tie text-xl text-blue-500"></i>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-sm font-bold text-blue-500 mb-1">{t('sidebar_inspectorWindow') || 'نافذة المفتش'}</span>
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))] leading-tight">{t('sidebar_inspectorWindowDesc') || 'تعديل بيانات المفتش'}</span>
                </div>
              </button>
            </li>

            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full bg-[rgb(var(--color-card))] p-3 rounded-xl border border-[rgb(var(--color-border))] ${item.borderHoverClass} hover:shadow-md transition-all duration-300 text-start group flex items-center gap-3 min-h-[70px] ${
                    currentPage === item.id ? `${item.activeBorderClass} shadow-md bg-slate-50 dark:bg-slate-800` : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform duration-300`}>
                    <i className={`fas ${item.icon} text-xl ${item.colorClass}`}></i>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className={`text-sm font-bold ${item.colorClass} mb-1`}>{item.label}</span>
                    <span className="text-[10px] text-[rgb(var(--color-text-muted))] leading-tight">{item.desc}</span>
                  </div>
                </button>
              </li>
            ))}

            {isSuperAdmin && (
              <li className="pt-2 mt-2 border-t border-[rgb(var(--color-border))]">
                <button
                  onClick={() => {
                    onNavigate('adminUsers');
                    onClose();
                  }}
                  className={`w-full bg-[rgb(var(--color-card))] p-3 rounded-xl border border-sky-500 hover:shadow-md transition-all duration-300 text-start group flex items-center gap-3 min-h-[70px] ${
                    currentPage === 'adminUsers' ? 'bg-sky-50 dark:bg-sky-900/20 shadow-md border-sky-600' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-100 dark:bg-sky-900/30 group-hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-user-shield text-xl text-sky-600"></i>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-sm font-bold text-sky-600 mb-1">{language === 'ar' ? 'تدبير الزملاء' : 'Gestion collègues'}</span>
                    <span className="text-[10px] text-[rgb(var(--color-text-muted))] leading-tight">{language === 'ar' ? 'إضافة أو حذف مستخدمين مفوضين' : 'Gérer les utilisateurs autorisés'}</span>
                  </div>
                </button>
              </li>
            )}
            
            <li className="pt-2 mt-2 border-t border-[rgb(var(--color-border))]">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full bg-[rgb(var(--color-card))] p-3 rounded-xl border border-[rgb(var(--color-border))] hover:border-red-600 hover:shadow-md transition-all duration-300 text-start group flex items-center gap-3 min-h-[70px]"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-sign-out-alt text-xl text-red-600 dark:text-red-400"></i>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{t('logout') || 'تسجيل الخروج'}</span>
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))] leading-tight">{t('logoutFromCurrentAccount') || 'الخروج من حسابك الحالي'}</span>
                </div>
              </button>
            </li>
          </ul>
          
          <div className="px-3 mt-4">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col gap-3 bg-[rgb(var(--color-card))] p-3 rounded-xl border border-[rgb(var(--color-border))]">
              <span className="text-sm font-bold text-[rgb(var(--color-text-base))]">{t('backupAndAppearance') || 'النسخ الاحتياطي والمظهر'}</span>
              
              {/* Backup/Restore Row */}
              <div className="flex justify-center items-center gap-3 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg" dir="ltr">
                {/* Local Backup */}
                <button onClick={handleLocalBackup} className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors" title={t('sidebar_localBackup') || 'نسخ احتياطي محلي'}>
                  <i className="fas fa-download"></i>
                </button>
                
                {/* Local Restore */}
                <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors" title={t('sidebar_localRestore') || 'استعادة محلية'}>
                  <i className="fas fa-upload"></i>
                </button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                {/* Cloud Backup */}
                <button onClick={() => { if(onSyncToCloud) onSyncToCloud(); onClose(); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" title={t('sidebar_cloudBackup') || 'نسخ احتياطي سحابي'}>
                  <i className="fas fa-cloud-upload-alt"></i>
                </button>

                {/* Cloud Restore */}
                <button onClick={() => { if(onSyncFromCloud) onSyncFromCloud(); onClose(); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" title={t('sidebar_cloudRestore') || 'استعادة سحابية'}>
                  <i className="fas fa-cloud-download-alt"></i>
                </button>
              </div>

              <div className="flex justify-center items-center gap-3 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg" dir="ltr">
                {/* Light Original */}
                <button
                  onClick={() => theme !== 'light' && setTheme('light')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${theme === 'light' ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'}`}
                  style={{ background: '#f8fafc' }}
                  title="فاتح (أبيض)"
                ></button>
                
                {/* Light Warm */}
                <button
                  onClick={() => theme !== 'light-warm' && setTheme('light-warm')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${theme === 'light-warm' ? 'border-amber-500 scale-110 shadow-md' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'}`}
                  style={{ background: '#faf6f0' }}
                  title="فاتح (دافئ)"
                ></button>

                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                {/* Dark Original */}
                <button
                  onClick={() => theme !== 'dark' && setTheme('dark')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${theme === 'dark' ? 'border-blue-400 scale-110 shadow-md' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'}`}
                  style={{ background: '#1e293b' }}
                  title="داكن (أزرق)"
                ></button>

                {/* Dark Midnight */}
                <button
                  onClick={() => theme !== 'dark-midnight' && setTheme('dark-midnight')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${theme === 'dark-midnight' ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'}`}
                  style={{ background: '#05050a' }}
                  title="داكن (عميق)"
                ></button>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-slate-500 mt-6 mb-2">
            {t('sidebar_appVersion') || 'المفتش الذكي اصدار 1.1'}
          </div>
        </div>
      </div>
    </>
  );
};
