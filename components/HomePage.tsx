
import React, { useMemo, useState } from 'react';
import { SavedReport, OtherReport, ReportType } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface HomePageProps {
  reports: SavedReport[];
  otherReports: OtherReport[];
  onShowInspectorModal: () => void;
  onNavigateToTeachers: () => void;
  onNavigateToReports: () => void;
  onNavigateToOtherReports: () => void;
  onNavigateToActivitySummary: () => void;
  onNavigateToTransmissionSlip: () => void;
  onNavigateToInspectionSpace: () => void;
  onNavigateToStatistics: () => void;
  onNavigateToResearch: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ 
    reports,
    otherReports,
    onShowInspectorModal, 
    onNavigateToTeachers, 
    onNavigateToReports, 
    onNavigateToOtherReports, 
    onNavigateToActivitySummary,
    onNavigateToTransmissionSlip,
    onNavigateToInspectionSpace,
    onNavigateToStatistics,
    onNavigateToResearch
}) => {
  const { t } = useTranslations();
  const [selectedPeriod, setSelectedPeriod] = useState<'year' | 'semester1' | 'semester2'>('year');
  const [showOtherStats, setShowOtherStats] = useState(false);
  const [expandedOtherTypes, setExpandedOtherTypes] = useState<Record<string, boolean>>({
      'أنشطة أخرى': true
  });

  const toggleOtherType = (typeName: string) => {
    setExpandedOtherTypes(prev => ({
      ...prev,
      [typeName]: !prev[typeName]
    }));
  };

  const stats = useMemo(() => {
    const isSemester1 = (dateStr: string) => {
      if (!dateStr) return false;
      const month = new Date(dateStr).getMonth();
      // Sept (8) to Jan (0)
      return month >= 8 || month === 0;
    };

    const filteredReports = reports.filter(r => {
      if (selectedPeriod === 'year') return true;
      const sem1 = isSemester1(r.date);
      return selectedPeriod === 'semester1' ? sem1 : !sem1;
    });

    const filteredOtherReports = otherReports.filter(r => {
      if (selectedPeriod === 'year') return true;
      const sem1 = isSemester1(r.date);
      return selectedPeriod === 'semester1' ? sem1 : !sem1;
    });

    const visits = filteredReports.filter(r => r.reportType === ReportType.VISIT).length;
    const inspections = filteredReports.filter(r => r.reportType === ReportType.INSPECTION).length;
    const other = filteredOtherReports.length;
    const total = visits + inspections + other;
    
    // Calculate breakdown for other reports
    const otherBreakdown: Record<string, { count: number, categories?: Record<string, number> }> = {};
    
    // Pre-populate default categories for "أنشطة أخرى"
    otherBreakdown['أنشطة أخرى'] = { 
        count: 0, 
        categories: {
            "المصادقة على جداول الحصص": 0,
            "المصادقة على التوزيع الحلقي": 0,
            "مراسلة": 0,
            "تقرير إداري": 0,
            "غير مصنف": 0
        } 
    };

    filteredOtherReports.forEach(r => {
        let type = r.activityType || 'غير محدد';
        
        if (!otherBreakdown[type]) {
            otherBreakdown[type] = { count: 0 };
        }
        
        otherBreakdown[type].count++;

        if (type === 'أنشطة أخرى') {
            const cat = r.activityCategory || 'غير مصنف';
            if (!otherBreakdown[type].categories) {
                otherBreakdown[type].categories = {};
            }
            otherBreakdown[type].categories![cat] = (otherBreakdown[type].categories![cat] || 0) + 1;
        }
    });

    // Clean up empty categories
    if (otherBreakdown['أنشطة أخرى']) {
        if (otherBreakdown['أنشطة أخرى'].count === 0) {
            delete otherBreakdown['أنشطة أخرى'];
        } else if (otherBreakdown['أنشطة أخرى'].categories) {
            // Remove any category with 0 count
            Object.keys(otherBreakdown['أنشطة أخرى'].categories).forEach(cat => {
                if (otherBreakdown['أنشطة أخرى'].categories![cat] === 0) {
                    delete otherBreakdown['أنشطة أخرى'].categories![cat];
                }
            });
        }
    }

    // Sort breakdown by count descending and filter out zero counts
    const sortedOtherBreakdown = Object.entries(otherBreakdown)
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => {
            const result: any = { name, count: data.count };
            if (data.categories) {
                result.categories = Object.entries(data.categories)
                    .filter(([_, catCount]) => catCount > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([catName, catCount]) => ({ name: catName, count: catCount }));
            }
            return result;
        });

    return { visits, inspections, other, total, otherBreakdown: sortedOtherBreakdown };
  }, [reports, otherReports, selectedPeriod]);
  
  const periodText = selectedPeriod === 'year' ? (t('currentSeason') || 'الموسم الحالي') : selectedPeriod === 'semester1' ? (t('firstSemester') || 'الأسدس الأول') : (t('secondSemester') || 'الأسدس الثاني');
  
  return (
    <div className="flex flex-col items-center justify-start text-center">
       <h1 className="text-2xl font-bold text-[rgb(var(--color-text-base))]">{t('appTitle')}</h1>
       <p className="text-lg text-[rgb(var(--color-text-muted))] mt-2 mb-12 max-w-2xl">{t('appDescription')}</p>

      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <button type="button" onClick={onShowInspectorModal} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-sky-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-user-tie text-3xl sm:text-4xl text-sky-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-sky-500 mb-1">{t('home_inspectorCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_inspectorCardDesc')}</p>
            </button>
            <button type="button" onClick={onNavigateToInspectionSpace} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-users text-3xl sm:text-4xl text-emerald-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-emerald-500 mb-1">{t('home_teachersCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_teachersCardDesc')}</p>
            </button>
            <button type="button" onClick={onNavigateToReports} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-amber-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-file-alt text-3xl sm:text-4xl text-amber-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-amber-500 mb-1">{t('home_reportsCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_reportsCardDesc')}</p>
            </button>
             <button type="button" onClick={onNavigateToOtherReports} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-violet-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-file-invoice text-3xl sm:text-4xl text-violet-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-violet-500 mb-1">{t('home_otherReportsCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_otherReportsCardDesc')}</p>
            </button>
            <button type="button" onClick={onNavigateToTransmissionSlip} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-stone-600 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-paper-plane text-3xl sm:text-4xl text-stone-600 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-stone-600 mb-1">{t('home_transmissionSlipCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_transmissionSlipCardDesc')}</p>
            </button>
             <button type="button" onClick={onNavigateToActivitySummary} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-red-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-tasks text-3xl sm:text-4xl text-red-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-red-500 mb-1">{t('home_activitySummaryCardTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_activitySummaryCardDesc')}</p>
            </button>
            <button type="button" onClick={onNavigateToResearch} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-indigo-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-lightbulb text-3xl sm:text-4xl text-indigo-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-indigo-500 mb-1">{t('research_pageTitle')}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('home_researchCardDesc')}</p>
            </button>
            <button type="button" onClick={onNavigateToStatistics} className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] hover:border-cyan-500 hover:shadow-xl transition-all duration-300 text-center group flex flex-col justify-center items-center h-full min-h-[140px]">
                <i className="fas fa-book text-3xl sm:text-4xl text-cyan-500 mb-2 transition-transform duration-300 group-hover:scale-110"></i>
                <h2 className="text-base sm:text-xl font-bold text-cyan-500 mb-1">{t('memos') || 'المذكرات'}</h2>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">{t('memos_desc') || 'تدبير والاطلاع على المذكرات'}</p>
            </button>
        </div>

        {/* Concise Statistics Section */}
        <div className="mt-12 mb-8 text-right w-full md:w-1/2 mx-auto" dir="rtl">
            <h2 className="text-base font-bold text-[rgb(var(--color-text-base))] mb-4 flex items-center justify-center gap-2">
                <i className="fas fa-chart-pie text-emerald-500"></i>
                {t('generalStatistics') || 'إحصائيات عامة'} ({periodText})
            </h2>
            
            <div className="grid grid-cols-4 gap-0 mb-4 max-w-xs mx-auto" dir="rtl">
                <div className="text-center">
                    <div className="text-xl font-black text-sky-600">{stats.visits}</div>
                    <div className="text-[9px] text-[rgb(var(--color-text-muted))] uppercase font-bold">{t('visits') || 'زيارات'}</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-black text-violet-600">{stats.inspections}</div>
                    <div className="text-[9px] text-[rgb(var(--color-text-muted))] uppercase font-bold">{t('inspections') || 'تفتيشات'}</div>
                </div>
                <div 
                    className="text-center cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors p-1 -m-1"
                    onClick={() => setShowOtherStats(!showOtherStats)}
                    title="اضغط لعرض التفاصيل"
                >
                    <div className="text-xl font-black text-amber-600">{stats.other}</div>
                    <div className="text-[9px] text-[rgb(var(--color-text-muted))] uppercase font-bold flex items-center justify-center gap-1">
                        {t('other') || 'أخرى'}
                        <i className={`fas fa-chevron-${showOtherStats ? 'up' : 'down'} text-[8px]`}></i>
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-black text-emerald-600">{stats.total}</div>
                    <div className="text-[9px] text-[rgb(var(--color-text-muted))] uppercase font-bold">{t('total') || 'المجموع'}</div>
                </div>
            </div>

            {showOtherStats && stats.otherBreakdown.length > 0 && (
                <div className="mb-6 max-w-xs mx-auto bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-2 border-b border-amber-100 dark:border-amber-900/30 pb-1 text-center">{t('otherStatsDetails') || 'تفاصيل الأنشطة الأخرى'}</h3>
                    <div className="space-y-2">
                        {stats.otherBreakdown.map((item: any, index: number) => (
                            <div key={index} className="flex flex-col gap-1">
                                <div 
                                    className={`flex justify-between items-center text-xs ${item.categories && item.categories.length > 0 ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 p-1 -mx-1 rounded transition-colors' : 'p-1 -mx-1'}`}
                                    onClick={() => item.categories && item.categories.length > 0 && toggleOtherType(item.name)}
                                >
                                    <span className="text-slate-600 dark:text-slate-300 truncate pl-2 font-bold flex items-center gap-1" title={item.name}>
                                        {item.name}
                                        {item.categories && item.categories.length > 0 && (
                                            <i className={`fas fa-chevron-${expandedOtherTypes[item.name] ? 'up' : 'down'} text-[8px] text-amber-500`}></i>
                                        )}
                                    </span>
                                    <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{item.count}</span>
                                </div>
                                {expandedOtherTypes[item.name] && item.categories && item.categories.length > 0 && (
                                    <div className="pr-4 border-r-2 border-amber-100 dark:border-amber-900/30 space-y-1 mt-1 mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {item.categories.map((cat: any, catIndex: number) => (
                                            <div key={catIndex} className="flex justify-between items-center text-[10px]">
                                                <span className="text-slate-500 dark:text-slate-400 truncate pl-2" title={cat.name}>- {cat.name}</span>
                                                <span className="font-medium text-amber-500 bg-amber-50/50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">{cat.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-center">
                <div className="grid grid-cols-4 gap-0 h-20 w-full max-w-xs border-b border-r border-[rgb(var(--color-border))]" dir="rtl">
                    <div className="flex justify-center items-end pb-0 px-2">
                        <div className="w-8 bg-sky-500 rounded-t-md transition-all duration-500 hover:brightness-110" style={{ height: `${stats.total > 0 ? (stats.visits / stats.total) * 100 : 0}%` }}></div>
                    </div>
                    <div className="flex justify-center items-end pb-0 px-2">
                        <div className="w-8 bg-violet-500 rounded-t-md transition-all duration-500 hover:brightness-110" style={{ height: `${stats.total > 0 ? (stats.inspections / stats.total) * 100 : 0}%` }}></div>
                    </div>
                    <div 
                        className="flex justify-center items-end pb-0 px-2 cursor-pointer group"
                        onClick={() => setShowOtherStats(!showOtherStats)}
                        title="اضغط لعرض التفاصيل"
                    >
                        <div className="w-8 bg-amber-500 rounded-t-md transition-all duration-500 group-hover:brightness-110 group-hover:scale-105" style={{ height: `${stats.total > 0 ? (stats.other / stats.total) * 100 : 0}%` }}></div>
                    </div>
                    <div className="flex justify-center items-end pb-0 px-2">
                        {/* Total column - empty bar or maybe a different indicator */}
                        <div className="w-8 bg-emerald-500/20 rounded-t-md h-1"></div>
                    </div>
                </div>
            </div>

            {/* Period Selection Buttons */}
            <div className="flex justify-center gap-2 mt-6">
                <button 
                  onClick={() => setSelectedPeriod('year')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedPeriod === 'year' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-[rgb(var(--color-card))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border))] hover:bg-slate-50'}`}
                >
                  {t('currentSeason') || 'الموسم الحالي'}
                </button>
                <button 
                  onClick={() => setSelectedPeriod('semester1')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedPeriod === 'semester1' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-[rgb(var(--color-card))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border))] hover:bg-slate-50'}`}
                >
                  {t('firstSemester') || 'الأسدس الأول'}
                </button>
                <button 
                  onClick={() => setSelectedPeriod('semester2')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedPeriod === 'semester2' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-[rgb(var(--color-card))] text-[rgb(var(--color-text-muted))] border border-[rgb(var(--color-border))] hover:bg-slate-50'}`}
                >
                  {t('secondSemester') || 'الأسدس الثاني'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
