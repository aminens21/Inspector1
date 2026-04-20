
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useTranslations } from '../hooks/useTranslations';
import { Teacher, ScheduleItem, License, PromotionPace, SavedReport } from '../types';
import { TeacherScheduleModal } from './TeacherScheduleModal';
import { AddTeacherModal } from './AddTeacherModal';
import { Modal } from './ui/Modal';
import { MultiSelect } from './ui/MultiSelect';
import { analyzeTeacherAlerts, AlertStatus } from '../services/timetableAnalysis';

interface InspectionSpaceProps {
  teachers: Teacher[];
  reports: SavedReport[];
  onGoHome: () => void;
  onImportTeachers: (teachers: Teacher[]) => void;
  onInitiateImport: (onProceed: () => void) => void;
  onAddTeacher: (teacher: Omit<Teacher, 'id'> | Teacher) => void;
  onDeleteTeacher: (teacher: Teacher) => void;
  onStartVisit: (teacher: Teacher) => void;
  onStartInspection: (teacher: Teacher) => void;
  onViewReport: (report: SavedReport) => void;
  onEditReport: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  onToggleReportDelivered: (report: SavedReport) => void;
  inspectorSubject: string;
  subjects: string[];
  institutionLocations?: Record<string, {lat: number, lng: number}>;
  onUpdateInstitutionLocation?: (institution: string, lat: number, lng: number) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
};

declare global {
  interface window {
    XLSX: any;
  }
}

type PromotionType = 'rank' | 'grade' | null;
type FilterTab = 'institution' | 'status' | 'promotion' | 'validation';

// Helper Component for Toggleable Score
const ScoreReveal = ({ score, t }: { score: number | null, t: any }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    if (score == null) return null;

    return (
        <div 
            className="flex items-center gap-1 cursor-pointer group" 
            onClick={(e) => { e.stopPropagation(); setIsVisible(!isVisible); }}
            title="Click to toggle score visibility"
        >
            <span className="text-[9px] font-bold text-[rgb(var(--color-text-muted))]">{t('score') || 'النقطة'}:</span>
            <span className={`text-[9px] font-black text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-background))] px-1.5 py-0.5 rounded-md border border-[rgb(var(--color-border))] shadow-sm select-none transition-all group-hover:bg-sky-50 dark:group-hover:bg-sky-900/20 ${isVisible ? '' : 'tracking-widest'}`}>
                {isVisible ? score : '***'}
            </span>
        </div>
    );
};

export const InspectionSpace: React.FC<InspectionSpaceProps> = ({ 
    teachers, 
    reports = [],
    onGoHome, 
    onImportTeachers, 
    onInitiateImport, 
    onAddTeacher, 
    onDeleteTeacher, 
    onStartVisit, 
    onStartInspection, 
    onViewReport,
    onEditReport,
    onDeleteReport,
    onToggleReportDelivered,
    inspectorSubject, 
    subjects,
    institutionLocations = {},
    onUpdateInstitutionLocation
}) => {
  const { t, dir, language } = useTranslations();
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('institution');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
      const now = new Date();
      const year = now.getFullYear();
      return now.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  });

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const durations = [1, 2, 3, 4, 5, 6, 7, 8];

  const [promotionFilter, setPromotionFilter] = useState<'all' | 'rank' | 'grade'>('all');
  
  // Filters
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<'all' | 'public' | 'private'>('all'); 
  
  const [nameSearch, setNameSearch] = useState(''); 
  const [selectedDay, setSelectedDay] = useState<string>(() => {
      const dayIndex = new Date().getDay();
      const dayKeys = ['day_sunday', 'day_monday', 'day_tuesday', 'day_wednesday', 'day_thursday', 'day_friday', 'day_saturday'];
      if (dayIndex === 0) return t('day_monday');
      return t(dayKeys[dayIndex]);
  });
  const [selectedHour, setSelectedHour] = useState<number>(() => {
      const h = new Date().getHours();
      return h >= 12 ? 14 : 8;
  });
  const [selectedDuration, setSelectedDuration] = useState<number>(4);
  const [viewStatus, setViewStatus] = useState<'all' | 'busy' | 'free' | 'onLeave'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | AlertStatus>('all');
  const [viewedMonday, setViewedMonday] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const m = new Date(today);
    m.setDate(diffToMonday);
    m.setHours(0, 0, 0, 0);
    return m;
  });
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isImportHelpModalOpen, setIsImportHelpModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedInstitutionForLocation, setSelectedInstitutionForLocation] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [promotionModalData, setPromotionModalData] = useState<{
      isOpen: boolean;
      teacher: Teacher | null;
      type: PromotionType;
      newRank: number;
      newGrade: string;
      eligibilityDate: Date;
  }>({ isOpen: false, teacher: null, type: null, newRank: 0, newGrade: '', eligibilityDate: new Date() });

  const isMorning = selectedHour < 14;

  const daysLabels = [t('day_monday'), t('day_tuesday'), t('day_wednesday'), t('day_thursday'), t('day_friday'), t('day_saturday')];
  const academicYears = useMemo(() => {
      const now = new Date();
      const currentStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const years = [];
      for (let i = -5; i <= 5; i++) {
          const y = currentStartYear + i;
          years.push(`${y}/${y + 1}`);
      }
      return years;
  }, []);

  const formatDate = useCallback((date: Date, includeYear = true) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    if (language === 'fr') {
      return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
    }
    return includeYear ? `${year}/${month}/${day}` : `${month}/${day}`;
  }, [language]);

  const weekInfo = useMemo(() => {
    const daysWithDates = daysLabels.map((name, index) => {
        const d = new Date(viewedMonday);
        d.setDate(viewedMonday.getDate() + index);
        return { 
          name, 
          dateObj: d, 
          dateStr: d.toISOString().split('T')[0], 
          displayDate: formatDate(d, false) 
        };
    });
    return { 
      mondayDate: formatDate(viewedMonday), 
      days: daysWithDates 
    };
  }, [viewedMonday, daysLabels, formatDate]);

  const currentlySelectedDate = useMemo(() => {
      const found = weekInfo.days.find(d => d.name === selectedDay);
      return found ? found.dateObj : new Date();
  }, [selectedDay, weekInfo]);

  const allTeachers = useMemo(() => {
      return teachers;
  }, [teachers]);

  const uniqueInstitutions = useMemo(() => {
      return [...new Set(allTeachers
          .filter(t => selectedSector === 'all' || (t.sector || 'public') === selectedSector)
          .map(t => t.institution)
          .filter(Boolean)
      )].sort();
  }, [allTeachers, selectedSector]);

  const getActiveLicense = (teacher: Teacher, targetDate: Date): License | undefined => {
      return undefined;
  };

  const isTeacherBusy = (teacher: Teacher, targetDate: Date): boolean => {
      if (getActiveLicense(teacher, targetDate)) return false;
      const schedule = teacher.schedule || [];
      const startHour = selectedHour;
      const endHour = selectedHour + selectedDuration;
      return schedule.some(item => {
          if (item.day !== selectedDay) return false;
          const itemStart = parseInt(item.startTime.split(':')[0]);
          const itemEnd = parseInt(item.endTime.split(':')[0]);
          return itemStart < endHour && itemEnd > startHour;
      });
  };

  const getPromotionInfo = (teacher: Teacher) => {
      const [startYearStr, endYearStr] = selectedAcademicYear.split('/');
      const schoolYearStart = new Date(parseInt(startYearStr), 8, 1);
      const schoolYearEnd = new Date(parseInt(endYearStr), 7, 31); 
      let promoData = { isEligible: false, type: null as PromotionType, badge: '', color: '', newRank: 0, newGrade: '', eligibilityDate: new Date() };

      if ((teacher.grade == '10' || teacher.grade == '2' || teacher.grade === 'الدرجة الثانية' || teacher.grade === 'الثانية') && teacher.recruitmentDate) {
          const recruitmentDate = new Date(teacher.recruitmentDate);
          const eligibilityDate = new Date(recruitmentDate);
          eligibilityDate.setFullYear(recruitmentDate.getFullYear() + 10);
          if (eligibilityDate <= schoolYearEnd) {
              const label = language === 'fr' ? 'au Grade 1' : 'إلى الدرجة الأولى';
              return { isEligible: true, type: 'grade', badge: label, color: 'text-rose-500 font-black animate-pulse', newRank: Math.max(1, teacher.rank - 1), newGrade: 'الأولى', eligibilityDate } as const;
          }
      }

      if ((teacher.grade == '11' || teacher.grade == '1' || teacher.grade === 'الدرجة الأولى' || teacher.grade === 'الأولى') && teacher.gradeDate) {
          const gradeDate = new Date(teacher.gradeDate);
          const eligibilityDate = new Date(gradeDate);
          eligibilityDate.setFullYear(gradeDate.getFullYear() + 5);
          if (eligibilityDate <= schoolYearEnd) {
              const label = language === 'fr' ? 'au Grade Exceptionnel' : 'إلى الدرجة الممتازة';
              return { isEligible: true, type: 'grade', badge: label, color: 'text-rose-500 font-black animate-pulse', newRank: 1, newGrade: 'الممتازة', eligibilityDate } as const;
          }
      }

      const currentRank = Number(teacher.rank);
      if ((teacher.grade === 'خارج السلم' || teacher.grade === 'الدرجة الممتازة' || teacher.grade === 'الممتازة') && teacher.rankDate) {
          const rankDate = new Date(teacher.rankDate);
          const eligibilityDate = new Date(rankDate);
          eligibilityDate.setFullYear(rankDate.getFullYear() + 3);
          if (eligibilityDate >= schoolYearStart && eligibilityDate <= schoolYearEnd) {
              const label = language === 'fr' ? `au Rang ${currentRank + 1}` : `إلى الرتبة ${currentRank + 1}`;
              return { isEligible: true, type: 'rank', badge: label, color: "text-amber-500 font-black animate-pulse", newRank: currentRank + 1, newGrade: 'الممتازة', eligibilityDate } as const;
          }
          return promoData;
      }

      const pace = teacher.promotionPace || 'rapid';
      const promotionTable: Record<number, Record<PromotionPace, number>> = {
          1: { rapid: 1, medium: 1, slow: 1 }, 2: { rapid: 1, medium: 1.5, slow: 2 }, 3: { rapid: 2, medium: 2.5, slow: 3 }, 4: { rapid: 2, medium: 2.5, slow: 3.5 },
          5: { rapid: 2, medium: 2.5, slow: 3.5 }, 6: { rapid: 2, medium: 3, slow: 4 }, 7: { rapid: 2, medium: 4, slow: 4 }, 8: { rapid: 2, medium: 4, slow: 4 }, 9: { rapid: 2, medium: 4, slow: 4 },
      };

      if (teacher.rankDate && promotionTable[currentRank]?.[pace]) {
          const yearsNeeded = promotionTable[currentRank][pace];
          const rankDate = new Date(teacher.rankDate);
          const eligibilityDate = new Date(rankDate);
          eligibilityDate.setMonth(rankDate.getMonth() + (yearsNeeded * 12));
          if (eligibilityDate >= schoolYearStart && eligibilityDate <= schoolYearEnd) {
              return { isEligible: true, type: 'rank', badge: `إلى الرتبة ${currentRank + 1}`, color: "text-amber-500 font-black animate-pulse", newRank: currentRank + 1, newGrade: teacher.grade as string, eligibilityDate } as const;
          }
      }
      return promoData;
  };

  const displayedTeachers = useMemo(() => {
      return allTeachers.filter(teacher => {
          if (nameSearch && !teacher.fullName.toLowerCase().includes(nameSearch.toLowerCase())) return false; 
          
          if (selectedInstitutions.length > 0 && !selectedInstitutions.includes(teacher.institution)) return false;
          const teacherSector = teacher.sector || 'public';
          if (selectedSector !== 'all' && teacherSector !== selectedSector) return false;

          const promo = getPromotionInfo(teacher);
          if (promotionFilter === 'rank' && (promo.type !== 'rank')) return false;
          if (promotionFilter === 'grade' && (promo.type !== 'grade')) return false;
          const activeLicense = getActiveLicense(teacher, currentlySelectedDate);
          const busy = !activeLicense && isTeacherBusy(teacher, currentlySelectedDate);
          let passesAvailability = true;
          if (viewStatus === 'busy') passesAvailability = busy;
          if (viewStatus === 'onLeave') passesAvailability = !!activeLicense;
          if (viewStatus === 'free') passesAvailability = !busy && !activeLicense;
          if (!passesAvailability) return false;
          if (alertFilter === 'all') return true;
          return analyzeTeacherAlerts(teacher).status === alertFilter;
      });
  }, [allTeachers, currentlySelectedDate, selectedDay, selectedHour, selectedDuration, viewStatus, alertFilter, promotionFilter, selectedAcademicYear, selectedInstitutions, selectedSector, nameSearch]);

  const counts = useMemo(() => {
      let busyCount = 0; let freeCount = 0; let onLeaveCount = 0;
      allTeachers.forEach(t => {
          if (getActiveLicense(t, currentlySelectedDate)) onLeaveCount++;
          else if (isTeacherBusy(t, currentlySelectedDate)) busyCount++;
          else freeCount++;
      });
      return { busy: busyCount, free: freeCount, all: allTeachers.length, onLeave: onLeaveCount };
  }, [allTeachers, currentlySelectedDate, selectedDay, selectedHour, selectedDuration]);

  const renderFilterTabButton = (id: FilterTab, label: string, iconClass?: string) => (
      <button onClick={() => setActiveFilterTab(id)} className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm ${activeFilterTab === id ? 'bg-sky-600 text-white shadow-md' : 'bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-card-hover))] border border-[rgb(var(--color-border))]'}`}>{iconClass && <i className={iconClass}></i>}{label}</button>
  );

  const confirmPromotion = () => {
    if (!promotionModalData.teacher || !promotionModalData.type) return;

    const updatedTeacher: Teacher = { ...promotionModalData.teacher };
    const todayStr = new Date().toISOString().split('T')[0];

    if (promotionModalData.type === 'rank') {
      updatedTeacher.rank = promotionModalData.newRank;
      updatedTeacher.rankDate = todayStr;
    } else if (promotionModalData.type === 'grade') {
      updatedTeacher.grade = promotionModalData.newGrade;
      updatedTeacher.rank = promotionModalData.newRank;
      updatedTeacher.gradeDate = todayStr;
      updatedTeacher.rankDate = todayStr;
    }

    onAddTeacher(updatedTeacher);
    setPromotionModalData(prev => ({ ...prev, isOpen: false }));
  };

  const mapHeader = (header: string): string => {
      const h = header.trim().toLowerCase();
      if (h === 'fullname' || h === 'الإسم الكامل' || h === 'الاسم الكامل' || h === 'الإسم' || h === 'الاسم' || h === 'name' || h === 'nom complet' || h === 'nom et prénom' || h === 'nom et prenom' || h === 'الاسم والنسب' || h === 'الاسم و النسب') return 'fullName';
      if (h === 'employeeid' || h === 'رقم التأجير' || h === 'رقم التاجير' || h === 'ppr' || h === 'somme' || h === 'رقم التاشيرة' || h === 'n° ppr') return 'employeeId';
      if (h === 'genre' || h === 'الجنس' || h === 'نوع' || h === 'sexe' || h === 'm/f') return 'genre';
      if (h === 'framework' || h === 'الإطار' || h === 'الاطار' || h === 'cadre' || h === 'السلك') return 'framework';
      if (h === 'institution' || h === 'المؤسسة' || h === 'المؤسسه' || h === 'etablissement' || h === 'établissement' || h === 'ecole' || h === 'lycée' || h === 'college') return 'institution';
      if (h === 'subject' || h === 'المادة' || h === 'الماده' || h === 'التخصص' || h === 'matiere' || h === 'matière' || h === 'discipline') return 'subject';
      if (h === 'grade' || h === 'الدرجة' || h === 'الدرجه' || h === 'السلم' || h === 'echelle' || h === 'échelle' || h === 'grade') return 'grade';
      if (h === 'rank' || h === 'الرتبة' || h === 'الرتبه' || h === 'echelon' || h === 'échelon') return 'rank';
      if (h === 'sector' || h === 'القطاع' || h === 'نوع القطاع' || h === 'secteur') return 'sector';
      if (h === 'lastinspectionscore' || h === 'آخر نقطة' || h === 'اخر نقطة' || h === 'النقطة' || h === 'note' || h === 'score') return 'lastInspectionScore';
      if (h === 'lastinspectiondate' || h === 'تاريخ آخر تفتيش' || h === 'تاريخ اخر تفتيش' || h === 'date') return 'lastInspectionDate';
      if (h === 'lastinspector' || h === 'المفتش السابق' || h === 'المفتش' || h === 'inspecteur') return 'lastInspector';
      return header;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setImportError(null);
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array', cellDates: true });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);
              
              if (rawJson.length === 0) {
                  setImportError(t('errorImport') || 'الملف فارغ');
                  return;
              }

              const json = rawJson.map(row => {
                  const newRow: any = {};
                  Object.keys(row).forEach(key => {
                      const mappedKey = mapHeader(key);
                      newRow[mappedKey] = row[key];
                  });
                  return newRow;
              });

              const headers = Object.keys(json[0]);
              const requiredHeaders = ['fullName'];
              const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
              
              if (missingHeaders.length > 0) {
                  setImportError(`${t('errorImportInvalidFormat')} (مطلوب: الإسم الكامل)`);
                  return;
              }

              const importedTeachers: Teacher[] = json.map(row => {
                  let lastDate: string | null = null;
                  if (row.lastInspectionDate) {
                      if (row.lastInspectionDate instanceof Date) {
                          lastDate = row.lastInspectionDate.toLocaleDateString('fr-CA');
                      } else {
                          const d = new Date(row.lastInspectionDate);
                          if (!isNaN(d.getTime())) {
                              lastDate = d.toLocaleDateString('fr-CA');
                          }
                      }
                  }

                  const teacher: Teacher = {
                      id: row.id || `imported_${Date.now()}_${Math.random()}`,
                      fullName: String(row.fullName || '').trim(),
                      framework: String(row.framework || '').trim(),
                      employeeId: Number(row.employeeId) || 0,
                      institution: String(row.institution || '').trim(),
                      subject: String(row.subject || '').trim(),
                      grade: String(row.grade || '').trim(),
                      rank: Number(row.rank) || 0,
                      genre: (String(row.genre || '').toLowerCase().includes('female') || String(row.genre || '').trim() === 'أنثى' || String(row.genre || '').toLowerCase() === 'f') ? 'female' : 'male',
                      lastInspectionScore: row.lastInspectionScore ? Number(row.lastInspectionScore) : null,
                      lastInspectionDate: lastDate,
                      lastInspector: row.lastInspector || null,
                      image: row.image || null,
                      sector: (String(row.sector || '').toLowerCase().includes('private') || String(row.sector || '').trim() === 'خصوصي') ? 'private' : 'public',
                  };
                  return teacher;
              }).filter(t => t.fullName);

              if (importedTeachers.length === 0) {
                  setImportError('لم يتم العثور على بيانات صالحة للاستيراد.');
                  return;
              }

              onImportTeachers(importedTeachers);
          } catch (error) {
              console.error("Error parsing Excel file:", error);
              setImportError(`${t('errorImport')}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
          }
      };
      reader.readAsArrayBuffer(file);
      event.target.value = '';
  };

  const downloadTemplate = () => {
    const headers = [
        'fullName', 'employeeId', 'genre', 'framework', 'institution', 
        'subject', 'grade', 'rank', 'sector', 'lastInspectionScore', 
        'lastInspectionDate', 'lastInspector'
    ];
    const data = [
        {
            fullName: 'محمد علي',
            employeeId: '123456',
            genre: 'male',
            framework: 'أستاذ التعليم الثانوي التأهيلي',
            institution: 'ثانوية المسيرة',
            subject: 'التربية البدنية والرياضية',
            grade: 'الدرجة الأولى',
            rank: '10',
            sector: 'public',
            lastInspectionScore: '18.5',
            lastInspectionDate: '2023-01-15',
            lastInspector: 'أحمد العلمي'
        }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
    XLSX.writeFile(workbook, "teachers_template.xlsx");
  };

  const handleProceedToImport = () => {
    setIsImportHelpModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleSaveTeacher = (teacherData: Omit<Teacher, 'id'> | Teacher) => {
    onAddTeacher(teacherData);
    setIsAddTeacherModalOpen(false);
    setTeacherToEdit(null);
  };

  const handleDetectLocation = () => {
      if (!navigator.geolocation) {
          alert("عذراً، متصفحك لا يدعم تحديد الموقع.");
          return;
      }

      setIsDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
          (position) => {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ lat: latitude, lng: longitude });
              
              let nearestInstitution = '';
              let minDistance = Infinity;

              for (const [institution, coords] of Object.entries(institutionLocations)) {
                  const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
                  if (distance < minDistance) {
                      minDistance = distance;
                      nearestInstitution = institution;
                  }
              }

              setIsDetectingLocation(false);

              if (nearestInstitution && minDistance <= 500) {
                  setSelectedInstitutions([nearestInstitution]);
                  alert(`تم تحديد موقعك في: ${nearestInstitution}`);
              } else {
                  setIsLocationModalOpen(true);
              }
          },
          (error) => {
              setIsDetectingLocation(false);
              console.error("Error getting location:", error);
              alert("تعذر تحديد موقعك. يرجى التأكد من تفعيل خدمة الموقع (GPS) ومنح الصلاحية للتطبيق.");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
  };

  const handleSaveLocation = () => {
      if (selectedInstitutionForLocation && currentLocation && onUpdateInstitutionLocation) {
          onUpdateInstitutionLocation(selectedInstitutionForLocation, currentLocation.lat, currentLocation.lng);
          setSelectedInstitutions([selectedInstitutionForLocation]);
          setIsLocationModalOpen(false);
          setSelectedInstitutionForLocation('');
      }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-base))] pb-8 transition-colors duration-300">
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
       <header className="bg-[rgb(var(--color-card))] border-b border-[rgb(var(--color-border))] sticky top-0 z-30 shadow-md">
           <div className="container mx-auto px-4 h-16 flex items-center justify-between">
               <h1 className="text-xl font-bold flex items-center gap-2"><i className="fas fa-chart-pie text-sky-500"></i>{t('inspectionSpace_title')}</h1>
               <div className="flex items-center gap-2">
                    <button onClick={() => setIsChoiceModalOpen(true)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg shadow-sm"><i className="fas fa-plus"></i><span className="hidden sm:inline">{t('teachersList_addTeacher')}</span></button>
                   <button onClick={onGoHome} className="btn bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg"><i className="fas fa-home"></i><span className="hidden sm:inline">{t('home')}</span></button>
               </div>
           </div>
       </header>
       <div className="container mx-auto px-4 py-6">
           <div className="bg-[rgb(var(--color-card))] rounded-2xl border border-[rgb(var(--color-border))] p-6 min-h-[500px] shadow-2xl">
               <div className="flex flex-col gap-6 mb-8 border-b border-[rgb(var(--color-border))] pb-6">
                   <div className="flex flex-col items-center justify-center gap-2 mb-2">
                       <h2 className="text-xl font-extrabold text-[rgb(var(--color-text-base))] flex items-center gap-3"><div className="p-2 bg-indigo-500/20 rounded-lg"><i className="fas fa-users text-indigo-500"></i></div><span>{t('inspectionSpace_title')}<span className="mr-2 text-sm font-medium text-[rgb(var(--color-text-muted))]">({displayedTeachers.length})</span></span></h2>
                        <div className="w-full max-w-sm relative mt-2">
                            <input 
                                type="text" 
                                value={nameSearch} 
                                onChange={(e) => setNameSearch(e.target.value)}
                                placeholder={t('searchByTeacherName') || "بحث باسم الأستاذ..."} 
                                className="input-style w-full pl-10 pr-8 py-2 text-sm font-bold text-center rounded-xl border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fas fa-search text-slate-400"></i>
                            </div>
                            {nameSearch && (
                                <button 
                                    onClick={() => setNameSearch('')}
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <i className="fas fa-times-circle"></i>
                                </button>
                            )}
                        </div>
                   </div>
                   <div className="flex justify-center w-full mb-2"><div className="flex overflow-x-auto scrollbar-hide gap-0.5 p-1 max-w-full">{renderFilterTabButton('institution', t('teacher_institution') || 'المؤسسة', 'fas fa-school')}{renderFilterTabButton('status', t('status') || 'الوضع', 'fas fa-user-clock')}{renderFilterTabButton('promotion', t('promotion') || 'الترقية', 'fas fa-chart-line')}{renderFilterTabButton('validation', t('validation') || 'المصادقة', 'fas fa-check-double')}</div></div>
                   
                   <div className={`bg-[rgb(var(--color-background))] p-3 rounded-xl border border-[rgb(var(--color-border))] shadow-inner min-h-[80px] flex items-center justify-center transition-all duration-300 ${activeFilterTab === 'status' ? 'w-full' : 'max-w-2xl mx-auto'}`}>
                        {activeFilterTab === 'institution' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-4 w-full animate-fadeIn">
                                <div className="flex flex-col w-full sm:w-auto sm:flex-1 min-w-[250px]">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] sm:text-xs font-bold text-[rgb(var(--color-text-muted))] uppercase tracking-widest whitespace-nowrap">{t('teacher_institution')}:</label>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleDetectLocation}
                                                disabled={isDetectingLocation}
                                                className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded hover:bg-sky-200 flex items-center gap-1 transition-colors"
                                                title="تحديد مؤسستي الحالية عبر GPS"
                                            >
                                                <i className={`fas ${isDetectingLocation ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`}></i>
                                                {isDetectingLocation ? 'جاري التحديد...' : 'موقعي الحالي'}
                                            </button>
                                            {selectedInstitutions.length > 0 && (
                                                <button 
                                                    onClick={() => setSelectedInstitutions([])}
                                                    className="text-[10px] text-sky-600 hover:text-sky-800 underline"
                                                >
                                                    {t('clear')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <MultiSelect 
                                        options={uniqueInstitutions} 
                                        selected={selectedInstitutions} 
                                        onChange={setSelectedInstitutions}
                                        placeholder={t('selectInstitutions') || "اختر المؤسسات..."}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
                                    <label className="text-[10px] sm:text-xs font-bold text-[rgb(var(--color-text-muted))] uppercase tracking-widest whitespace-nowrap">{t('sector_label')}:</label>
                                    <select value={selectedSector} onChange={(e) => { setSelectedSector(e.target.value as 'all'|'public'|'private'); setSelectedInstitutions([]); }} className="bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] rounded-lg py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none w-full sm:w-auto">
                                        <option value="all">{t('all') || 'الكل'}</option>
                                        <option value="public">{t('sector_public')}</option>
                                        <option value="private">{t('sector_private')}</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        {activeFilterTab === 'status' && (
                            <div className="flex flex-col w-full gap-4 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                                    <div className="flex bg-[rgb(var(--color-card))] p-1 rounded-xl border border-[rgb(var(--color-border))] shadow-sm w-full max-w-2xl">
                                        <button onClick={() => setViewStatus('all')} className={`flex-1 px-2 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewStatus === 'all' ? 'bg-[rgb(var(--color-text-base))] text-[rgb(var(--color-background))] shadow-md' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}>{t('all') || 'الكل'} ({counts.all})</button>
                                        <button onClick={() => setViewStatus('busy')} className={`flex-1 px-2 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewStatus === 'busy' ? 'bg-sky-600 text-white shadow-md' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}>{t('inspectionSpace_status_busy')} ({counts.busy})</button>
                                        <button onClick={() => setViewStatus('free')} className={`flex-1 px-2 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewStatus === 'free' ? 'bg-emerald-600 text-white shadow-md' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}>{t('inspectionSpace_status_free')} ({counts.free})</button>
                                        <button onClick={() => setViewStatus('onLeave')} className={`flex-1 px-2 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewStatus === 'onLeave' ? 'bg-amber-600 text-white shadow-md' : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]'}`}>{t('inspectionSpace_status_onLeave')} ({counts.onLeave})</button>
                                    </div>
                                </div>
                                <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] w-full">
                                    <div className="mb-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                            <label className="text-sm font-bold flex items-center gap-2 text-sky-600"><i className="far fa-calendar-alt"></i>{t('inspectionSpace_chooseDay')}</label>
                                            <div className="flex items-center bg-[rgb(var(--color-background))] rounded-full p-1 border border-[rgb(var(--color-border))] shadow-inner">
                                                <button onClick={() => { const m = new Date(viewedMonday); m.setDate(viewedMonday.getDate()-7); setViewedMonday(m); }} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[rgb(var(--color-card-hover))] text-[rgb(var(--color-text-muted))] transition-colors"><i className="fas fa-chevron-right rtl:rotate-0 ltr:rotate-180 text-[10px]"></i></button>
                                                <button onClick={() => { const today = new Date(); const dayOfWeek = today.getDay(); const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); const m = new Date(today); m.setDate(diffToMonday); m.setHours(0,0,0,0); setViewedMonday(m); }} className="px-3 py-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors">{weekInfo.mondayDate}</button>
                                                <button onClick={() => { const m = new Date(viewedMonday); m.setDate(viewedMonday.getDate()+7); setViewedMonday(m); }} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[rgb(var(--color-card-hover))] text-[rgb(var(--color-text-muted))] transition-colors"><i className="fas fa-chevron-left rtl:rotate-0 ltr:rotate-180 text-[10px]"></i></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 sm:flex sm:gap-2 gap-1.5">
                                            {weekInfo.days.map(d => (
                                                <button key={d.name} onClick={() => setSelectedDay(d.name)} className={`px-2 py-2 rounded-lg transition-all shadow-sm border flex flex-col items-center justify-center gap-0.5 flex-1 sm:min-w-[80px] ${selectedDay === d.name ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-secondary))]'}`}><span className="text-xs font-bold">{d.name}</span><span className={`text-[9px] font-medium ${selectedDay === d.name ? 'text-indigo-100' : 'text-[rgb(var(--color-text-muted))] opacity-80'}`}>{d.displayDate}</span></button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1"><label className="block text-[10px] font-bold text-[rgb(var(--color-text-muted))] uppercase tracking-wider">{t('inspectionSpace_startTime')}</label><select value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))} className="bg-[rgb(var(--color-background))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] rounded-lg w-full py-1.5 px-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none">{hours.map(h => <option key={h} value={h}>{h}:00</option>)}</select></div>
                                            <div className="space-y-1"><label className="block text-[10px] font-bold text-[rgb(var(--color-text-muted))] uppercase tracking-wider">{t('inspectionSpace_duration')}</label><select value={selectedDuration} onChange={e => setSelectedDuration(Number(e.target.value))} className="bg-[rgb(var(--color-background))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] rounded-lg w-full py-1.5 px-2 text-xs focus:ring-2 focus:ring-sky-500 outline-none">{durations.map(d => <option key={d} value={d}>{d} {d===1 ? t('inspectionSpace_hour') : t('inspectionSpace_hours')}</option>)}</select></div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => { setSelectedHour(8); setSelectedDuration(4); }} className={`flex-1 py-1.5 text-[10px] font-bold transition-all duration-300 border flex items-center justify-center gap-1.5 rounded-lg shadow-sm ${isMorning ? 'bg-amber-600/20 text-amber-500 border-amber-500/50 shadow-amber-500/10' : 'bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-secondary))]'}`}><i className={`fas fa-sun text-sm ${isMorning ? 'text-amber-500' : 'text-[rgb(var(--color-text-muted))]'}`}></i>{t('inspectionSpace_morning')}</button>
                                            <button onClick={() => { setSelectedHour(14); setSelectedDuration(4); }} className={`flex-1 py-1.5 text-[10px] font-bold transition-all duration-300 border flex items-center justify-center gap-1.5 rounded-lg shadow-sm ${!isMorning ? 'bg-indigo-600/20 text-indigo-500 border-indigo-500/50 shadow-indigo-500/10' : 'bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-secondary))]'}`}><i className={`fas fa-moon text-sm ${!isMorning ? 'text-indigo-500' : 'text-[rgb(var(--color-text-muted))]'}`}></i>{t('inspectionSpace_afternoon')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeFilterTab === 'promotion' && (
                            <div className="flex flex-wrap items-center justify-center gap-3 w-full animate-fadeIn"><label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest whitespace-nowrap px-1">{t('promotionsTracking') || 'تتبع الترقيات:'}</label><select value={selectedAcademicYear} onChange={(e) => setSelectedAcademicYear(e.target.value)} className="bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] rounded-lg py-1 px-2 text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none">{academicYears.map(year => <option key={year} value={year}>{year}</option>)}</select><select value={promotionFilter} onChange={(e) => setPromotionFilter(e.target.value as any)} className={`bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] rounded-lg py-1 px-2 text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none ${promotionFilter==='rank' ? 'text-amber-500' : promotionFilter==='grade' ? 'text-rose-500' : 'text-[rgb(var(--color-text-muted))]'}`}><option value="all">{t('all') || 'الكل'}</option><option value="rank">يرقى برتبة</option><option value="grade">يرقى بدرجة</option></select></div>
                        )}
                        {activeFilterTab === 'validation' && (
                            <div className="flex items-center gap-3 w-full justify-center animate-fadeIn"><span className="text-[10px] font-bold text-[rgb(var(--color-text-muted))] uppercase tracking-widest">تصفية حالة جداول الحصص:</span><div className="flex gap-2"><button onClick={() => setAlertFilter('all')} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${alertFilter === 'all' ? 'bg-[rgb(var(--color-text-base))] border-[rgb(var(--color-text-base))] text-[rgb(var(--color-background))]' : 'bg-[rgb(var(--color-background))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))]'}`}><span className="text-[10px] font-black">ALL</span></button><button onClick={() => setAlertFilter('green')} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${alertFilter === 'green' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-[rgb(var(--color-background))] border-[rgb(var(--color-border))]'}`}><div className="w-3 h-3 rounded-full bg-emerald-500"></div></button><button onClick={() => setAlertFilter('blue')} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${alertFilter === 'blue' ? 'bg-sky-600/20 border-sky-500' : 'bg-[rgb(var(--color-background))] border-[rgb(var(--color-border))]'}`}><div className="w-3 h-3 rounded-full bg-sky-500"></div></button><button onClick={() => setAlertFilter('red')} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${alertFilter === 'red' ? 'bg-rose-600/20 border-rose-500' : 'bg-[rgb(var(--color-background))] border-[rgb(var(--color-border))]'}`}><div className="w-3 h-3 rounded-full bg-rose-500"></div></button></div></div>
                        )}
                   </div>
               </div>
               {displayedTeachers.length > 0 ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                       {displayedTeachers.map(teacher => {
                           const activeLicense = getActiveLicense(teacher, currentlySelectedDate);
                           const busy = !activeLicense && isTeacherBusy(teacher, currentlySelectedDate);
                           const alertData = analyzeTeacherAlerts(teacher);
                           const promo = getPromotionInfo(teacher);
                           let borderClass = 'border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-secondary))]';
                           if (promo.isEligible) borderClass = promo.type === 'grade' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/20' : 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/20';
                           let dotColorClass = 'bg-slate-600';
                           if (alertData.status === 'red') dotColorClass = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse';
                           else if (alertData.status === 'blue') dotColorClass = 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.6)]';
                           else if (alertData.status === 'green') dotColorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
                           
                           const hasNoScore = teacher.lastInspectionScore === null || teacher.lastInspectionScore === undefined;
                           const shouldHighlightMissingScore = hasNoScore && teacher.sector !== 'private';
                           const cardBgClass = shouldHighlightMissingScore ? 'bg-amber-5 dark:bg-amber-900/20' : 'bg-[rgb(var(--color-card))]';

                           return (
                           <div key={teacher.id} onClick={() => { setSelectedTeacher({ ...teacher, schedule: teacher.schedule || [] }); setIsModalOpen(true); }} className={`${cardBgClass} border ${borderClass} relative p-3 rounded-3xl transition-all duration-300 group cursor-pointer hover:shadow-2xl flex gap-3 overflow-hidden`}>
                               <div className="flex flex-col items-center justify-between w-14 shrink-0 bg-[rgb(var(--color-background))] rounded-2xl py-2 border border-[rgb(var(--color-border))]"><div className={`w-3 h-3 rounded-full ${dotColorClass} mb-2`}></div><div className="flex flex-col gap-2 mt-auto"><button onClick={(e) => { e.stopPropagation(); setTeacherToEdit(teacher); setIsAddTeacherModalOpen(true); }} className="h-10 w-10 rounded-xl flex items-center justify-center bg-[rgb(var(--color-card))] text-blue-600 border border-[rgb(var(--color-border))] hover:bg-blue-600 hover:text-white transition-all shadow-sm"><i className="fas fa-edit"></i></button><button onClick={(e) => { e.stopPropagation(); onDeleteTeacher(teacher); }} className="h-10 w-10 rounded-xl flex items-center justify-center bg-[rgb(var(--color-card))] text-rose-600 border border-[rgb(var(--color-border))] hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt"></i></button></div></div>
                               <div className="flex-1 flex flex-col pt-1 text-right pl-1">
                                   <p className="font-black text-base text-[rgb(var(--color-text-base))] truncate leading-tight">{teacher.fullName}</p>
                                   <div className="flex flex-col gap-1 mt-1">
                                       <ScoreReveal score={teacher.lastInspectionScore} t={t} />
                                       <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}><label className="text-[9px] text-[rgb(var(--color-text-muted))] font-bold whitespace-nowrap">النسق:</label><select value={teacher.promotionPace || 'rapid'} onChange={(e) => { e.stopPropagation(); onAddTeacher({...teacher, promotionPace: e.target.value as PromotionPace}); }} className="text-[9px] bg-[rgb(var(--color-background))] text-sky-600 dark:text-sky-400 border border-[rgb(var(--color-border))] px-1 py-0 rounded font-bold outline-none cursor-pointer"><option value="rapid">{t('pace_rapid') || 'سريع'}</option><option value="medium">{t('pace_medium') || 'متوسط'}</option><option value="slow">{t('pace_slow') || 'بطيء'}</option></select></div>
                                       
                                       <p className={`text-[10px] font-black truncate leading-tight flex items-center gap-1 ${activeLicense ? 'text-amber-600' : busy ? 'text-sky-600' : 'text-slate-400'}`}>
                                            <i className={`fas ${activeLicense ? 'fa-umbrella-beach' : busy ? 'fa-chalkboard-user' : 'fa-home'}`}></i>
                                            {activeLicense ? t('inspectionSpace_status_onLeave') : busy ? t('inspectionSpace_status_busy') : t('inspectionSpace_status_free')}
                                       </p>

                                       <div className="flex justify-start w-full gap-1 flex-wrap">
                                           <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate max-w-[140px]" title={teacher.institution}>
                                                {teacher.institution}
                                           </span>
                                           <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 w-auto justify-center ${teacher.sector === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {teacher.sector === 'private' ? t('sector_private') : t('sector_public')}
                                           </span>
                                       </div>
                                   </div></div>
                               <div className="relative shrink-0 flex flex-col items-center gap-1 w-20 pt-1">
                                   <div className="relative h-16 w-16 rounded-2xl bg-[rgb(var(--color-background))] border border-[rgb(var(--color-border))] flex items-center justify-center text-[rgb(var(--color-text-muted))] shadow-inner overflow-hidden mb-1">
                                       {teacher.image ? <img src={teacher.image} alt={teacher.fullName} className="h-full w-full object-cover" /> : <i className="fas fa-user-tie text-3xl"></i>}
                                   </div>
                                   {promo.isEligible && (
                                       <div
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               if (promo.type && promo.newRank && promo.newGrade) {
                                                   setPromotionModalData({ isOpen: true, teacher, type: promo.type, newRank: promo.newRank, newGrade: promo.newGrade, eligibilityDate: promo.eligibilityDate });
                                               }
                                           }}
                                           className={`mt-1 cursor-pointer flex items-center justify-between gap-1 px-1.5 py-1 rounded-md border shadow-sm w-full transition-all hover:shadow-md ${promo.type === 'grade' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}
                                           title="اضغط للمصادقة على الترقية"
                                       >
                                           <span className={`text-[8px] font-bold truncate ${promo.type === 'grade' ? 'text-rose-700' : 'text-amber-700'}`}>{promo.badge}</span>
                                           <div className={`w-3 h-3 min-w-[12px] rounded-sm border-2 bg-white ${promo.type === 'grade' ? 'border-rose-400' : 'border-amber-400'}`}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-[rgb(var(--color-text-muted))]"><div className="h-24 w-24 bg-[rgb(var(--color-background))] rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-[rgb(var(--color-border))]"><i className="fas fa-search text-5xl opacity-20"></i></div><p className="text-xl font-bold tracking-tight">لا توجد نتائج تطابق خيارات التصفية.</p><p className="text-sm mt-2 font-medium opacity-60">حاول تغيير معايير البحث أو الوقت المختار.</p></div>
                )}
            </div>
        </div>

        <Modal isOpen={promotionModalData.isOpen} onClose={() => setPromotionModalData(prev => ({ ...prev, isOpen: false }))} title="تأكيد الترقية" size="md">
            <div className="text-center p-4">
                <div className="mb-4">
                    <i className="fas fa-medal text-5xl text-amber-500"></i>
                </div>
                <h3 className="text-lg font-bold text-[rgb(var(--color-text-base))] mb-2">هل تمت ترقية {promotionModalData.teacher?.fullName}؟</h3>
                <p className="text-[rgb(var(--color-text-muted))] mb-6 text-sm">
                    {promotionModalData.type === 'rank' ? `سيتم تحديث الرتبة إلى ${promotionModalData.newRank}.` : `سيتم الترقية إلى ${promotionModalData.newGrade} مع تغيير الرتبة إلى ${promotionModalData.newRank} (القهقرى).` }
                    <br/>
                    سيتم تحديث تواريخ التسمية تلقائياً.
                </p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => setPromotionModalData(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2 rounded-lg bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))] font-bold">
                        لا
                    </button>
                    <button onClick={confirmPromotion} className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold">
                        نعم، تمت الترقية
                    </button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isChoiceModalOpen} onClose={() => setIsChoiceModalOpen(false)} title={t('addTeacher_choiceTitle')} size="md">
            <div className="flex flex-col gap-4 p-4">
                <button onClick={() => { setIsChoiceModalOpen(false); setTeacherToEdit(null); setIsAddTeacherModalOpen(true); }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                        <i className="fas fa-user-plus text-xl"></i>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-emerald-800">{t('addTeacher_manual')}</h3>
                        <p className="text-xs text-emerald-600">إدخال البيانات يدوياً عبر الاستمارة</p>
                    </div>
                </button>
                <button 
                    onClick={() => { 
                        setIsChoiceModalOpen(false); 
                        setImportError(null);
                        onInitiateImport(() => {
                            setIsImportHelpModalOpen(true);
                        });
                    }} 
                    className="p-4 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors flex items-center gap-4 group"
                >
                    <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-200 transition-colors">
                        <i className="fas fa-file-excel text-xl"></i>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-sky-800">{t('addTeacher_excel')}</h3>
                        <p className="text-xs text-sky-600">استيراد لائحة كاملة من ملف Excel</p>
                    </div>
                </button>
                {importError && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs">
                        <i className="fas fa-exclamation-circle ml-2"></i>
                        {importError}
                    </div>
                )}
            </div>
        </Modal>

        <Modal
            isOpen={isImportHelpModalOpen}
            onClose={() => setIsImportHelpModalOpen(false)}
            title={t('importHelp_title')}
            size="3xl"
        >
            <div>
                <p className="mb-4 text-[rgb(var(--color-text-muted))]">{t('importHelp_intro')}</p>
                <ol className="list-decimal list-inside space-y-2 mb-6 bg-[rgb(var(--color-background))] p-4 rounded-md text-sm">
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col1') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col2') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col3') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col4') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col5') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col6') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col7') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col8') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col9') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col10') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col11') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col12') }}></li>
                    <li dangerouslySetInnerHTML={{ __html: t('importHelp_col13') }}></li>
                    <li><b>sector</b>: القطاع (public/private)</li>
                </ol>
                <div className="flex justify-between items-center pt-4 border-t border-[rgb(var(--color-border))]">
                    <button onClick={downloadTemplate} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors flex items-center gap-2">
                        <i className="fas fa-download"></i>
                        تحميل نموذج Excel
                    </button>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <button onClick={() => setIsImportHelpModalOpen(false)} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors">{t('cancel')}</button>
                        <button onClick={handleProceedToImport} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">{t('importHelp_button_proceed')}</button>
                    </div>
                </div>
            </div>
        </Modal>
        
        <Modal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            title={t('gpsIdentifyInstitution') || "تحديد المؤسسة الحالية"}
            size="md"
        >
            <div className="p-4">
                <p className="mb-4 text-sm text-[rgb(var(--color-text-muted))]">
                    {t('gpsInstitutionPrompt') || 'لم نتمكن من التعرف على مؤسستك الحالية تلقائياً. يرجى اختيار المؤسسة التي تتواجد بها الآن لربطها بموقعك الحالي (GPS). سيتم حفظ هذا الموقع لتسهيل التعرف عليه في المرات القادمة.'}
                </p>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">المؤسسة</label>
                    <select
                        className="input-style w-full"
                        value={selectedInstitutionForLocation}
                        onChange={(e) => setSelectedInstitutionForLocation(e.target.value)}
                    >
                        <option value="">اختر المؤسسة...</option>
                        {uniqueInstitutions.map(inst => (
                            <option key={inst} value={inst}>{inst}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end pt-4 space-x-2 rtl:space-x-reverse border-t border-[rgb(var(--color-border))]">
                    <button onClick={() => setIsLocationModalOpen(false)} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors">{t('cancel')}</button>
                    <button 
                        onClick={handleSaveLocation} 
                        disabled={!selectedInstitutionForLocation}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('saveLocation') || 'حفظ الموقع'}
                    </button>
                </div>
            </div>
        </Modal>

        <TeacherScheduleModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            teacher={selectedTeacher} 
            reports={selectedTeacher ? reports.filter(r => String(r.teacherId) === String(selectedTeacher.id)) : []}
            licenses={[]}
            onDelete={() => { if (selectedTeacher) { onDeleteTeacher(selectedTeacher); setIsModalOpen(false); } }} 
            onStartVisit={() => selectedTeacher && onStartVisit(selectedTeacher)} 
            onStartInspection={() => selectedTeacher && onStartInspection(selectedTeacher)} 
            onViewReport={onViewReport}
            onEditReport={onEditReport}
            onDeleteReport={onDeleteReport}
            onToggleReportDelivered={onToggleReportDelivered}
        />
        <AddTeacherModal isOpen={isAddTeacherModalOpen} onClose={() => setIsAddTeacherModalOpen(false)} onSave={handleSaveTeacher} initialData={teacherToEdit} inspectorSubject={inspectorSubject} subjects={subjects} />
    </div>
  );
};
