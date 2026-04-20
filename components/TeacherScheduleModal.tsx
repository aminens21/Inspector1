
import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { Teacher, ScheduleItem, PromotionPace, SavedReport, ReportType, License } from '../types';

interface TeacherScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  reports?: SavedReport[];
  licenses?: License[];
  onDelete: () => void;
  onStartVisit?: () => void;
  onStartInspection?: () => void;
  onViewReport?: (report: SavedReport) => void;
  onEditReport?: (report: SavedReport) => void;
  onDeleteReport?: (report: SavedReport) => void;
  onToggleReportDelivered?: (report: SavedReport) => void;
}

export const TeacherScheduleModal: React.FC<TeacherScheduleModalProps> = ({ 
    isOpen, 
    onClose, 
    teacher, 
    reports = [],
    licenses = [],
    onDelete,
    onStartVisit,
    onStartInspection,
    onViewReport,
    onEditReport,
    onDeleteReport,
    onToggleReportDelivered
}) => {
  const { t, language } = useTranslations();
  const [activeTab, setActiveTab] = useState<'card' | 'timetable' | 'licenses'>('card');

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

  const daysLabels: Record<string, number> = useMemo(() => ({
      [t('day_monday')]: 0,
      [t('day_tuesday')]: 1,
      [t('day_wednesday')]: 2,
      [t('day_thursday')]: 3,
      [t('day_friday')]: 4,
      [t('day_saturday')]: 5,
      [t('day_sunday')]: 6
  }), [t]);

  const gridDays = useMemo(() => [
      t('day_monday'), 
      t('day_tuesday'), 
      t('day_wednesday'), 
      t('day_thursday'), 
      t('day_friday'), 
      t('day_saturday')
  ], [t]);
  
  const gridHours = ['08-09', '09-10', '10-11', '11-12', '14-15', '15-16', '16-17', '17-18'];

  const getAbsoluteTime = useCallback((item: ScheduleItem): number => {
      const dayIndex = daysLabels[item.day] ?? -1;
      const hour = parseInt(item.startTime.split(':')[0]);
      return (dayIndex * 24) + hour;
  }, [daysLabels]);

  const getScheduleItem = useCallback((day: string, hour: string) => {
    if (!teacher?.schedule) return undefined;
    return teacher.schedule.find(s => 
        s.day === day && 
        parseInt(s.startTime.split(':')[0]) <= parseInt(hour.split('-')[0]) &&
        parseInt(s.endTime.split(':')[0]) > parseInt(hour.split('-')[0])
    );
  }, [teacher]);

  const analysis = useMemo(() => {
      if (!teacher?.schedule) return { violations: [], assignments: [] };

      const violations: string[] = [];
      const assignments: string[] = [];
      
      const itemsByClass: Record<string, ScheduleItem[]> = {};
      
      teacher.schedule.forEach(item => {
          if (item.className) {
              const start = parseInt(item.startTime.split(':')[0]);
              const end = parseInt(item.endTime.split(':')[0]);
              assignments.push(`${item.day} (${start}:00 - ${end}:00): ${item.className} - ${item.subject || teacher.subject}`);
              
              if (!itemsByClass[item.className]) itemsByClass[item.className] = [];
              itemsByClass[item.className].push(item);
          }
      });

      Object.keys(itemsByClass).forEach(className => {
          if (className.toUpperCase().includes('ASS') || className.includes('تنسيق') || className.toUpperCase().includes('COORD')) return;

          const items = itemsByClass[className];
          const sortedItems = [...items].sort((a, b) => getAbsoluteTime(a) - getAbsoluteTime(b));

          let weeklyDuration = 0;

          sortedItems.forEach(item => {
              const start = parseInt(item.startTime.split(':')[0]);
              const end = parseInt(item.endTime.split(':')[0]);
              const duration = end - start;
              weeklyDuration += duration;

              if (duration > 2) {
                  violations.push(`القسم ${className}: حصة تتجاوز ساعتين (${item.day} ${item.startTime}-${item.endTime})`);
              }
          });

          if (weeklyDuration < 2) {
               violations.push(`القسم ${className}: الغلاف الزمني الأسبوعي أقل من ساعتين (المجموع: ${weeklyDuration} ساعة)`);
          }

          for (let i = 0; i < sortedItems.length - 1; i++) {
              const current = sortedItems[i];
              const next = sortedItems[i+1];
              const currentEndAbs = getAbsoluteTime(current) + (parseInt(current.endTime.split(':')[0]) - parseInt(current.startTime.split(':')[0]));
              const nextStartAbs = getAbsoluteTime(next);
              const diffHours = nextStartAbs - currentEndAbs; 
              
              if (diffHours > 0 && diffHours < 44) {
                   violations.push(`القسم ${className}: فترة راحة أقل من 44 ساعة بين حصة ${current.day} وحصة ${next.day} (الفرق: ${diffHours} ساعة)`);
              }
          }
      });

      return { violations, assignments };
  }, [teacher, getAbsoluteTime]);

  const totalWeeklyHours = useMemo(() => {
      if (!teacher?.schedule) return 0;
      
      let count = 0;
      gridDays.forEach(day => {
          gridHours.forEach(hourStr => {
             const isBusy = getScheduleItem(day, hourStr);
             if (isBusy) count++;
          });
      });
      return count;
  }, [teacher, gridDays, gridHours, getScheduleItem]);

  const promotionInfo = useMemo(() => {
      if (!teacher || !teacher.rankDate || !teacher.rank) return null;

      const now = new Date();
      const currentYear = now.getFullYear();
      const startYear = now.getMonth() >= 8 ? currentYear : currentYear - 1;
      const schoolYearStart = new Date(startYear, 8, 1);
      const schoolYearEnd = new Date(startYear + 1, 7, 31);

      if ((teacher.grade == '10' || teacher.grade == '2' || teacher.grade === 'الدرجة الثانية' || teacher.grade === 'الثانية') && teacher.recruitmentDate) {
          const recruitmentDate = new Date(teacher.recruitmentDate);
          const eligibilityDate = new Date(recruitmentDate);
          eligibilityDate.setFullYear(recruitmentDate.getFullYear() + 10);

          if (eligibilityDate <= schoolYearEnd) {
              return { 
                  isEligible: true, 
                  type: 'grade', 
                  nextRank: Math.max(1, teacher.rank - 1), 
                  nextGrade: 'الأولى',
                  date: eligibilityDate 
              };
          }
      }
      
      if ((teacher.grade == '11' || teacher.grade == '1' || teacher.grade === 'الدرجة الأولى' || teacher.grade === 'الأولى') && teacher.gradeDate) {
          const gradeDate = new Date(teacher.gradeDate);
          const eligibilityDate = new Date(gradeDate);
          eligibilityDate.setFullYear(gradeDate.getFullYear() + 5);

          if (eligibilityDate <= schoolYearEnd) {
              return { 
                  isEligible: true, 
                  type: 'grade', 
                  nextRank: Math.max(1, teacher.rank - 1), 
                  nextGrade: 'الممتازة',
                  date: eligibilityDate 
              };
          }
      }

      const pace = teacher.promotionPace || 'rapid';
      const currentRank = Number(teacher.rank);
      const promotionTable: Record<number, Record<PromotionPace, number>> = {
          1: { rapid: 1, medium: 1, slow: 1 },
          2: { rapid: 1, medium: 1.5, slow: 2 },
          3: { rapid: 2, medium: 2.5, slow: 3 },
          4: { rapid: 2, medium: 2.5, slow: 3.5 },
          5: { rapid: 2, medium: 2.5, slow: 3.5 },
          6: { rapid: 2, medium: 3, slow: 4 },
          7: { rapid: 2, medium: 4, slow: 4 },
          8: { rapid: 2, medium: 4, slow: 4 },
          9: { rapid: 2, medium: 4, slow: 4 },
      };

      const yearsNeeded = promotionTable[currentRank]?.[pace];
      if (!yearsNeeded) return null;

      const rankDate = new Date(teacher.rankDate);
      const eligibilityDate = new Date(rankDate);
      eligibilityDate.setMonth(rankDate.getMonth() + (yearsNeeded * 12));

      if (eligibilityDate >= schoolYearStart && eligibilityDate <= schoolYearEnd) {
          return { 
              isEligible: true, 
              type: 'rank',
              nextRank: currentRank + 1, 
              nextGrade: teacher.grade,
              date: eligibilityDate 
          };
      }

      return null;
  }, [teacher]);

  const scoreEvolution = useMemo(() => {
      if (!teacher) return [];
      
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

      return inspections.map((curr) => {
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
              source: curr.source
          };
      });
  }, [reports, teacher]);

  if (!teacher) return null;

  const teacherTitle = teacher.genre === 'female' ? t('teacher_female') : t('teacher_male');

  const getReportTypeLabel = (type: ReportType) => {
    return type === ReportType.INSPECTION ? t('inspection') : t('visit');
  };

  const getConflictMessage = (currentItem: ScheduleItem): string | null => {
      if (!currentItem.className || !teacher.schedule) return null;

      if (currentItem.className.toUpperCase().includes('ASS') || currentItem.className.includes('تنسيق') || currentItem.className.toUpperCase().includes('COORD')) return null;

      const classItems = teacher.schedule.filter(s => s.className === currentItem.className);
      
      const duration = parseInt(currentItem.endTime.split(':')[0]) - parseInt(currentItem.startTime.split(':')[0]);
      if (duration > 2) return t('violation_overTwoHours');

      let weeklyTotal = 0;
      classItems.forEach(item => {
          const s = parseInt(item.startTime.split(':')[0]);
          const e = parseInt(item.endTime.split(':')[0]);
          weeklyTotal += (e - s);
      });
      
      if (weeklyTotal < 2) return t('violation_lowWeeklyDuration');

      const currentAbs = getAbsoluteTime(currentItem);
      const hasRestConflict = classItems.some(otherItem => {
          if (otherItem === currentItem) return false;
          const otherAbs = getAbsoluteTime(otherItem);
          const diff = Math.abs(currentAbs - otherAbs);
          return diff > 0 && diff < 44;
      });

      if (hasRestConflict) return t('violation_lowRestPeriod');
      return null;
  };

  const renderScheduleCell = (day: string, hour: string) => {
    const item = getScheduleItem(day, hour);
    
    if (item) {
        const conflictMsg = getConflictMessage(item);
        const isConflict = !!conflictMsg;
        const isASS = item.className?.toUpperCase().includes('ASS');

        let bgClass = "bg-sky-600 dark:bg-sky-700 border-sky-400 dark:border-sky-600";
        
        if (isConflict) {
            bgClass = "bg-rose-600 dark:bg-rose-700 border-rose-400 dark:border-rose-600";
        } else if (isASS) {
            bgClass = "bg-emerald-50 dark:bg-emerald-700 border-emerald-300 dark:border-emerald-600";
        }

        return (
            <div 
                className={`${bgClass} h-full w-full rounded-sm border shadow-sm flex items-center justify-center p-1 overflow-hidden relative group cursor-pointer`} 
                title={item.rawData ? JSON.stringify(item.rawData) : JSON.stringify(item)}
                onClick={() => item.rawData && alert(JSON.stringify(item.rawData, null, 2))}
            >
                <span className="text-white text-[10px] font-bold truncate text-center" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {item.className || (item.rawData ? Object.keys(item.rawData).join(',') : t('unnamedField'))}
                </span>
                {isConflict && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full m-0.5 animate-pulse" title={conflictMsg || ''}></div>
                )}
            </div>
        );
    }
    return <div className="h-full w-full"></div>;
  };

  const formatTimeSlot = (slot: string) => {
      return slot.split('-').reverse().join('-');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('scheduleModal_title')} : ${teacher.fullName}`} size="4xl">
      <div className="flex border-b border-[rgb(var(--color-border))] mb-6 overflow-x-auto scrollbar-hide">
        <button
          className={`px-6 py-3 font-semibold whitespace-nowrap ${activeTab === 'card' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
          onClick={() => setActiveTab('card')}
        >
          {t('scheduleModal_tab_card')}
        </button>
        <button
          className={`px-6 py-3 font-semibold whitespace-nowrap ${activeTab === 'timetable' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
          onClick={() => setActiveTab('timetable')}
        >
          {t('scheduleModal_tab_timetable')}
        </button>
        <button
          className={`px-6 py-3 font-semibold whitespace-nowrap ${activeTab === 'licenses' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}
          onClick={() => setActiveTab('licenses')}
        >
          {t('scheduleModal_tab_licenses')}
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'timetable' && (
          <div>
             <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl border border-sky-100 dark:border-sky-800/50 mb-6 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 dark:bg-sky-800 rounded-full text-sky-600 dark:text-sky-300">
                        <i className="fas fa-clock fa-lg"></i>
                    </div>
                    <span className="font-bold text-[rgb(var(--color-text-base))] text-lg">{t('scheduleModal_totalWeeklyHours')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-sky-600 dark:text-sky-400 font-mono">{totalWeeklyHours}</span>
                    <span className="text-sm text-[rgb(var(--color-text-muted))] font-medium">{t('scheduleModal_hour')}</span>
                </div>
             </div>

             <div className="hidden md:block overflow-x-auto">
                 <div className="min-w-[700px]">
                    <div className="grid grid-cols-9 gap-1 mb-1">
                        <div className="bg-[rgb(var(--color-card-hover))] p-2 font-bold text-center text-xs text-[rgb(var(--color-text-base))] border border-[rgb(var(--color-border))] rounded-sm">H/J</div>
                        {gridHours.map(h => <div key={h} className="bg-[rgb(var(--color-card-hover))] p-2 font-bold text-center text-xs text-[rgb(var(--color-text-base))] border border-[rgb(var(--color-border))] rounded-sm" dir="ltr">{formatTimeSlot(h)}</div>)}
                    </div>
                    {gridDays.map(day => (
                        <div key={day} className="grid grid-cols-9 gap-1 mb-1 h-12">
                            <div className="bg-[rgb(var(--color-background))] p-2 font-bold text-xs flex items-center justify-center border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] rounded-sm">{day}</div>
                            {gridHours.map(h => (
                                <div key={`${day}-${h}`} className="bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] flex items-center justify-center rounded-sm">
                                    {renderScheduleCell(day, h)}
                                </div>
                            ))}
                        </div>
                    ))}
                 </div>
                 <div className="flex gap-4 justify-center mt-4">
                    <p className="text-xs text-[rgb(var(--color-text-muted))] flex items-center gap-2">
                        <span className="w-3 h-3 bg-sky-600 rounded-sm inline-block"></span>
                        {t('inspectionSpace_busy')}
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-muted))] flex items-center gap-2">
                        <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block"></span>
                        {t('schedule_ass_label')}
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-muted))] flex items-center gap-2">
                        <span className="w-3 h-3 bg-rose-600 rounded-sm inline-block"></span>
                        {t('schedule_violation_label')}
                    </p>
                 </div>
             </div>

             <div className="md:hidden space-y-4">
                {gridDays.map(day => {
                    const busyHours = gridHours.filter(h => !!getScheduleItem(day, h));
                    const isFreeDay = busyHours.length === 0;

                    return (
                        <div key={day} className={`rounded-xl border ${isFreeDay ? 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-card))]' : 'border-sky-200 bg-sky-50 dark:bg-sky-900/10 dark:border-sky-800'} p-4 shadow-sm`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-lg text-[rgb(var(--color-text-base))]">{day}</h4>
                                {isFreeDay ? (
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-[rgb(var(--color-card-hover))] text-[rgb(var(--color-text-muted))]">
                                        {t('inspectionSpace_available')}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-800 dark:text-sky-100">
                                        {busyHours.length} {t('inspectionSpace_hours')}
                                    </span>
                                )}
                            </div>
                            
                            {!isFreeDay ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {busyHours.map(h => {
                                        const item = getScheduleItem(day, h);
                                        const conflictMsg = item ? getConflictMessage(item) : null;
                                        const isConflict = !!conflictMsg;
                                        const isASS = item?.className?.toUpperCase().includes('ASS');

                                        let bgClass = "bg-white dark:bg-slate-800 border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-400";

                                        if (isConflict) {
                                            bgClass = "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300";
                                        } else if (isASS) {
                                            bgClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
                                        }

                                        return (
                                            <div 
                                                key={h} 
                                                className={`${bgClass} border rounded-md p-2 text-center shadow-sm relative overflow-hidden cursor-pointer`} 
                                                title={item?.rawData ? JSON.stringify(item.rawData) : ''}
                                                onClick={() => item?.rawData && alert(JSON.stringify(item.rawData, null, 2))}
                                            >
                                                <span className="font-bold text-sm block" dir="ltr">{formatTimeSlot(h)}</span>
                                                <span className="text-[10px] opacity-80" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                    {item?.className || (item?.rawData ? Object.keys(item.rawData).join(',') : teacher.subject)}
                                                </span>
                                                {isConflict && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full m-1"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-[rgb(var(--color-text-muted))] italic text-center py-2 opacity-60">
                                    -- {t('inspectionSpace_status_free')} --
                                </p>
                            )}
                        </div>
                    );
                })}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-[rgb(var(--color-border))] pt-6">
                 
                 <div className="space-y-3">
                     <h3 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 text-lg">
                         <i className="fas fa-exclamation-triangle"></i>
                         {t('scheduleModal_violationsTitle')}
                     </h3>
                     {analysis.violations.length > 0 ? (
                         <ul className="space-y-2">
                             {analysis.violations.map((violation, idx) => (
                                 <li key={idx} className="text-sm p-3 bg-rose-50 border border-rose-200 rounded-lg shadow-sm dark:bg-rose-900/20 dark:border-rose-800 flex items-start gap-3 transition-colors">
                                     <i className="fas fa-exclamation-circle mt-1 text-rose-600 dark:text-rose-400 shrink-0"></i>
                                     <div className="flex flex-col">
                                         <span className="font-bold text-xs text-rose-700 dark:text-rose-300 mb-0.5">{teacher.fullName}</span>
                                         <span className="leading-relaxed text-black dark:text-white">{violation}</span>
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                         <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                             <i className="fas fa-check-circle"></i>
                             <span>{t('scheduleModal_noViolations')}</span>
                         </div>
                     )}
                 </div>

                 <div className="space-y-3">
                     <h3 className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-2 text-lg">
                         <i className="fas fa-list-ul"></i>
                         {t('scheduleModal_assignmentsTitle')}
                     </h3>
                     {analysis.assignments.length > 0 ? (
                         <div className="max-h-60 overflow-y-auto pr-1">
                            <ul className="space-y-2">
                                {analysis.assignments.map((assignment, idx) => (
                                    <li key={idx} className="text-sm p-2 bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] rounded-md text-[rgb(var(--color-text-base))] flex items-center gap-2 shadow-sm">
                                        <i className="fas fa-chalkboard text-sky-500"></i>
                                        {assignment}
                                    </li>
                                ))}
                            </ul>
                         </div>
                     ) : (
                         <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg border border-[rgb(var(--color-border))] text-sm">
                             {t('scheduleModal_noAssignments')}
                         </div>
                     )}
                 </div>
             </div>

          </div>
        )}
        {activeTab === 'card' && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-[rgb(var(--color-background))] rounded-xl border border-[rgb(var(--color-border))]">
                <div className="h-24 w-24 rounded-full bg-[rgb(var(--color-card))] border-4 border-[rgb(var(--color-card))] shadow-md flex items-center justify-center text-[rgb(var(--color-text-muted))] overflow-hidden">
                    {teacher.image ? (
                        <img src={teacher.image} alt={teacher.fullName} className="h-full w-full object-cover" />
                    ) : (
                        <i className="fas fa-user text-5xl"></i>
                    )}
                </div>
                <div className="text-center md:text-right">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-base))]">{teacherTitle} {teacher.fullName}</h2>
                    <p className="text-[rgb(var(--color-text-muted))]">{teacher.subject}</p>
                    <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">{teacher.institution}</p>
                </div>
             </div>

             <div className="flex gap-4 mb-4">
                 <button 
                    onClick={onStartVisit}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                 >
                     <i className="fas fa-chalkboard-teacher"></i>
                     {t('visit')}
                 </button>
                 <button 
                    onClick={onStartInspection}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                 >
                     <i className="fas fa-search"></i>
                     {t('inspection')}
                 </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] shadow-sm">
                    <h3 className="font-bold text-lg text-sky-700 dark:text-sky-400 mb-4 border-b border-[rgb(var(--color-border))] pb-2 flex items-center gap-2">
                        <i className="fas fa-user-shield text-sky-600 dark:text-sky-400"></i>
                        {t('professionalCard_adminInfo')}
                    </h3>
                    
                    {promotionInfo && promotionInfo.isEligible && (
                        <div className={`mb-4 border rounded-lg p-3 flex items-start gap-3 animate-pulse ${promotionInfo.type === 'grade' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                            <i className={`fas fa-medal mt-1 ${promotionInfo.type === 'grade' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}></i>
                            <div>
                                <p className={`font-black text-sm ${promotionInfo.type === 'grade' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                    {promotionInfo.type === 'grade' 
                                        ? `${t('eligibleForPromotion') || 'مستحق للترقية'} : ${promotionInfo.nextGrade}`
                                        : `${t('eligibleForPromotion') || 'مستحق للترقية'} : ${promotionInfo.nextRank}`
                                    }
                                </p>
                                {promotionInfo.type === 'grade' && (
                                    <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-0.5">
                                        (مع القهقرى إلى الرتبة {promotionInfo.nextRank})
                                    </p>
                                )}
                                <p className={`text-xs mt-0.5 ${promotionInfo.type === 'grade' ? 'text-rose-600 dark:text-rose-400/80' : 'text-amber-600 dark:text-amber-400/80'}`}>
                                    {t('report_dateLabel') || 'بتاريخ'}: {formatDate(promotionInfo.date.toISOString().split('T')[0])}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 text-sm text-[rgb(var(--color-text-base))]">
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_employeeId')}:</span>
                             <span className="font-semibold">{teacher.employeeId}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('sector_label')}:</span>
                             <span className={`font-semibold px-2 py-0.5 rounded text-xs ${teacher.sector === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                 {teacher.sector === 'private' ? t('sector_private') : t('sector_public')}
                             </span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_framework')}:</span>
                             <span className="font-semibold">{t(String(teacher.framework).trim()) || teacher.framework}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_grade')}:</span>
                             <span className="font-semibold">{t(String(teacher.grade).trim()) || String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', '')}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_rank')}:</span>
                             <span className="font-semibold">{teacher.rank}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_recruitmentDate')}:</span>
                             <span className="font-semibold">{teacher.recruitmentDate || '---'}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_tenureDate')}:</span>
                             <span className="font-semibold">{teacher.tenureDate || '---'}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_gradeDate')}:</span>
                             <span className="font-semibold">{teacher.gradeDate || '---'}</span>
                         </div>
                         <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                             <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_rankDate')}:</span>
                             <span className="font-semibold">{teacher.rankDate || '---'}</span>
                         </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] shadow-sm">
                        <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400 mb-4 border-b border-[rgb(var(--color-border))] pb-2 flex items-center gap-2">
                            <i className="fas fa-clipboard-check text-emerald-600 dark:text-emerald-400"></i>
                            {t('professionalCard_inspectionInfo')}
                        </h3>
                        <div className="space-y-3 text-sm text-[rgb(var(--color-text-base))]">
                            <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                                <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_lastScore')}:</span>
                                <span className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">{teacher.lastInspectionScore ? `${teacher.lastInspectionScore}/20` : '---'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                                <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_lastDate')}:</span>
                                <span className="font-semibold">{teacher.lastInspectionDate ? formatDate(teacher.lastInspectionDate) : '---'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded hover:bg-[rgb(var(--color-card-hover))]">
                                <span className="text-[rgb(var(--color-text-muted))]">{t('teacher_lastInspector')}:</span>
                                <span className="font-semibold">{teacher.lastInspector || '---'}</span>
                            </div>
                        </div>

                        {/* Chart: Score Evolution */}
                        {scoreEvolution.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-[rgb(var(--color-border))] animate-fadeIn">
                                <h4 className="text-xs font-bold text-[rgb(var(--color-text-muted))] mb-4 flex items-center gap-2">
                                    <i className="fas fa-chart-line text-emerald-500"></i>
                                    {t('scheduleModal_scoreEvolution') || 'تطور النقطة:'}
                                </h4>
                                <div className="relative flex flex-col justify-end w-full" dir="ltr">
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

                                            {scoreEvolution.map((item, idx) => (
                                                <div key={item.id} className="flex flex-col items-center justify-end h-full gap-1 group relative flex-1 min-w-[30px] z-10">
                                                    <div className="absolute -top-10 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none shadow-lg mb-1">
                                                        {item.score}/20 ({item.academicYear})
                                                    </div>
                                                    
                                                    <div className="w-full flex items-end justify-center h-full relative">
                                                        <div 
                                                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-700 ease-out shadow-sm border-x border-t border-white/20 relative group-hover:brightness-110 ${
                                                                idx === scoreEvolution.length - 1 
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
                            </div>
                        )}
                    </div>

                    {/* New Section: Inspection Reports List */}
                    <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] shadow-sm mt-4">
                        <h3 className="font-bold text-lg text-violet-700 dark:text-violet-400 mb-4 border-b border-[rgb(var(--color-border))] pb-2 flex items-center gap-2">
                            <i className="fas fa-history text-violet-600 dark:text-violet-400"></i>
                            {t('scheduleModal_reportsHistory') || 'سجل التقارير والزيارات'}
                        </h3>
                        
                        {reports.length === 0 ? (
                            <div className="text-center py-6 opacity-60">
                                <i className="fas fa-folder-open text-3xl mb-2"></i>
                                <p className="text-sm">{t('scheduleModal_noReports') || 'لا توجد تقارير مسجلة لهذا الأستاذ.'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                {reports.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((report, index) => (
                                    <div 
                                        key={report.id || index} 
                                        className="p-3 bg-[rgb(var(--color-background))] border border-[rgb(var(--color-border))] rounded-lg hover:bg-[rgb(var(--color-card-hover))] transition-all group cursor-pointer"
                                        onClick={() => onViewReport?.(report)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${report.reportType === ReportType.INSPECTION ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'}`}>
                                                    {getReportTypeLabel(report.reportType)}
                                                </span>
                                                <span className={`text-xs font-bold ${report.delivered ? 'text-slate-500 dark:text-slate-400' : 'text-[rgb(var(--color-text-base))]'}`}>
                                                    {formatDate(report.date)}
                                                </span>
                                                {report.reportType === ReportType.INSPECTION && report.score != null && (
                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{t('score_label')}: {report.score}/20</span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {onToggleReportDelivered && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onToggleReportDelivered(report); }} 
                                                        className={`${report.delivered ? 'text-emerald-600' : 'text-slate-400'} hover:text-emerald-700 p-2 rounded-full transition-colors`} 
                                                        title={report.delivered ? "تم التسليم" : "تحديد كمُسلّم"}
                                                    >
                                                        <i className={`fas ${report.delivered ? 'fa-check-circle' : 'fa-check'}`}></i>
                                                    </button>
                                                )}
                                                {onViewReport && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onViewReport(report); }} 
                                                        className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-full transition-colors" 
                                                        title={t('viewExport')}
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                )}
                                                {onEditReport && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onEditReport(report); }} 
                                                        className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors" 
                                                        title={t('edit')}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                )}
                                                {onDeleteReport && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onDeleteReport(report); }} 
                                                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors" 
                                                        title={t('delete')}
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                )}
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
        )}

        {activeTab === 'licenses' && (
          <div className="space-y-6">
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] shadow-sm">
                <h3 className="font-bold text-xl text-amber-700 dark:text-amber-400 mb-6 border-b border-[rgb(var(--color-border))] pb-3 flex items-center gap-3">
                    <i className="fas fa-calendar-alt text-amber-600 dark:text-amber-400 text-2xl"></i>
                    {t('licensesAndAbsences') || 'سجل الرخص والغيابات'}
                </h3>
                
                {(!licenses || licenses.filter(l => String(l.user_id) === String(teacher.id)).length === 0) ? (
                    <div className="text-center py-10 opacity-60">
                        <i className="fas fa-calendar-check text-5xl mb-4 text-emerald-500"></i>
                        <p className="text-lg">{t('noLicensesOrAbsences') || 'لا توجد رخص أو غيابات مسجلة لهذا الأستاذ.'}</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {licenses.filter(l => String(l.user_id) === String(teacher.id))
                            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                            .map(license => {
                                const today = new Date().toLocaleDateString('fr-CA');
                                const isCurrent = today >= license.start_date && today <= license.end_date;
                                const isPast = today > license.end_date;
                                const isFuture = today < license.start_date;
                                
                                let statusColor = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700';
                                let statusText = '';
                                let iconClass = 'fa-calendar-check text-slate-400';
                                
                                if (isCurrent) {
                                    statusColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800';
                                    statusText = 'في رخصة حالياً';
                                    iconClass = 'fa-calendar-times text-rose-500';
                                } else if (isPast) {
                                    statusColor = 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700';
                                    statusText = 'منتهية';
                                    iconClass = 'fa-calendar-check text-slate-400';
                                } else if (isFuture) {
                                    statusColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
                                    statusText = 'مبرمجة';
                                    iconClass = 'fa-calendar-plus text-amber-500';
                                }

                                return (
                                    <div key={license.id} className={`p-4 rounded-xl border ${statusColor} shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm shrink-0`}>
                                                <i className={`fas ${iconClass} text-xl`}></i>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-base">
                                                        <span>من {license.start_date} إلى {license.end_date}</span>
                                                    </p>
                                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isCurrent ? 'bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-200 animate-pulse' : isFuture ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                {license.reason && (
                                                    <p className="text-sm opacity-80 flex items-center gap-1.5 mt-1">
                                                        <i className="fas fa-info-circle text-xs"></i>
                                                        {license.reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-[rgb(var(--color-border))] text-center min-w-[100px]">
                                            <span className="block text-[10px] text-[rgb(var(--color-text-muted))] font-bold mb-0.5">المدة</span>
                                            <span className="font-black text-lg">
                                                {Math.ceil((new Date(license.end_date).getTime() - new Date(license.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} أيام
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-[rgb(var(--color-border))] flex justify-between">
        <button onClick={onDelete} className="px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 flex items-center gap-2">
            <i className="fas fa-trash-alt"></i>
            <span className="hidden sm:inline">{t('delete')}</span>
        </button>
        <button onClick={onClose} className="px-6 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))]">
            {t('close')}
        </button>
      </div>
    </Modal>
  );
};
