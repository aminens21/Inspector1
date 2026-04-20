
import { Inspector, SavedReport, Teacher, OtherReport, EvaluationCriterion, SportActivities, TransmissionSlip, BackupData, ReportType, Memo } from '../types';
import { ministryLogoBase64 as defaultMinistryLogo, ministryLogoBase64Fr as defaultMinistryLogoFr } from '../components/constants';

const isValidImageUrl = (value: any): boolean => {
    if (typeof value !== 'string' || !value) return false;
    // Be more permissive to avoid rejecting valid custom logos
    return value.startsWith('data:image') || value.startsWith('http://') || value.startsWith('https://');
};

const defaultCriteria: EvaluationCriterion[] = [
    { id: '1', name: "التخطيط والإعداد", comment: '' },
    { id: '2', name: "تدبير إنجاز الحصة", comment: '' },
    { id: '3', name: "التقويم", comment: '' },
    { id: '4', name: "التطور المهني والإلتزام", comment: '' }
];

let currentUserPrefix = '';

export const setStorageUser = (uid: string | null) => {
    // Shared storage approach as requested: all users on the same device share the same local data
    currentUserPrefix = '';
};

const read = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(currentUserPrefix + key);
        if (item === null) {
            // Fallback to legacy key (no prefix) for transition if needed
            // But for safety on shared devices, better to start fresh per user
            // Unless we want to migrate once.
            return defaultValue;
        }
        const parsed = JSON.parse(item);

        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(`Invalid data type for key "${key}" in localStorage. Expected array, got ${typeof parsed}. Reverting to default.`);
            return defaultValue;
        }
        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && defaultValue !== null && (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null)) {
            console.warn(`Invalid data type for key "${key}" in localStorage. Expected object, got ${typeof parsed}. Reverting to default.`);
            return defaultValue;
        }

        if (key === 'ministryLogo') {
            if (!isValidImageUrl(parsed)) {
                console.warn(`Invalid ministryLogo data found in localStorage. Reverting to default.`);
                return defaultValue;
            }
        }
        
        return parsed;
    } catch (error) {
        console.warn(`Could not read from localStorage for key "${key}", using default value.`, error);
        return defaultValue;
    }
};

const write = <T>(key: string, value: T) => {
    try {
        localStorage.setItem(currentUserPrefix + key, JSON.stringify(value));
    } catch (error) {
        console.error(`Could not write to localStorage for key "${currentUserPrefix + key}".`, error);
    }
};

export const loadInitialData = (): BackupData => {
    const defaultCriteria: EvaluationCriterion[] = [
        { id: '1', name: "التخطيط والإعداد", comment: '' },
        { id: '2', name: "تدبير إنجاز الحصة", comment: '' },
        { id: '3', name: "التقويم", comment: '' },
        { id: '4', name: "التطور المهني والإلتزام", comment: '' }
    ];

    const inspector = read<Inspector>('inspector', { fullName: "", framework: "", regionalAcademy: "", regionalDirectorate: "", subject: "" });
    // Ensure default password if not set
    if (!inspector.password) {
        inspector.password = '3lachbghitih@';
    }

    const teachers = read<Teacher[]>('teachers', []);
    const reports = read<SavedReport[]>('reports', []);
    const otherReports = read<OtherReport[]>('otherReports', []);
    const transmissionSlips = read<TransmissionSlip[]>('transmissionSlips', []);
    const memos = read<Memo[]>('memos', []);
    const events = read<any[]>('events', []).map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
    }));
    const settings = read<any>('settings', {});
    const ministryLogo = read<string>('ministryLogo', defaultMinistryLogo);
    const ministryLogoFr = read<string>('ministryLogoFr', defaultMinistryLogoFr);
    const ministryLogoHeight = read<number>('ministryLogoHeight', 120); // Default height updated to 120
    const ministryLogoHeightFr = read<number>('ministryLogoHeightFr', 120);
    const geminiApiKey = read<string>('geminiApiKey', '');

    // Sync teachers' last inspection data with reports
    let teachersUpdated = false;
    const syncedTeachers = (Array.isArray(teachers) ? teachers : []).filter(Boolean).map(teacher => {
        const teacherInspections = (Array.isArray(reports) ? reports : []).filter(r => String(r.teacherId) === String(teacher.id) && r.reportType === ReportType.INSPECTION);
        if (teacherInspections.length > 0) {
            teacherInspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestInspection = teacherInspections[0];
            const latestScore = latestInspection.score ?? null;
            if (teacher.lastInspectionDate !== latestInspection.date || teacher.lastInspectionScore !== latestScore) {
                teachersUpdated = true;
                return {
                    ...teacher,
                    lastInspectionDate: latestInspection.date,
                    lastInspectionScore: latestScore,
                    lastInspector: inspector.fullName
                };
            }
        }
        return teacher;
    });

    if (teachersUpdated) {
        write('teachers', syncedTeachers);
    }

    return {
        inspector,
        teachers: syncedTeachers,
        reports: (Array.isArray(reports) ? reports : []).filter(Boolean),
        otherReports: (Array.isArray(otherReports) ? otherReports : []).filter(Boolean),
        transmissionSlips: (Array.isArray(transmissionSlips) ? transmissionSlips : []).filter(Boolean),
        evaluationCriteria: settings.criteria && settings.criteria.length > 0 ? settings.criteria : defaultCriteria,
        academies: settings.academies || [],
        directorates: settings.directorates || [],
        sportActivities: settings.activities || {},
        levels: settings.levels || [],
        departments: settings.departments || [],
        subjects: settings.subjects || [],
        ministryLogo,
        ministryLogoFr,
        ministryLogoHeight,
        ministryLogoHeightFr,
        institutionLocations: settings.institutionLocations || {},
        geminiApiKey,
        memos: (Array.isArray(memos) ? memos : []).filter(Boolean),
        events: (Array.isArray(events) ? events : []).filter(Boolean),
    };
};

export const saveInspector = (inspector: Inspector) => {
    write('inspector', inspector);
};

export const saveSettings = (data: {
    criteria: EvaluationCriterion[];
    academies: string[];
    directorates: string[];
    activities: SportActivities;
    levels: string[];
    departments: string[];
    subjects: string[];
    ministryLogo: string;
    ministryLogoFr?: string;
    ministryLogoHeight: number;
    ministryLogoHeightFr?: number;
    institutionLocations?: Record<string, {lat: number, lng: number}>;
    geminiApiKey?: string;
}) => {
    const { criteria, academies, directorates, activities, levels, departments, subjects, ministryLogo, ministryLogoFr, ministryLogoHeight, ministryLogoHeightFr, institutionLocations, geminiApiKey } = data;
    const settings = { criteria, academies, directorates, activities, levels, departments, subjects, institutionLocations: institutionLocations || {} };
    write('settings', settings);
    write('ministryLogo', ministryLogo);
    if (ministryLogoFr !== undefined) write('ministryLogoFr', ministryLogoFr);
    write('ministryLogoHeight', ministryLogoHeight);
    if (ministryLogoHeightFr !== undefined) write('ministryLogoHeightFr', ministryLogoHeightFr);
    if (geminiApiKey !== undefined) write('geminiApiKey', geminiApiKey);
};

export const saveTeacher = (teacher: Omit<Teacher, 'id'> | Teacher) => {
    const teachers = read<Teacher[]>('teachers', []);
    if ('id' in teacher && teacher.id) {
        const index = teachers.findIndex(t => String(t.id) === String(teacher.id));
        if (index > -1) {
            teachers[index] = { ...teacher, id: String(teacher.id) } as Teacher;
        } else {
            teachers.push({ ...teacher, id: String(teacher.id) } as Teacher);
        }
    } else {
        teachers.push({ ...teacher, id: Date.now().toString() });
    }
    write('teachers', teachers);
};

export const deleteTeacher = (teacherToDelete: Teacher) => {
    let teachers = read<Teacher[]>('teachers', []);
    let reports = read<SavedReport[]>('reports', []);
    
    teachers = teachers.filter(t => String(t.id) !== String(teacherToDelete.id));
    reports = reports.filter(r => String(r.teacherId) !== String(teacherToDelete.id));

    write('teachers', teachers);
    write('reports', reports);
};

export const replaceAllTeachers = (newTeachers: Teacher[]) => {
    const sanitized = newTeachers.map(t => ({ ...t, id: String(t.id) }));
    write('teachers', sanitized);
};

export const saveReport = (report: SavedReport) => {
    const reports = read<SavedReport[]>('reports', []);
    const index = reports.findIndex(r => String(r.id) === String(report.id));
    const reportToSave = { ...report, id: String(report.id || Date.now().toString()) };
    
    if (index > -1) {
        reports[index] = reportToSave;
    } else {
        reports.push(reportToSave);
    }
    write('reports', reports);
    
    if (report.reportType === ReportType.INSPECTION) {
        const teachers = read<Teacher[]>('teachers', []);
        const teacherIndex = teachers.findIndex(t => String(t.id) === String(report.teacherId));
        if (teacherIndex > -1) {
            const allReports = read<SavedReport[]>('reports', []);
            const teacherInspections = allReports.filter(r => String(r.teacherId) === String(report.teacherId) && r.reportType === ReportType.INSPECTION);
            
            if (teacherInspections.length > 0) {
                teacherInspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestInspection = teacherInspections[0];
                
                teachers[teacherIndex].lastInspectionDate = latestInspection.date;
                teachers[teacherIndex].lastInspectionScore = latestInspection.score ?? null;
                const inspector = read<Inspector>('inspector', { fullName: "", framework: "", regionalAcademy: "", regionalDirectorate: "", subject: "" });
                teachers[teacherIndex].lastInspector = inspector.fullName;
            } else {
                teachers[teacherIndex].lastInspectionDate = report.date;
                teachers[teacherIndex].lastInspectionScore = report.score ?? null;
                const inspector = read<Inspector>('inspector', { fullName: "", framework: "", regionalAcademy: "", regionalDirectorate: "", subject: "" });
                teachers[teacherIndex].lastInspector = inspector.fullName;
            }
            write('teachers', teachers);
        }
    }
};

export const markAllReportsDelivered = (reportIds: string[]) => {
    const reports = read<SavedReport[]>('reports', []);
    let updated = false;
    const newReports = reports.map(r => {
        if (reportIds.includes(String(r.id)) && !r.delivered) {
            updated = true;
            return { ...r, delivered: true };
        }
        return r;
    });
    if (updated) write('reports', newReports);
};

export const markAllOtherReportsDelivered = (reportIds: string[]) => {
    const reports = read<OtherReport[]>('otherReports', []);
    let updated = false;
    const newReports = reports.map(r => {
        if (reportIds.includes(String(r.id)) && !r.delivered) {
            updated = true;
            return { ...r, delivered: true };
        }
        return r;
    });
    if (updated) write('otherReports', newReports);
};

export const markAllSlipsDelivered = (slipIds: string[]) => {
    const slips = read<TransmissionSlip[]>('transmissionSlips', []);
    let updated = false;
    const newSlips = slips.map(s => {
        if (slipIds.includes(String(s.id)) && !s.delivered) {
            updated = true;
            return { ...s, delivered: true };
        }
        return s;
    });
    if (updated) write('transmissionSlips', newSlips);
};

export const deleteReport = (reportToDelete: SavedReport) => {
    let reports = read<SavedReport[]>('reports', []);
    reports = reports.filter(r => String(r.id) !== String(reportToDelete.id));
    write('reports', reports);

    if (reportToDelete.reportType === ReportType.INSPECTION) {
        const teachers = read<Teacher[]>('teachers', []);
        const teacherIndex = teachers.findIndex(t => String(t.id) === String(reportToDelete.teacherId));
        if (teacherIndex > -1) {
            const teacherInspections = reports.filter(r => String(r.teacherId) === String(reportToDelete.teacherId) && r.reportType === ReportType.INSPECTION);
            
            if (teacherInspections.length > 0) {
                teacherInspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestInspection = teacherInspections[0];
                
                teachers[teacherIndex].lastInspectionDate = latestInspection.date;
                teachers[teacherIndex].lastInspectionScore = latestInspection.score ?? null;
                const inspector = read<Inspector>('inspector', { fullName: "", framework: "", regionalAcademy: "", regionalDirectorate: "", subject: "" });
                teachers[teacherIndex].lastInspector = inspector.fullName;
            } else {
                // Revert to the original values if there are no other inspection reports
                teachers[teacherIndex].lastInspectionDate = reportToDelete.previousInspectionDate ?? null;
                teachers[teacherIndex].lastInspectionScore = reportToDelete.previousInspectionScore ?? null;
                teachers[teacherIndex].lastInspector = reportToDelete.previousInspector ?? null;
            }
            write('teachers', teachers);
        }
    }
};

export const saveOtherReport = (report: Omit<OtherReport, 'id'> | OtherReport) => {
    const reports = read<OtherReport[]>('otherReports', []);
    if ('id' in report && report.id) {
        const index = reports.findIndex(r => String(r.id) === String(report.id));
        const updatedReport = { ...report, id: String(report.id) } as OtherReport;
        if (index > -1) {
            reports[index] = updatedReport;
        } else {
            reports.push(updatedReport);
        }
    } else {
        reports.push({ ...report, id: Date.now().toString() });
    }
    write('otherReports', reports);
};

export const deleteOtherReport = (reportToDelete: OtherReport) => {
    let reports = read<OtherReport[]>('otherReports', []);
    reports = reports.filter(r => String(r.id) !== String(reportToDelete.id));
    write('otherReports', reports);
};

export const saveTransmissionSlip = (slip: Omit<TransmissionSlip, 'id'> | TransmissionSlip) => {
    const slips = read<TransmissionSlip[]>('transmissionSlips', []);
    if ('id' in slip && slip.id) {
        const index = slips.findIndex(s => String(s.id) === String(slip.id));
        const updatedSlip = { ...slip, id: String(slip.id) } as TransmissionSlip;
        if (index > -1) {
            slips[index] = updatedSlip;
        } else {
            slips.push(updatedSlip);
        }
    } else {
        slips.push({ ...slip, id: Date.now().toString() });
    }
    write('transmissionSlips', slips);
};

export const deleteTransmissionSlip = (slipToDelete: TransmissionSlip) => {
    let slips = read<TransmissionSlip[]>('transmissionSlips', []);
    slips = slips.filter(s => String(s.id) !== String(slipToDelete.id));
    write('transmissionSlips', slips);
};

export const saveMemo = (memo: Omit<Memo, 'id'> | Memo) => {
    const memos = read<Memo[]>('memos', []);
    if ('id' in memo && memo.id) {
        const index = memos.findIndex(m => String(m.id) === String(memo.id));
        const updatedMemo = { ...memo, id: String(memo.id) } as Memo;
        if (index > -1) {
            memos[index] = updatedMemo;
        } else {
            memos.push(updatedMemo);
        }
    } else {
        memos.push({ ...memo, id: Date.now().toString() });
    }
    write('memos', memos);
};

export const deleteMemo = (id: string) => {
    let memos = read<Memo[]>('memos', []);
    memos = memos.filter(m => String(m.id) !== id);
    write('memos', memos);
};

export const saveEvent = (event: any) => {
    const events = read<any[]>('events', []);
    if ('id' in event && event.id) {
        const index = events.findIndex(e => String(e.id) === String(event.id));
        const updatedEvent = { ...event, id: String(event.id) };
        if (index > -1) {
            events[index] = updatedEvent;
        } else {
            events.push(updatedEvent);
        }
    } else {
        events.push({ ...event, id: Date.now().toString() });
    }
    write('events', events);
};

export const deleteEvent = (id: string) => {
    let events = read<any[]>('events', []);
    events = events.filter(e => String(e.id) !== id);
    write('events', events);
};

export const exportAllData = (): BackupData => {
    return loadInitialData();
};

export const importAllData = (data: BackupData) => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format for import.');
    }
    
    // Use defaults for missing fields to support older backup versions
    const {
        inspector = {} as Inspector, 
        teachers = [], 
        reports = [], 
        otherReports = [], 
        transmissionSlips = [],
        evaluationCriteria = [], 
        academies = [], 
        directorates = [], 
        sportActivities = {},
        levels = [], 
        departments = [], 
        subjects = [], 
        ministryLogo = defaultMinistryLogo, 
        ministryLogoFr = '',
        ministryLogoHeight = 120, 
        ministryLogoHeightFr = 120,
        institutionLocations = {},
        geminiApiKey = '',
        memos = [],
        events = []
    } = data;
    
    write('inspector', inspector);
    write('teachers', teachers.map(t => ({ ...t, id: String(t.id) })));
    write('reports', reports.map(r => ({ ...r, id: String(r.id), teacherId: String(r.teacherId) })));
    write('otherReports', otherReports.map(o => ({ ...o, id: String(o.id) })));
    write('transmissionSlips', transmissionSlips.map(s => ({ ...s, id: String(s.id) })));
    write('memos', memos.map(m => ({ ...m, id: String(m.id) })));
    write('events', events.map(e => ({ ...e, id: String(e.id) })));
    saveSettings({
        criteria: evaluationCriteria,
        academies,
        directorates,
        activities: sportActivities,
        levels,
        departments,
        subjects,
        ministryLogo,
        ministryLogoFr,
        ministryLogoHeight: ministryLogoHeight || 120,
        ministryLogoHeightFr: ministryLogoHeightFr || 120,
        institutionLocations: institutionLocations || {},
        geminiApiKey
    });
};
