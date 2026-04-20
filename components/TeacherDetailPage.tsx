
import React, { useMemo, useState, useEffect } from 'react';
import { Teacher, SavedReport, ReportType, License } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { PageHeader } from './ui/PageHeader';

interface TeacherDetailPageProps {
  teacher: Teacher;
  reports: SavedReport[];
  onBack: () => void;
  onGoHome: () => void;
  onViewReport: (report: SavedReport) => void;
  onStartVisit: (teacher: Teacher) => void;
  onStartInspection: (teacher: Teacher) => void;
  onEditReport: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  onToggleReportDelivered: (report: SavedReport) => void;
}

export const TeacherDetailPage: React.FC<TeacherDetailPageProps> = ({ teacher, reports, onBack, onGoHome, onViewReport, onStartVisit, onStartInspection, onEditReport, onDeleteReport, onToggleReportDelivered }) => {
  const { t, dir, language } = useTranslations();
  
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

  const teacherTitle = teacher.genre === 'female' ? t('teacher_female') : t('teacher_male');
  const [licenses, setLicenses] = useState<License[]>([]);

  const getReportTypeLabel = (type: ReportType) => {
    return type === ReportType.INSPECTION ? t('inspection') : t('visit');
  };

  const scoreEvolution = useMemo(() => {
      let inspections = reports
          .filter(r => r.reportType === ReportType.INSPECTION && r.score !== undefined && r.score !== null)
          .map(r => ({
              id: String(r.id),
              date: r.date,
              score: Number(r.score),
              source: 'report'
          }));

      if (inspections.length === 0) {
          if (teacher.lastInspectionScore !== null && teacher.lastInspectionScore !== undefined) {
              const fallbackDate = teacher.lastInspectionDate || new Date().toISOString().split('T')[0];
              inspections.push({
                  id: 'profile_data',
                  date: fallbackDate,
                  score: Number(teacher.lastInspectionScore),
                  source: 'profile'
              });
          }
      }

      inspections.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (inspections.length === 0) return [];

      return inspections.map((curr, index) => {
          const prev = index > 0 ? inspections[index - 1] : null;
          let trend: 'up' | 'down' | 'flat' | 'start' = 'start';
          let diff = 0;

          if (prev) {
              diff = curr.score - prev.score;
              if (diff > 0) trend = 'up';
              else if (diff < 0) trend = 'down';
              else trend = 'flat';
          }
          
          let academicYear = '---';
          const dateObj = new Date(curr.date);
          if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;
              academicYear = month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
          }

          return {
              id: curr.id,
              academicYear,
              date: curr.date,
              score: curr.score,
              trend,
              diff: Math.abs(diff).toFixed(2),
              source: curr.source
          };
      }).reverse(); 
  }, [reports, teacher]);

  const chartData = useMemo(() => [...scoreEvolution].reverse(), [scoreEvolution]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        title={
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700 shrink-0">
                    <i className="fas fa-home"></i>
                </button>
                <div className="flex items-center gap-3">
                    {teacher.image && (
                         <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-[rgb(var(--color-border))] shrink-0">
                            <img src={teacher.image} alt={teacher.fullName} className="h-full w-full object-cover" />
                         </div>
                    )}
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">
                        <span className="text-emerald-500 block sm:inline">{t('teacherDetail_pageTitle')}:</span>
                        <span className="text-[rgb(var(--color-text-base))] block sm:inline sm:ltr:ml-2 sm:rtl:mr-2"> {teacherTitle} {teacher.fullName}</span>
                        {teacher.fullNameFr && (
                            <span className="text-[rgb(var(--color-text-muted))] block sm:inline sm:ltr:ml-2 sm:rtl:mr-2 text-sm sm:text-base opacity-70">
                                ({teacher.fullNameFr})
                            </span>
                        )}
                    </h1>
                </div>
            </div>
        }
        actions={
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
               <button onClick={() => onStartVisit(teacher)} className="btn bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center flex-1 sm:flex-none px-3 py-2">
                  <i className="fas fa-chalkboard-teacher ltr:mr-2 rtl:ml-2"></i>
                  <span className="hidden sm:inline">{t('teacherDetail_addVisit')}</span>
                  <span className="sm:hidden text-sm">{t('visit')}</span>
              </button>
               <button onClick={() => onStartInspection(teacher)} className="btn bg-violet-600 text-white hover:bg-violet-700 flex items-center justify-center flex-1 sm:flex-none px-3 py-2">
                  <i className="fas fa-search ltr:mr-2 rtl:ml-2"></i>
                  <span className="hidden sm:inline">{t('teacherDetail_addInspection')}</span>
                  <span className="sm:hidden text-sm">{t('inspection')}</span>
              </button>
              <button onClick={onBack} className="btn bg-slate-600 text-white hover:bg-slate-700 flex items-center justify-center shrink-0 px-3 py-2">
                <i className={`fas ${dir === 'rtl' ? 'fa-arrow-right' : 'fa-arrow-left'} ltr:mr-2 rtl:ml-2`}></i>
                <span className="hidden sm:inline">{t('back')}</span>
              </button>
            </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl shadow-sm border border-[rgb(var(--color-border))]">
            <div className="flex flex-col items-center mb-6">
                <div className="h-24 w-24 rounded-full bg-[rgb(var(--color-background))] border-4 border-[rgb(var(--color-border))] flex items-center justify-center text-[rgb(var(--color-text-muted))] overflow-hidden mb-3">
                    {teacher.image ? (
                        <img src={teacher.image} alt={teacher.fullName} className="h-full w-full object-cover" />
                    ) : (
                        <i className="fas fa-user text-5xl"></i>
                    )}
                </div>
                <h3 className="text-lg font-bold text-[rgb(var(--color-text-base))] text-center">{teacher.fullName}</h3>
                {teacher.fullNameFr && <p className="text-xs text-[rgb(var(--color-text-muted))] text-center opacity-70 mb-1">{teacher.fullNameFr}</p>}
                <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">{teacher.institution}</p>
                <span className={`px-2 py-1 mt-2 rounded-full text-xs font-semibold ${teacher.sector === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {teacher.sector === 'private' ? t('sector_private') : t('sector_public')}
                </span>
            </div>

            <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mb-4">{t('teacherDetail_infoCardTitle')}</h2>
            <div className="space-y-3 text-sm text-[rgb(var(--color-text-base))]">
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_employeeId')}:</strong> 
                  <span>{teacher.employeeId}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('sector_label')}:</strong>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${teacher.sector === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {teacher.sector === 'private' ? t('sector_private') : t('sector_public')}
                  </span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_institution')}:</strong> 
                  <span className="text-left" dir="auto">{teacher.institution}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_framework')}:</strong> 
                  <span>{t(String(teacher.framework).trim()) || teacher.framework}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_subject')}:</strong> 
                  <span>{t(String(teacher.subject).trim()) || teacher.subject}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_grade')}:</strong> 
                  <span>{t(String(teacher.grade).trim()) || String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', '')}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_rank')}:</strong> 
                  <span>{teacher.rank}</span>
              </p>
            </div>
            
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mt-6 mb-4">{t('addTeacherModal_lastInspectionTitle')}</h2>
            <div className="space-y-3 text-sm text-[rgb(var(--color-text-base))]">
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_lastScore')}:</strong> 
                  <span className="font-bold text-sky-600">{teacher.lastInspectionScore ?? '---'}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_lastDate')}:</strong> 
                  <span>{teacher.lastInspectionDate ? formatDate(teacher.lastInspectionDate) : '---'}</span>
              </p>
              <p className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                  <strong>{t('teacher_lastInspector')}:</strong> 
                  <span>{teacher.lastInspector || '---'}</span>
              </p>
            </div>
          </div>

          {(scoreEvolution.length > 0) && (
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border))] animate-fadeIn">
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mb-4 flex items-center gap-2">
                    <i className="fas fa-chart-line text-emerald-500"></i>
                    {t('scheduleModal_scoreEvolution') || 'تطور النقطة:'}
                </h2>
                
                <div className="relative flex flex-col justify-end w-full mb-6 pb-2" dir="ltr">
                    <div className="flex h-48 w-full gap-2 text-xs">
                        <div className="flex flex-col justify-between h-full text-[rgb(var(--color-text-muted))] font-bold py-1 pr-2 border-r border-[rgb(var(--color-border))]">
                            <span>20</span>
                            <span>15</span>
                            <span>10</span>
                            <span>05</span>
                            <span>00</span>
                        </div>

                        <div className="relative flex-1 h-full flex items-end px-2 gap-4 overflow-x-auto overflow-y-hidden">
                            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                <div className="h-px w-full bg-[rgb(var(--color-border))] opacity-50 absolute top-[0%]"></div>
                                <div className="h-px w-full bg-[rgb(var(--color-border))] opacity-50 absolute top-[25%]"></div>
                                <div className="h-px w-full bg-[rgb(var(--color-border))] opacity-50 absolute top-[50%]"></div>
                                <div className="h-px w-full bg-[rgb(var(--color-border))] opacity-50 absolute top-[75%]"></div>
                                <div className="h-px w-full bg-[rgb(var(--color-border))] opacity-50 absolute bottom-0"></div>
                            </div>

                            {chartData.map((item, idx) => (
                                <div key={item.id} className="flex flex-col items-center justify-end h-full gap-1 group relative flex-1 min-w-[30px] z-10">
                                    <div className="absolute -top-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none shadow-lg mb-1">
                                        {item.score}/20 ({item.academicYear})
                                    </div>
                                    
                                    <div className="w-full flex items-end justify-center h-full relative">
                                        <div 
                                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-700 ease-out shadow-sm border-x border-t border-white/20 relative group-hover:brightness-110 ${
                                                idx === chartData.length - 1 
                                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' 
                                                : 'bg-gradient-to-t from-sky-400 to-sky-300 opacity-80'
                                            }`}
                                            style={{ height: `${(item.score / 20) * 100}%` }}
                                        >
                                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-500 dark:text-slate-400">
                                                {item.score}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-8 w-full relative">
                                        <span className="absolute top-2 left-1/2 -translate-x-1/2 -rotate-45 text-[8px] font-bold text-[rgb(var(--color-text-muted))] whitespace-nowrap origin-center">
                                            {item.academicYear.split('/')[1] || item.academicYear}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-center text-[9px] font-bold text-[rgb(var(--color-text-muted))] mt-2">{t('scheduleModal_academicYears') || 'المواسم الدراسية'}</div>
                </div>

                <div className="space-y-2">
                    {scoreEvolution.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-[rgb(var(--color-background))] rounded-lg border border-[rgb(var(--color-border))] hover:shadow-md transition-all">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[rgb(var(--color-text-muted))]">{item.academicYear}</span>
                                    {item.source === 'profile' && <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full font-bold">سابق</span>}
                                </div>
                                <span className="text-[10px] text-slate-400">{formatDate(item.date)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-black text-sm text-[rgb(var(--color-text-base))]">{Number(item.score).toFixed(2)}</span>
                                {item.trend === 'up' && <span className="text-emerald-500 text-xs flex items-center bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full font-bold"><i className="fas fa-arrow-up mr-1"></i>+{item.diff}</span>}
                                {item.trend === 'down' && <span className="text-rose-500 text-xs flex items-center bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full font-bold"><i className="fas fa-arrow-down mr-1"></i>-{item.diff}</span>}
                                {item.trend === 'flat' && <span className="text-slate-400 text-xs flex items-center bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold"><i className="fas fa-minus"></i></span>}
                                {item.trend === 'start' && <span className="text-sky-500 text-[10px] font-bold bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">بداية</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {licenses && licenses.filter(l => String(l.user_id) === String(teacher.id)).length > 0 && (
              <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl shadow-md border border-[rgb(var(--color-border))] animate-fadeIn">
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mb-4 flex items-center gap-2">
                      <i className="fas fa-calendar-alt text-amber-500"></i>
                      {t('licensesAndAbsences') || 'سجل الرخص والغيابات'}
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {licenses.filter(l => String(l.user_id) === String(teacher.id))
                          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                          .map(license => {
                              const today = new Date().toLocaleDateString('fr-CA');
                              const isCurrent = today >= license.start_date && today <= license.end_date;
                              const isPast = today > license.end_date;
                              const isFuture = today < license.start_date;
                              
                              let statusColor = 'bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-base))] border-[rgb(var(--color-border))]';
                              let statusText = '';
                              if (isCurrent) {
                                  statusColor = 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                                  statusText = 'في رخصة حالياً';
                              } else if (isPast) {
                                  statusColor = 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                                  statusText = 'منتهية';
                              } else if (isFuture) {
                                  statusColor = 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                                  statusText = 'مبرمجة';
                              }

                              return (
                                  <div key={license.id} className={`p-3 rounded-lg border shadow-sm ${statusColor}`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <p className="font-bold text-sm flex items-center gap-2">
                                              <i className="far fa-calendar-alt"></i>
                                              <span>من {license.start_date} إلى {license.end_date}</span>
                                          </p>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                                              {statusText}
                                          </span>
                                      </div>
                                      {license.reason && <p className="text-xs opacity-80 mr-6">{license.reason}</p>}
                                  </div>
                              );
                          })}
                  </div>
              </div>
          )}

        </div>

        <div className="lg:col-span-2">
          <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl shadow-sm border border-[rgb(var(--color-border))]">
            <h2 className="text-2xl font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-3 mb-4">{t('teacherDetail_historyCardTitle')}</h2>
            {reports.length === 0 ? (
              <div className="text-center py-10">
                <i className="fas fa-folder-open text-5xl text-slate-300 mb-4"></i>
                <p className="text-[rgb(var(--color-text-muted))]">{t('teacherDetail_noReports')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report, index) => (
                  <div key={report.id || index} className="border border-[rgb(var(--color-border))] rounded-lg p-4 hover:bg-[rgb(var(--color-card-hover))] transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${report.reportType === ReportType.INSPECTION ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>
                          {getReportTypeLabel(report.reportType)}
                        </span>
                        <p className={`text-lg font-bold mt-2 flex items-center gap-2 ${report.delivered ? 'text-slate-500 dark:text-slate-400' : 'text-[rgb(var(--color-text-base))]'}`}>
                          <span>{t('reportDatePrefix')}: {formatDate(report.date)}</span>
                           {(() => {
                                let hasImage = false;
                                if (report.observation) {
                                    try {
                                        const obs = typeof report.observation === 'string' ? JSON.parse(report.observation) : report.observation;
                                        if (obs && obs.lessonPlanImage) {
                                            hasImage = true;
                                        }
                                    } catch (e) {}
                                }
                                return hasImage ? <i className="fas fa-camera text-slate-400" title={t('reportHasLessonPlan')}></i> : null;
                            })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {report.reportType === ReportType.INSPECTION && report.score != null && (
                           <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                             {language === 'fr' ? (
                               <span dir="ltr">Note: {report.score}/20</span>
                             ) : (
                               <span dir="rtl">{t('score_label')}: {report.score}/20</span>
                             )}
                           </p>
                        )}
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
