
import React, { useState, useMemo } from 'react';
import { SavedReport, ReportType } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { PageHeader } from './ui/PageHeader';

interface ReportsListPageProps {
  reports: SavedReport[];
  onStartNewReport: () => void;
  onViewReport: (report: SavedReport) => void;
  onEditReport: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  onToggleReportDelivered: (report: SavedReport) => void;
  onMarkAllDelivered?: (reportIds: string[]) => void;
  onGoHome: () => void;
}

const getAcademicYear = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  // If month is September (9) or later, it's part of the Year/Year+1 cycle
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export const ReportsListPage: React.FC<ReportsListPageProps> = ({ reports, onStartNewReport, onViewReport, onEditReport, onDeleteReport, onToggleReportDelivered, onMarkAllDelivered, onGoHome }) => {
  const { t, dir, language } = useTranslations();
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterType, setFilterType] = useState<'all' | ReportType>('all');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterLang, setFilterLang] = useState<'all' | 'ar' | 'fr'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const initialPinchDistance = React.useRef<number | null>(null);
  const initialZoom = React.useRef<number>(1);

  const uniqueTeacherNames = useMemo(() => {
    const names = reports.map(r => r.teacherName);
    return [...new Set(names)].sort((a: string, b: string) => a.localeCompare(b, 'ar'));
  }, [reports]);

  const uniqueYears = useMemo(() => {
    const years = reports.map(r => getAcademicYear(r.date));
    return [...new Set(years)].sort().reverse(); // Newest first
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports
      .map(report => {
        let lessonPlanImage: string | null = null;
        if (report.observation) {
            try {
                const obs = typeof report.observation === 'string' 
                    ? JSON.parse(report.observation) 
                    : report.observation;
                if (obs && obs.lessonPlanImage) {
                    lessonPlanImage = obs.lessonPlanImage;
                }
            } catch (e) {}
        }
        return { ...report, hasImage: !!lessonPlanImage, lessonPlanImage };
      })
      .filter(report => 
        (filterTeacher === '' || report.teacherName === filterTeacher) &&
        (filterType === 'all' || report.reportType === filterType) &&
        (filterYear === '' || getAcademicYear(report.date) === filterYear) &&
        (filterLang === 'all' || (report.language || 'ar') === filterLang)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, filterTeacher, filterType, filterYear, filterLang]);
  
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        try {
            let d: Date;
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-');
                d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                d = new Date(dateStr);
            }
            
            if (isNaN(d.getTime())) return dateStr;
            
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            
            return language === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
        } catch (e) {
            return dateStr;
        }
    };

  const getReportTypeLabel = (type: ReportType) => {
    return type === ReportType.INSPECTION ? t('inspection') : t('visit');
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        title={
            <div className="flex items-center gap-4">
                <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700">
                    <i className="fas fa-home"></i>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-amber-500">{t('reportsList_pageTitle')}</h1>
            </div>
        }
        actions={
            <div className="flex space-x-2 rtl:space-x-reverse">
                {onMarkAllDelivered && filteredReports.some(r => !r.delivered) && (
                    <button onClick={() => onMarkAllDelivered(filteredReports.map(r => String(r.id)))} title="تسليم الكل" className="btn btn-secondary bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 w-10 h-10 p-0 flex items-center justify-center">
                        <i className="fas fa-check-double"></i>
                    </button>
                )}
                <button onClick={onStartNewReport} title={t('reportsList_newReport')} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 w-10 h-10 p-0 flex items-center justify-center">
                    <i className="fas fa-plus"></i>
                </button>
            </div>
        }
      />

      <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] mb-6">
        <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] mb-4">{t('reportsList_filterTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="teacherFilter" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher')}</label>
            <select
              id="teacherFilter"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="input-style w-full"
            >
              <option value="">{t('reportsList_allTeachers')}</option>
              {uniqueTeacherNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('reportsList_reportType')}</label>
            <select
              id="typeFilter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="input-style w-full"
            >
              <option value="all">{t('reportsList_allTypes')}</option>
              <option value={ReportType.VISIT}>{t('visit')}</option>
              <option value={ReportType.INSPECTION}>{t('inspection')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="yearFilter" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('reportsList_academicYear')}</label>
            <select
              id="yearFilter"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="input-style w-full"
            >
              <option value="">{t('reportsList_allYears')}</option>
              {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="md:col-span-3 border-t border-[rgb(var(--color-border))] pt-4 mt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-sm font-medium text-[rgb(var(--color-text-base))]">{t('filter_language')}</span>
              <div className="flex bg-[rgb(var(--color-background))] p-1 rounded-lg border border-[rgb(var(--color-border))]">
                <button
                  onClick={() => setFilterLang('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterLang === 'all' ? 'bg-amber-500 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
                >
                  {t('lang_all')}
                </button>
                <button
                  onClick={() => setFilterLang('ar')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterLang === 'ar' ? 'bg-amber-500 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
                >
                  {t('lang_ar_btn')}
                </button>
                <button
                  onClick={() => setFilterLang('fr')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterLang === 'fr' ? 'bg-amber-500 text-white shadow-sm' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
                >
                  {t('lang_fr_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-[rgb(var(--color-card))] rounded-xl border border-[rgb(var(--color-border))]">
            <i className="fas fa-folder-open text-6xl text-slate-300 mb-4"></i>
            <p className="text-[rgb(var(--color-text-muted))] text-xl">{t('reportsList_noResults')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[rgb(var(--color-card))] rounded-xl shadow-sm border border-[rgb(var(--color-border))]">
            <table className="min-w-full divide-y divide-[rgb(var(--color-border))]">
                <thead className="bg-[rgb(var(--color-background))]">
                    <tr>
                        <th scope="col" className={`px-6 py-3 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider`}>{t('teacher')}</th>
                        <th scope="col" className={`px-6 py-3 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider`}>{t('type')}</th>
                        <th scope="col" className={`px-6 py-3 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider`}>{t('date')}</th>
                        <th scope="col" className={`px-6 py-3 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider`}>{t('score')}</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-[rgb(var(--color-card))] divide-y divide-[rgb(var(--color-border))]">
                    {filteredReports.map((report, index) => (
                        <tr key={report.id || index} className="hover:bg-[rgb(var(--color-card-hover))] transition-colors">
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${report.delivered ? 'text-slate-500 dark:text-slate-400' : 'text-[rgb(var(--color-text-base))]'}`}>
                                <div className="flex items-center gap-2">
                                  <span>{report.teacherName}</span>
                                  {report.hasImage && report.lessonPlanImage && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImage(report.lessonPlanImage);
                                        }}
                                        className="text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                        title={t('reportHasLessonPlan')}
                                    >
                                        <i className="fas fa-camera"></i>
                                    </button>
                                  )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${report.reportType === ReportType.INSPECTION ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>
                                        {getReportTypeLabel(report.reportType)}
                                    </span>
                                    {report.language === 'fr' && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 text-slate-500 bg-white">
                                            FR
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))]">{formatDate(report.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))] font-semibold">
                                {report.reportType === ReportType.INSPECTION && report.score != null ? <span dir="ltr">{report.score}/20</span> : '---'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex justify-center items-center space-x-4 rtl:space-x-reverse">
                                    <button 
                                        onClick={() => onToggleReportDelivered(report)} 
                                        className={`${report.delivered ? 'text-emerald-600' : 'text-slate-400'} hover:text-emerald-700 transition-colors`} 
                                        title={report.delivered ? "تم التسليم" : "تحديد كمُسلّم"}
                                    >
                                        <i className={`fas ${report.delivered ? 'fa-check-circle' : 'fa-check'} fa-lg`}></i>
                                    </button>
                                    <button onClick={() => onViewReport(report)} className="text-sky-600 hover:text-sky-900" title={t('viewExport')}>
                                        <i className="fas fa-eye fa-lg"></i>
                                    </button>
                                    <button onClick={() => onEditReport(report)} className="text-amber-600 hover:text-amber-900" title={t('edit')}>
                                        <i className="fas fa-edit fa-lg"></i>
                                    </button>
                                    <button onClick={() => onDeleteReport(report)} className="text-rose-600 hover:text-rose-900" title={t('delete')}>
                                        <i className="fas fa-trash-alt fa-lg"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => { setSelectedImage(null); setZoom(1); setRotation(0); }}>
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700 text-white shrink-0">
                    <h3 className="font-bold px-2 flex items-center gap-2">
                        <i className="fas fa-image"></i>
                        {t('reportHasLessonPlan')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-700 rounded-lg p-1 mr-4">
                            <button 
                                onClick={() => setZoom(z => Math.max(0.1, Math.round((z - 0.05) * 100) / 100))}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded text-white transition-colors"
                                title={t('zoomOut') || "Zoom Out"}
                            >
                                <i className="fas fa-minus"></i>
                            </button>
                            <span className="w-12 text-center text-sm font-mono">{Math.round(zoom * 100)}%</span>
                            <button 
                                onClick={() => setZoom(z => Math.min(5, Math.round((z + 0.05) * 100) / 100))}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded text-white transition-colors"
                                title={t('zoomIn') || "Zoom In"}
                            >
                                <i className="fas fa-plus"></i>
                            </button>
                            <div className="w-px h-4 bg-gray-500 mx-2"></div>
                            <button 
                                onClick={() => setRotation(r => r + 90)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded text-white transition-colors"
                                title={t('rotate') || "Rotate"}
                            >
                                <i className="fas fa-redo"></i>
                            </button>
                            <button 
                                onClick={() => { setZoom(1); setRotation(0); }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-600 rounded text-white transition-colors"
                                title={t('reset') || "Reset"}
                            >
                                <i className="fas fa-compress"></i>
                            </button>
                        </div>
                        <button 
                            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                            onClick={() => { setSelectedImage(null); setZoom(1); setRotation(0); }}
                        >
                            <i className="fas fa-times fa-lg"></i>
                        </button>
                    </div>
                </div>
                
                {/* Image Container */}
                <div 
                    className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4 relative touch-none"
                    onWheel={(e) => {
                        if (e.ctrlKey) {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.05 : 0.05;
                            setZoom(z => Math.min(5, Math.max(0.1, Math.round((z + delta) * 100) / 100)));
                        }
                    }}
                    onTouchStart={(e) => {
                        if (e.touches.length === 2) {
                            const touch1 = e.touches[0];
                            const touch2 = e.touches[1];
                            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
                            initialPinchDistance.current = dist;
                            initialZoom.current = zoom;
                        }
                    }}
                    onTouchMove={(e) => {
                        if (e.touches.length === 2 && initialPinchDistance.current !== null) {
                            const touch1 = e.touches[0];
                            const touch2 = e.touches[1];
                            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
                            const scaleFactor = dist / initialPinchDistance.current;
                            let newZoom = initialZoom.current * scaleFactor;
                            // Snap to 0.05 increments (1/20)
                            newZoom = Math.round(newZoom * 20) / 20;
                            setZoom(Math.min(5, Math.max(0.1, newZoom)));
                        }
                    }}
                    onTouchEnd={() => {
                        initialPinchDistance.current = null;
                    }}
                >
                    <div 
                        style={{ 
                            transform: `rotate(${rotation}deg) scale(${zoom})`,
                            transition: 'transform 0.1s ease-out',
                            transformOrigin: 'center center',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <img 
                            src={selectedImage} 
                            alt="Lesson Plan" 
                            className="object-contain shadow-2xl bg-white"
                            style={{
                                maxHeight: '80vh',
                                maxWidth: '100%',
                                cursor: zoom > 1 ? 'grab' : 'default'
                            }}
                            draggable={false}
                        />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
