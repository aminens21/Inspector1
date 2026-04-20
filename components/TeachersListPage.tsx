
import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Teacher, License } from '../types';
import { AddTeacherModal } from './AddTeacherModal';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { PageHeader } from './ui/PageHeader';
import { MultiSelect } from './ui/MultiSelect';

interface TeachersListPageProps {
  teachers: Teacher[];
  onTeacherSelect: (teacher: Teacher) => void;
  onAddOrUpdateTeacher: (teacher: Omit<Teacher, 'id'> | Teacher) => void;
  onDeleteTeacher: (teacher: Teacher) => void;
  onImportTeachers: (teachers: Teacher[]) => void;
  onInitiateImport: (onProceed: () => void) => void;
  onGoHome: () => void;
  onNavigateToInspectionSpace: () => void; // New prop
  mode?: 'view' | 'select';
  onCancelSelect?: () => void;
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

export const TeachersListPage: React.FC<TeachersListPageProps> = ({ 
    teachers, 
    onTeacherSelect, 
    onAddOrUpdateTeacher, 
    onDeleteTeacher, 
    onImportTeachers, 
    onInitiateImport, 
    onGoHome, 
    onNavigateToInspectionSpace,
    mode = 'view', 
    onCancelSelect, 
    inspectorSubject, 
    subjects,
    institutionLocations = {},
    onUpdateInstitutionLocation
}) => {
    const { t } = useTranslations();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportHelpModalOpen, setIsImportHelpModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
    const [selectedInstitutionForLocation, setSelectedInstitutionForLocation] = useState('');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [selectedTeacherForLicenses, setSelectedTeacherForLicenses] = useState<Teacher | null>(null);
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isSelectMode = mode === 'select';

    // Get unique institutions for the filter dropdown
    const uniqueInstitutions = useMemo(() => {
        const institutions = new Set(teachers.map(t => t.institution).filter(Boolean));
        return Array.from(institutions).sort();
    }, [teachers]);

    const filteredTeachers = teachers.filter(teacher => {
        const matchesSearch = (teacher.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (teacher.institution || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesInstitution = selectedInstitutions.length === 0 || 
                                   (teacher.institution && selectedInstitutions.includes(teacher.institution));

        return matchesSearch && matchesInstitution;
    });

    const getTeacherLicenses = (teacherId: string | number) => {
        return licenses.filter(license => String(license.user_id) === String(teacherId));
    };

    const isTeacherOnLeave = (teacherId: string | number) => {
        const teacherLicenses = getTeacherLicenses(teacherId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return teacherLicenses.some(license => {
            const startDate = new Date(license.start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(license.end_date);
            endDate.setHours(23, 59, 59, 999);
            return today >= startDate && today <= endDate;
        });
    };

    const handleSaveTeacher = (teacher: Omit<Teacher, 'id'> | Teacher) => {
        onAddOrUpdateTeacher(teacher);
        setIsModalOpen(false);
        setEditingTeacher(null);
    };
    
    const openAddModal = () => {
        setEditingTeacher(null);
        setIsModalOpen(true);
    };
    
    const openEditModal = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setIsModalOpen(true);
    };

    const handleImportClick = () => {
        setImportError(null);
        onInitiateImport(() => {
            setIsImportHelpModalOpen(true);
        });
    };
    
    const handleProceedToImport = () => {
        setIsImportHelpModalOpen(false);
        fileInputRef.current?.click();
    };

    const handleExportTeachers = () => {
        const dataToExport = teachers.map(t => ({
            'الاسم الكامل': t.fullName,
            'رقم التأجير': t.employeeId,
            'الجنس': t.genre === 'male' ? 'ذكر' : 'أنثى',
            'الإطار': t.framework,
            'المؤسسة': t.institution,
            'المادة': t.subject,
            'الدرجة': t.grade,
            'الرتبة': t.rank,
            'القطاع': t.sector === 'private' ? 'خصوصي' : 'عمومي',
            'آخر نقطة': t.lastInspectionScore,
            'تاريخ آخر تفتيش': t.lastInspectionDate,
            'المفتش السابق': t.lastInspector
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `liste_enseignants_${date}.xlsx`);
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

                // Map headers
                const json = rawJson.map(row => {
                    const newRow: any = {};
                    Object.keys(row).forEach(key => {
                        const mappedKey = mapHeader(key);
                        newRow[mappedKey] = row[key];
                    });
                    return newRow;
                });

                const headers = Object.keys(json[0]);
                // Only fullName is strictly required to create a teacher record
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
        // Reset file input value to allow re-uploading the same file
        event.target.value = '';
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
                
                // Find nearest institution
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

                // If within 500 meters, auto-select
                if (nearestInstitution && minDistance <= 500) {
                    setSelectedInstitutions([nearestInstitution]);
                    alert(`تم تحديد موقعك في: ${nearestInstitution}`);
                } else {
                    // Open modal to link current location to an institution
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
        <div className="container mx-auto p-4 md:p-6">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
            <PageHeader
                title={
                    <div className="flex items-center gap-4">
                        {!isSelectMode && (
                            <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700">
                               <i className="fas fa-home"></i>
                            </button>
                        )}
                         <h1 className="text-xl md:text-2xl font-bold text-emerald-500">
                            {isSelectMode ? t('teachersList_selectTitle') : t('teachersList_pageTitle')}
                        </h1>
                    </div>
                }
                actions={
                    <div className="flex flex-col items-end">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            {isSelectMode ? (
                                <button onClick={onCancelSelect} className="btn bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))]">
                                    {t('cancel')}
                                </button>
                            ) : (
                                 <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <button onClick={onNavigateToInspectionSpace} title={t('inspectionSpace_button')} className="btn bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-2">
                                        <i className="fas fa-chart-pie"></i>
                                        <span className="hidden sm:inline">{t('inspectionSpace_button')}</span>
                                    </button>
                                    <button onClick={handleImportClick} title={t('importFromExcel')} className="btn bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-2">
                                        <i className="fas fa-file-excel"></i>
                                        <span className="hidden sm:inline">{t('importFromExcel')}</span>
                                    </button>
                                    <button onClick={handleExportTeachers} title={t('teachersList_exportTitle')} className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                                        <i className="fas fa-download"></i>
                                        <span className="hidden sm:inline">{t('teachersList_exportBtn')}</span>
                                    </button>
                                     <button onClick={openAddModal} title={t('teachersList_addTeacher')} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                                        <i className="fas fa-plus"></i>
                                        <span className="hidden sm:inline">{t('teachersList_addTeacher')}</span>
                                    </button>
                                 </div>
                            )}
                        </div>
                        {importError && <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">{importError}</p>}
                    </div>
                }
            />
            
            <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                        <label htmlFor="search" className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teachersList_searchLabel')}</label>
                        <input
                            type="text"
                            id="search"
                            className="input-style w-full"
                            placeholder={t('teachersList_searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-1/2">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))]">تصفية حسب المؤسسة</label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleDetectLocation}
                                    disabled={isDetectingLocation}
                                    className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded hover:bg-sky-200 flex items-center gap-1 transition-colors"
                                    title="تحديد مؤسستي الحالية عبر GPS"
                                >
                                    <i className={`fas ${isDetectingLocation ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`}></i>
                                    {isDetectingLocation ? 'جاري التحديد...' : 'موقعي الحالي'}
                                </button>
                                {selectedInstitutions.length > 0 && (
                                    <button 
                                        onClick={() => setSelectedInstitutions([])}
                                        className="text-xs text-sky-600 hover:text-sky-800 underline"
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
                            placeholder="اختر المؤسسات..."
                        />
                    </div>
                </div>
            </div>

             {isSelectMode && (
                 <div className="bg-sky-50 border-r-4 border-sky-500 text-sky-800 p-4 mb-6 rounded-r-lg" role="alert">
                    <p className="font-bold">{t('teachersList_selectAlertTitle')}</p>
                    <p>{teachers.length > 0 ? t('teachersList_selectAlertText') : t('teachersList_addTeachersFirst')}</p>
                </div>
            )}

            <div className="overflow-x-auto bg-[rgb(var(--color-card))] rounded-xl shadow-sm border border-[rgb(var(--color-border))]">
                <table className="min-w-full divide-y divide-[rgb(var(--color-border))]">
                    <thead className="bg-[rgb(var(--color-background))]">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider">{t('teachersList_colFullName')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider hidden md:table-cell">{t('teachersList_colInstitution')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider hidden md:table-cell">{t('teachersList_colFramework')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider hidden md:table-cell">{t('sector_label')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider hidden md:table-cell">{t('teachersList_colLastScore')}</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider">{t('teachersList_colActions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[rgb(var(--color-card))] divide-y divide-[rgb(var(--color-border))]">
                        {filteredTeachers.map((teacher) => (
                            <tr key={String(teacher.id)} className="hover:bg-[rgb(var(--color-card-hover))] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[rgb(var(--color-text-base))]">
                                    <div className="flex items-center gap-2">
                                        {teacher.fullName}
                                        {getTeacherLicenses(teacher.id).length > 0 && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTeacherForLicenses(teacher);
                                                    setIsLicenseModalOpen(true);
                                                }}
                                                className="text-amber-500 hover:text-amber-600 transition-colors relative"
                                                title={t('licensesAndAbsences') || "سجل الرخص والغيابات"}
                                            >
                                                <i className="fas fa-calendar-alt"></i>
                                                {isTeacherOnLeave(teacher.id) && (
                                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="في رخصة حالياً">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))] hidden md:table-cell">{teacher.institution}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))] hidden md:table-cell">{teacher.framework}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${teacher.sector === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {teacher.sector === 'private' ? t('sector_private') : t('sector_public')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-muted))] hidden md:table-cell">{teacher.lastInspectionScore ?? '---'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    {isSelectMode ? (
                                        <button onClick={() => onTeacherSelect(teacher)} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 w-24 justify-center">
                                            <i className="fas fa-check ltr:mr-2 rtl:ml-2"></i> {t('select')}
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                                            <button onClick={() => onTeacherSelect(teacher)} className="text-sky-600 hover:text-sky-900" title={t('viewDetails')}>
                                                <i className="fas fa-eye fa-lg"></i>
                                            </button>
                                            <button onClick={() => openEditModal(teacher)} className="text-blue-600 hover:text-blue-900" title={t('edit')}>
                                                <i className="fas fa-edit fa-lg"></i>
                                            </button>
                                            <button onClick={() => onDeleteTeacher(teacher)} className="text-rose-600 hover:text-rose-900" title={t('delete')}>
                                                <i className="fas fa-trash-alt fa-lg"></i>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredTeachers.length === 0 && (
                 <div className="text-center py-10 bg-[rgb(var(--color-card))] rounded-xl border border-[rgb(var(--color-border))] mt-6">
                    <p className="text-[rgb(var(--color-text-muted))]">{t('teachersList_noResults')}</p>
                </div>
            )}
            
            <AddTeacherModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTeacher}
                initialData={editingTeacher}
                inspectorSubject={inspectorSubject}
                subjects={subjects}
            />

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

            {/* License History Modal */}
            <Modal
                isOpen={isLicenseModalOpen}
                onClose={() => {
                    setIsLicenseModalOpen(false);
                    setSelectedTeacherForLicenses(null);
                }}
                title={`${t('licensesAndAbsences') || 'سجل الرخص والغيابات'}: ${selectedTeacherForLicenses?.fullName || ''}`}
                size="2xl"
            >
                <div className="p-4">
                    {selectedTeacherForLicenses && getTeacherLicenses(selectedTeacherForLicenses.id).length > 0 ? (
                        <div className="space-y-4">
                            {getTeacherLicenses(selectedTeacherForLicenses.id)
                                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                                .map(license => {
                                    const startDate = new Date(license.start_date);
                                    const endDate = new Date(license.end_date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const start = new Date(startDate);
                                    start.setHours(0, 0, 0, 0);
                                    const end = new Date(endDate);
                                    end.setHours(23, 59, 59, 999);
                                    
                                    const isCurrent = today >= start && today <= end;
                                    const isPast = today > end;
                                    const isFuture = today < start;

                                    return (
                                        <div key={license.id} className={`p-4 rounded-lg border ${isCurrent ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20' : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))]'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <i className={`fas fa-calendar-day ${isCurrent ? 'text-rose-500' : 'text-slate-400'}`}></i>
                                                    <span className="font-bold text-[rgb(var(--color-text-base))]">
                                                        من {startDate.toLocaleDateString('ar-MA')} إلى {endDate.toLocaleDateString('ar-MA')}
                                                    </span>
                                                </div>
                                                {isCurrent && (
                                                    <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
                                                        في رخصة حالياً
                                                    </span>
                                                )}
                                                {isPast && (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                                        منتهية
                                                    </span>
                                                )}
                                                {isFuture && (
                                                    <span className="px-2 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full">
                                                        قادمة
                                                    </span>
                                                )}
                                            </div>
                                            {license.reason && (
                                                <div className="mt-2 text-sm text-[rgb(var(--color-text-muted))]">
                                                    <strong>السبب:</strong> {license.reason}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[rgb(var(--color-text-muted))]">
                            <i className="fas fa-check-circle text-4xl text-emerald-400 mb-3"></i>
                            <p>{t('noLicensesOrAbsences') || 'لا توجد رخص أو غيابات مسجلة لهذا الأستاذ.'}</p>
                        </div>
                    )}
                    <div className="flex justify-end pt-4 mt-6 border-t border-[rgb(var(--color-border))]">
                        <button 
                            onClick={() => {
                                setIsLicenseModalOpen(false);
                                setSelectedTeacherForLicenses(null);
                            }} 
                            className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
