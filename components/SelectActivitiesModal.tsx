
import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { SavedReport, OtherReport, TransmissionSlipItem, ReportType, Teacher } from '../types';

interface SelectActivitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    reports: SavedReport[];
    otherReports: OtherReport[];
    onAdd: (items: TransmissionSlipItem[]) => void;
    existingItems: TransmissionSlipItem[];
    teachers: Teacher[];
}

interface UnifiedReportForSelection {
    id: string | number;
    type: 'visit' | 'inspection' | 'other' | 'activity_summary';
    date: string;
    subject: string;
}

export const SelectActivitiesModal: React.FC<SelectActivitiesModalProps> = ({ isOpen, onClose, reports, otherReports, teachers, onAdd, existingItems }) => {
    const { t, language } = useTranslations();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Filters
    const [filterSemester, setFilterSemester] = useState<'all' | 's1' | 's2'>('all');
    const [filterType, setFilterType] = useState<'all' | 'pedagogical' | 'other'>('all');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterLang, setFilterLang] = useState<'all' | 'ar' | 'fr'>('all');

    // New state for bulk actions
    const [defaultCopies, setDefaultCopies] = useState<number>(1);
    const [defaultNotes, setDefaultNotes] = useState<string>('');

    const unifiedReports = useMemo((): UnifiedReportForSelection[] => {
        const existingReportIds = new Set(existingItems.map(item => String(item.reportId)));
        
        const getSemester = (dateString: string): 's1' | 's2' => {
            const date = new Date(dateString);
            const month = date.getMonth() + 1; // 1-12
            // S1: Sept (9) to Jan (1)
            // S2: Feb (2) to Aug (8)
            return (month >= 9 || month === 1) ? 's1' : 's2';
        };

        const getAcademicYear = (dateString: string): string => {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        };

        // 1. Pedagogical Reports
        const pedagogicalReports: UnifiedReportForSelection[] = reports
            .filter(r => r.id && !existingReportIds.has(String(r.id)))
            .filter(r => filterLang === 'all' || (r.language || 'ar') === filterLang)
            .filter(r => filterType === 'all' || filterType === 'pedagogical')
            .filter(r => filterSemester === 'all' || getSemester(r.date) === filterSemester)
            .filter(r => filterYear === 'all' || getAcademicYear(r.date) === filterYear)
            .map(r => {
                const teacher = teachers.find(t => String(t.id) === String(r.teacherId));
                const teacherTitle = teacher?.genre === 'female' ? t('teacher_female') : t('teacher_male');
                const subjectWithEmployeeId = `${r.reportType === ReportType.VISIT ? t('visit') : t('inspection')} - ${teacherTitle} ${r.teacherName}${teacher ? ` (${t('teacher_employeeId')}: ${teacher.employeeId})` : ''}`;
                return {
                    id: r.id!,
                    type: r.reportType,
                    date: r.date,
                    subject: subjectWithEmployeeId
                };
            });

        // 2. Administrative/Other Reports
        const administrativeReports: UnifiedReportForSelection[] = otherReports
            .filter(o => o.id && !existingReportIds.has(String(o.id)))
            .filter(o => filterLang === 'all' || (o.language || 'ar') === filterLang)
            .filter(o => filterType === 'all' || filterType === 'other')
            .filter(o => filterSemester === 'all' || getSemester(o.date) === filterSemester)
            .filter(o => filterYear === 'all' || getAcademicYear(o.date) === filterYear)
            .map(o => ({
                id: o.id!,
                type: 'other',
                date: o.date,
                subject: o.subject
            }));

        // 3. Activity Summaries (Virtual Reports)
        const now = new Date();
        const currentYear = now.getFullYear();
        const month = now.getMonth() + 1;
        const academicYear = month >= 9 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
        const todayStr = now.toISOString().split('T')[0];

        const summaries: UnifiedReportForSelection[] = ([
            { id: `summary_s1_${academicYear}`, type: 'activity_summary', date: todayStr, subject: `${t('activitySummary_pageTitle')} - ${t('activitySummary_semester1')} (${academicYear})`, semester: 's1', academicYear },
            { id: `summary_s2_${academicYear}`, type: 'activity_summary', date: todayStr, subject: `${t('activitySummary_pageTitle')} - ${t('activitySummary_semester2')} (${academicYear})`, semester: 's2', academicYear },
            { id: `summary_annual_${academicYear}`, type: 'activity_summary', date: todayStr, subject: `${t('activitySummary_pageTitle')} - ${t('activitySummary_annual')} (${academicYear})`, semester: 'all', academicYear }
        ] as any[]).filter(s => {
            if (existingReportIds.has(String(s.id))) return false;
            if (filterType !== 'all' && filterType !== 'other') return false; // Summaries are administrative
            if (filterSemester !== 'all' && s.semester !== 'all' && s.semester !== filterSemester) return false;
            if (filterYear !== 'all' && s.academicYear !== filterYear) return false;
            return true;
        });

        return [...summaries, ...pedagogicalReports, ...administrativeReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reports, otherReports, existingItems, t, teachers, filterSemester, filterType, filterYear, filterLang]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        const getAcademicYear = (dateString: string): string => {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        };
        reports.forEach(r => years.add(getAcademicYear(r.date)));
        otherReports.forEach(o => years.add(getAcademicYear(o.date)));
        return Array.from(years).sort().reverse();
    }, [reports, otherReports]);

    const handleToggleSelectAll = () => {
        if (selectedIds.size === unifiedReports.length && unifiedReports.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(unifiedReports.map(r => String(r.id))));
        }
    };

    const handleToggleSelect = (id: string | number) => {
        const stringId = String(id);
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stringId)) {
                newSet.delete(stringId);
            } else {
                newSet.add(stringId);
            }
            return newSet;
        });
    };

    const handleAddSelected = () => {
        const itemsToAdd: TransmissionSlipItem[] = [];
        unifiedReports.forEach(report => {
            if (selectedIds.has(String(report.id))) {
                itemsToAdd.push({
                    reportId: report.id,
                    reportType: report.type,
                    reportSubject: report.subject,
                    copyCount: defaultCopies, // Use the bulk value
                    notes: defaultNotes       // Use the bulk value
                });
            }
        });
        onAdd(itemsToAdd);
        setSelectedIds(new Set());
        // Reset defaults
        setDefaultCopies(1);
        setDefaultNotes('');
    };

    const getReportTypeLabel = (type: 'visit' | 'inspection' | 'other' | 'activity_summary') => {
        switch (type) {
          case 'visit': return t('visit');
          case 'inspection': return t('inspection');
          case 'other': return t('activitySummary_type_other');
          case 'activity_summary': return t('slip_activity_summary');
          default: return '';
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('selectActivities_title')} size="4xl">
            <div className="max-h-[80vh] flex flex-col">
                {/* Filters Section */}
                <div className="flex flex-wrap gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('reportsList_academicYear')}</label>
                        <select 
                            value={filterYear} 
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="input-style py-1 px-2 text-sm w-full"
                        >
                            <option value="all">{t('reportsList_allYears')}</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('activitySummary_semester')}</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFilterSemester('all')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterSemester === 'all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('all')}
                            </button>
                            <button 
                                onClick={() => setFilterSemester('s1')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterSemester === 's1' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('activitySummary_semester1')}
                            </button>
                            <button 
                                onClick={() => setFilterSemester('s2')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterSemester === 's2' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('activitySummary_semester2')}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('type')}</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFilterType('all')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterType === 'all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('all')}
                            </button>
                            <button 
                                onClick={() => setFilterType('pedagogical')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterType === 'pedagogical' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('inspectionSpace_pedagogicalReports')}
                            </button>
                            <button 
                                onClick={() => setFilterType('other')} 
                                className={`flex-1 py-1 px-3 text-sm rounded-md border transition-colors ${filterType === 'other' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                                {t('activitySummary_type_other')}
                            </button>
                        </div>
                    </div>
                    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <span className="text-xs font-bold text-slate-500">{t('filter_language')}</span>
                        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
                            <button
                                onClick={() => setFilterLang('all')}
                                className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${filterLang === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {t('lang_all')}
                            </button>
                            <button
                                onClick={() => setFilterLang('ar')}
                                className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${filterLang === 'ar' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {t('lang_ar_btn')}
                            </button>
                            <button
                                onClick={() => setFilterLang('fr')}
                                className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${filterLang === 'fr' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {t('lang_fr_btn')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow min-h-[300px]">
                    {unifiedReports.length > 0 ? (
                        <table className="min-w-full divide-y divide-[rgb(var(--color-border))]">
                             <thead className="bg-[rgb(var(--color-background))] sticky top-0 z-10">
                                <tr>
                                    <th className="w-12 bg-[rgb(var(--color-background))] p-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                                            checked={unifiedReports.length > 0 && selectedIds.size === unifiedReports.length}
                                            onChange={handleToggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase bg-[rgb(var(--color-background))]">{t('subject')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase bg-[rgb(var(--color-background))]">{t('type')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase bg-[rgb(var(--color-background))]">{t('date')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[rgb(var(--color-card))] divide-y divide-[rgb(var(--color-border))]">
                                {unifiedReports.map(report => (
                                    <tr key={report.id} className="hover:bg-[rgb(var(--color-card-hover))] cursor-pointer" onClick={() => handleToggleSelect(report.id)}>
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 pointer-events-none"
                                                checked={selectedIds.has(String(report.id))}
                                                readOnly
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium">{report.subject}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                              report.type === 'inspection' ? 'bg-violet-100 text-violet-800' :
                                              report.type === 'visit' ? 'bg-sky-100 text-sky-800' :
                                              report.type === 'activity_summary' ? 'bg-emerald-100 text-emerald-800' :
                                              'bg-slate-100 text-slate-800'
                                            }`}>
                                              {getReportTypeLabel(report.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))]">
                                            {new Date(report.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-[rgb(var(--color-text-muted))] py-8">{t('selectActivities_noReports')}</p>
                    )}
                </div>
                
                <div className="flex-shrink-0 border-t border-[rgb(var(--color-border))] mt-4 pt-4">
                    {/* Bulk Edit Section */}
                    {selectedIds.size > 0 && (
                        <div className="bg-sky-50 dark:bg-sky-900/20 p-3 rounded-lg border border-sky-100 dark:border-sky-800 mb-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center animate-fadeIn">
                            <div className="flex-1 w-full sm:w-auto">
                                <label className="block text-xs font-bold text-sky-700 dark:text-sky-400 mb-1">{t('slip_item_copies')} (للكل)</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={defaultCopies} 
                                    onChange={(e) => setDefaultCopies(parseInt(e.target.value) || 1)} 
                                    className="input-style py-1 px-2 text-sm w-full font-bold text-center" 
                                />
                            </div>
                            <div className="flex-[3] w-full sm:w-auto">
                                <label className="block text-xs font-bold text-sky-700 dark:text-sky-400 mb-1">{t('slip_item_notes')} (للكل)</label>
                                <input 
                                    type="text" 
                                    value={defaultNotes} 
                                    onChange={(e) => setDefaultNotes(e.target.value)} 
                                    className="input-style py-1 px-2 text-sm w-full" 
                                    placeholder="ملاحظات موحدة..." 
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors">{t('cancel')}</button>
                        <button onClick={handleAddSelected} disabled={selectedIds.size === 0} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-sky-300 shadow-sm">
                        {t('selectActivities_add', selectedIds.size)}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
