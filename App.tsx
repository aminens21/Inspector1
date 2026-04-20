
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { InspectorModal } from './components/InspectorModal';
import { TeachersListPage } from './components/TeachersListPage';
import { TeacherDetailPage } from './components/TeacherDetailPage';
import { ReportsListPage } from './components/ReportsListPage';
import { EvaluationPage } from './components/EvaluationPage';
import { ReportTypeSelectionModal } from './components/ReportTypeSelectionModal';
import { OtherReportsPage } from './components/OtherReportsPage';
import { ReportModal } from './components/ReportModal';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { OtherReportModal } from './components/OtherReportModal';
import { AboutModal } from './components/AboutModal';
import { SettingsPage } from './components/SettingsPage';
import { ActivitySummaryPage } from './components/ActivitySummaryPage';
import { TransmissionSlipPage } from './components/TransmissionSlipPage';
import { TransmissionSlipModal } from './components/TransmissionSlipModal';
import { InspectionSpace } from './components/InspectionSpace';
import { StatisticsPage } from './components/StatisticsPage'; // New Import
import { EducationalResearchPage } from './components/EducationalResearchPage'; // New Import
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { AdminUsersPage } from './components/AdminUsersPage';
import { Toast } from './components/ui/Toast';
import { useTranslations } from './hooks/useTranslations';
import { REPORT_TEMPLATES, INITIAL_OTHER_REPORT_STATE } from './constants/templates';
import { syncToCloud, syncFromCloud, saveAiKeyToCloud } from './services/firebaseService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

import { Inspector, Teacher, SavedReport, ReportType, OtherReport, EvaluationCriterion, SportActivities, TransmissionSlip } from './types';
import { 
    loadInitialData, 
    saveInspector, 
    saveTeacher,
    deleteTeacher,
    deleteReport,
    deleteOtherReport,
    saveReport,
    saveOtherReport,
    markAllReportsDelivered,
    markAllOtherReportsDelivered,
    markAllSlipsDelivered,
    replaceAllTeachers,
    saveSettings,
    saveTransmissionSlip,
    deleteTransmissionSlip,
    importAllData,
    exportAllData,
    saveMemo,
    deleteMemo,
    setStorageUser
} from './services/localStorageManager';

type Page = 'home' | 'teachers' | 'teacherDetail' | 'reports' | 'newReport_selectTeacher' | 'newReport_evaluation' | 'otherReports' | 'settings' | 'activitySummary' | 'transmissionSlip' | 'inspectionSpace' | 'statistics' | 'research' | 'adminUsers';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  autoClose?: boolean;
}

const App: React.FC = () => {
    const { t, language, dir } = useTranslations();
    
    // Load initial data ONCE synchronously to prevent UI flicker/delay
    // This ensures the logo and other data are available immediately on first paint
    const [initialLocalData] = useState(() => loadInitialData());

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isLoggedIn') === 'true';
    });
    const [isAuthLoading, setIsAuthLoading] = useState(() => {
        // If we are already flagged as a guest, don't block the UI with a spinner
        // We'll still listen for authentication in the background to sync data if they eventually log in.
        return localStorage.getItem('isLoggedIn') !== 'true';
    });
    const [page, setPage] = useState<Page>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    // State initialized immediately with local data
    const [inspector, setInspector] = useState<Inspector>(initialLocalData.inspector);
    const [teachers, setTeachers] = useState<Teacher[]>(initialLocalData.teachers);
    const [reports, setReports] = useState<SavedReport[]>(initialLocalData.reports);
    const [otherReports, setOtherReports] = useState<OtherReport[]>(initialLocalData.otherReports);
    const [transmissionSlips, setTransmissionSlips] = useState<TransmissionSlip[]>(initialLocalData.transmissionSlips);
    const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>(initialLocalData.evaluationCriteria);
    const [academies, setAcademies] = useState<string[]>(initialLocalData.academies);
    const [directorates, setDirectorates] = useState<string[]>(initialLocalData.directorates);
    const [sportActivities, setSportActivities] = useState<SportActivities>(initialLocalData.sportActivities);
    const [levels, setLevels] = useState<string[]>(initialLocalData.levels);
    const [departments, setDepartments] = useState<string[]>(initialLocalData.departments);
    const [subjects, setSubjects] = useState<string[]>(initialLocalData.subjects);
    const [ministryLogo, setMinistryLogo] = useState<string>(initialLocalData.ministryLogo);
    const [ministryLogoFr, setMinistryLogoFr] = useState<string>(initialLocalData.ministryLogoFr || '');
    const [ministryLogoHeight, setMinistryLogoHeight] = useState<number>(initialLocalData.ministryLogoHeight || 120);
    const [ministryLogoHeightFr, setMinistryLogoHeightFr] = useState<number>(initialLocalData.ministryLogoHeightFr || 120);
    const [institutionLocations, setInstitutionLocations] = useState<Record<string, {lat: number, lng: number}>>(initialLocalData.institutionLocations || {});
    const [geminiApiKey, setGeminiApiKey] = useState<string>(initialLocalData.geminiApiKey || '');
    const [memos, setMemos] = useState(initialLocalData.memos || []);

    // Modals state
    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isReportTypeModalOpen, setIsReportTypeModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isOtherReportModalOpen, setIsOtherReportModalOpen] = useState(false);
    const [isTransmissionSlipModalOpen, setIsTransmissionSlipModalOpen] = useState(false);
    
    // Selection state
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [newReportType, setNewReportType] = useState<ReportType | null>(null);
    const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
    const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
    const [viewingReportTeacher, setViewingReportTeacher] = useState<Teacher | null>(null);
    const [viewingOtherReport, setViewingOtherReport] = useState<OtherReport | null>(null);
    const [viewingTransmissionSlip, setViewingTransmissionSlip] = useState<TransmissionSlip | null>(null);
    const [editingOtherReport, setEditingOtherReport] = useState<OtherReport | null>(null);
    const [editingTransmissionSlip, setEditingTransmissionSlip] = useState<TransmissionSlip | null>(null);

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        messageColor?: string;
        confirmButtonText?: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    const addToast = (message: string, type: 'success' | 'error' | 'info', autoClose: boolean = true) => {
        const id = new Date().getTime();
        setToasts(prevToasts => [...prevToasts, { id, message, type, autoClose }]);
        return id;
    };

    const removeToast = (id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    };

    const reloadDataFromStorage = () => {
        try {
            const data = loadInitialData();
            setInspector(data.inspector);
            setTeachers(data.teachers);
            setReports(data.reports);
            setOtherReports(data.otherReports);
            setTransmissionSlips(data.transmissionSlips);
            setEvaluationCriteria(data.evaluationCriteria);
            setAcademies(data.academies);
            setDirectorates(data.directorates);
            setSportActivities(data.sportActivities);
            setLevels(data.levels);
            setDepartments(data.departments);
            setSubjects(data.subjects);
            setMinistryLogo(data.ministryLogo);
            setMinistryLogoFr(data.ministryLogoFr || '');
            setMinistryLogoHeight(data.ministryLogoHeight || 120);
            setMinistryLogoHeightFr(data.ministryLogoHeightFr || 120);
            setGeminiApiKey(data.geminiApiKey || '');
            setMemos(data.memos || []);
            return data;
        } catch (e: any) {
            // Only add toast if we are already authenticated to avoid spamming the login screen
            if (localStorage.getItem('isLoggedIn') === 'true') {
                addToast(`${t('errorFetchData')}: ${e.message}`, 'error');
            }
            console.error(e);
            return null;
        }
    };

    const isSuperAdmin = auth.currentUser?.email === 'amineo3atmane@gmail.com';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setStorageUser(user.uid);
                reloadDataFromStorage();
                setIsAuthenticated(true);
                setIsAuthLoading(false);
            } else {
                setStorageUser(null);
                reloadDataFromStorage();
                
                // Only set authenticated to false if there's no manual login flag
                const isGuest = localStorage.getItem('isLoggedIn') === 'true';
                setIsAuthenticated(isGuest);
                setIsAuthLoading(false);
            }
        });
        return () => unsubscribe();
    }, [language]);
    
    useEffect(() => {
        document.title = t('appTitle');
    }, [t, language]);

    const handleGoogleLogin = async () => {
        setIsProcessing(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            addToast(t('login_success') || 'تم تسجيل الدخول بنجاح', 'success');
        } catch (error: any) {
            console.error("Google login error:", error);
            addToast(`خطأ في تسجيل الدخول: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogin = (name: string, password: string, rememberMe: boolean) => {
        let updatedInspector = { ...inspector };
        let changed = false;
        
        if (name !== inspector.fullName) {
            updatedInspector.fullName = name;
            changed = true;
        }
        
        // If no password was set before, save the one entered during login
        if (!inspector.password && password) {
            updatedInspector.password = password;
            changed = true;
        }
        
        if (changed) {
            setInspector(updatedInspector);
            saveInspector(updatedInspector);
        }
        
        setIsAuthenticated(true);
        if (rememberMe) {
            localStorage.setItem('isLoggedIn', 'true');
        } else {
            localStorage.removeItem('isLoggedIn');
        }
        
        handleSyncFromPlatform(false);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setStorageUser(null);
            reloadDataFromStorage();
            setIsAuthenticated(false);
            localStorage.removeItem('isLoggedIn');
            setPage('home');
            setToasts([]);
        } catch (error: any) {
            console.error("Logout error:", error);
            addToast(`خطأ في تسجيل الخروج: ${error.message}`, 'error');
        }
    };

    const goHome = () => {
        setPage('home');
        setSelectedTeacher(null);
        setEditingOtherReport(null);
        setEditingTransmissionSlip(null);
        setEditingReport(null);
    };

    const handleSaveInspector = async (data: Inspector) => {
        setIsProcessing(true);
        try {
            const subjectExists = data.subject ? subjects.map(s => s.toLowerCase()).includes(data.subject.toLowerCase()) : true;
            if (data.subject && !subjectExists) {
                const newSubjects = [...subjects, data.subject];
                const settingsData = {
                    criteria: evaluationCriteria, academies, directorates, activities: sportActivities,
                    levels, departments, subjects: newSubjects, ministryLogo, ministryLogoHeight
                };
                saveSettings(settingsData);
            }
            saveInspector(data);
            addToast(t('successInspectorSave'), 'success');
            reloadDataFromStorage();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveSettings = async (data: any) => {
        setIsProcessing(true);
        try {
            saveSettings({...data, institutionLocations});
            setEvaluationCriteria(data.criteria);
            setAcademies(data.academies);
            setDirectorates(data.directorates);
            setSportActivities(data.activities);
            setLevels(data.levels);
            setDepartments(data.departments);
            setSubjects(data.subjects);
            setMinistryLogo(data.ministryLogo);
            setMinistryLogoFr(data.ministryLogoFr);
            setMinistryLogoHeight(data.ministryLogoHeight);
            setMinistryLogoHeightFr(data.ministryLogoHeightFr);
            if (data.geminiApiKey !== undefined) {
                setGeminiApiKey(data.geminiApiKey);
                // Only attempt to save to cloud if authenticated
                if (inspector.fullName && auth.currentUser) {
                    await saveAiKeyToCloud(inspector.fullName, data.geminiApiKey);
                }
            }
            addToast(t('successSettingsSave'), 'success');
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreData = (jsonData: string) => {
        setConfirmationState({
            isOpen: true, title: t('confirmRestoreTitle'), message: t('confirmRestoreMessage'),
            confirmButtonText: t('confirmRestoreButton'), messageColor: 'text-slate-500 dark:text-slate-400',
            onConfirm: async () => {
                setConfirmationState({ ...confirmationState, isOpen: false });
                setIsProcessing(true);
                try {
                    const data = JSON.parse(jsonData);
                    importAllData(data);
                    
                    reloadDataFromStorage();
                    addToast(t('successRestore'), 'success');
                } catch (e: any) {
                    console.error("Restore error:", e);
                    addToast(`${t('errorRestore')}: ${e.message}`, 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleSaveTeacher = async (teacherData: Omit<Teacher, 'id'> | Teacher) => {
        setIsProcessing(true);
        try {
            saveTeacher(teacherData);
            const data = reloadDataFromStorage(); 
            let savedTeacher: Teacher | undefined;
            if (data) {
                if ('id' in teacherData && teacherData.id) {
                     savedTeacher = data.teachers.find(t => String(t.id) === String(teacherData.id));
                }
                if (!savedTeacher) {
                     savedTeacher = data.teachers.find(t => t.fullName === teacherData.fullName && t.employeeId === teacherData.employeeId);
                }
                if (savedTeacher && selectedTeacher && String(selectedTeacher.id) === String(savedTeacher.id)) {
                    setSelectedTeacher(savedTeacher);
                }
            }
            addToast('id' in teacherData ? t('successTeacherUpdate') : t('successTeacherAdd'), 'success');
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteTeacher = (teacher: Teacher) => {
        setConfirmationState({
            isOpen: true, title: t('confirmDeleteTitle_teacher'), message: t('confirmDeleteMessage_teacher'),
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    deleteTeacher(teacher);
                    addToast(t('successTeacherDelete'), 'success');
                    reloadDataFromStorage();
                } catch (e: any) {
                    addToast(t('errorOccurredWithMessage', e.message), 'error');
                } finally {
                    setIsProcessing(false);
                    setConfirmationState({ ...confirmationState, isOpen: false });
                }
            },
        });
    };

    const handleImportTeachers = async (importedTeachers: Teacher[]) => {
        try {
            replaceAllTeachers(importedTeachers);
            reloadDataFromStorage();
            addToast(t('successTeachersImport'), 'success');
        } catch(e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleInitiateImport = (onProceed: () => void) => {
        if (teachers.length > 0) {
            setConfirmationState({
                isOpen: true, title: t('confirmImportTitle'), message: t('confirmImportMessage'), confirmButtonText: t('confirmImportButton'),
                onConfirm: () => {
                    setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                    onProceed();
                }
            });
        } else {
            onProceed();
        }
    };

    const handleSaveReport = async (reportData: SavedReport) => {
        setIsProcessing(true);
        try {
            saveReport(reportData);
            addToast(t('successReportSave'), 'success');
            const data = reloadDataFromStorage(); 
            if (data) {
                setSelectedTeacher(data.teachers.find(t => String(t.id) === String(reportData.teacherId)) || null);
            }
            setPage('teacherDetail');
            setEditingReport(null);
        } catch (e: any) {
            addToast(`${t('errorReportSave')}: ${e.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveOtherReport = async (reportData: Omit<OtherReport, 'id'> | OtherReport) => {
        try {
            saveOtherReport(reportData);
            reloadDataFromStorage();
            addToast(t('successReportSave'), 'success');
            setEditingOtherReport(null);
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };
    
    const handleSaveTransmissionSlip = async (slipData: Omit<TransmissionSlip, 'id'> | TransmissionSlip) => {
        try {
            saveTransmissionSlip(slipData);
            reloadDataFromStorage();
            addToast(t('successSlipSave'), 'success');
            setEditingTransmissionSlip(null);
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleDeleteReport = (report: SavedReport) => {
        setConfirmationState({
            isOpen: true, title: t('confirmDeleteTitle_report'), message: t('confirmDeleteMessage_report'),
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    deleteReport(report);
                    addToast(t('successReportDelete'), 'success');
                    const data = reloadDataFromStorage();
                    if (data && selectedTeacher && String(selectedTeacher.id) === String(report.teacherId)) {
                        setSelectedTeacher(data.teachers.find(t => String(t.id) === String(report.teacherId)) || null);
                    }
                } catch (e: any) {
                    addToast(t('errorOccurredWithMessage', e.message), 'error');
                } finally {
                    setIsProcessing(false);
                    setConfirmationState({ ...confirmationState, isOpen: false });
                }
            },
        });
    };

    const syncToCloudBackground = async () => {
        if (inspector?.fullName) {
            try {
                await syncToCloud(inspector.fullName);
            } catch (e) {
                console.error("Background sync failed:", e);
            }
        }
    };

    const handleToggleReportDelivered = async (report: SavedReport) => {
        const updatedReport = { ...report, delivered: !report.delivered };
        try {
            saveReport(updatedReport);
            reloadDataFromStorage();
            addToast(updatedReport.delivered ? "تم وضع علامة 'تم التسليم'" : "تم إلغاء علامة 'تم التسليم'", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleMarkAllReportsDelivered = async (reportIds: string[]) => {
        try {
            markAllReportsDelivered(reportIds);
            reloadDataFromStorage();
            addToast("تم وضع علامة 'تم التسليم' على جميع التقارير", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };
    
    const handleDeleteOtherReport = (report: OtherReport) => {
        setConfirmationState({
            isOpen: true, title: t('confirmDeleteTitle_report'), message: t('confirmDeleteMessage_report'),
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    deleteOtherReport(report);
                    addToast(t('successReportDelete'), 'success');
                    reloadDataFromStorage();
                } catch (e: any) {
                    addToast(t('errorOccurredWithMessage', e.message), 'error');
                } finally {
                    setIsProcessing(false);
                    setConfirmationState({ ...confirmationState, isOpen: false });
                }
            },
        });
    };

    const handleToggleOtherReportDelivered = async (report: OtherReport) => {
        const updatedReport = { ...report, delivered: !report.delivered };
        try {
            saveOtherReport(updatedReport);
            reloadDataFromStorage();
            addToast(updatedReport.delivered ? "تم وضع علامة 'تم التسليم'" : "تم إلغاء علامة 'تم التسليم'", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleMarkAllOtherReportsDelivered = async (reportIds: string[]) => {
        try {
            markAllOtherReportsDelivered(reportIds);
            reloadDataFromStorage();
            addToast("تم وضع علامة 'تم التسليم' على جميع التقارير", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleToggleSlipDelivered = async (slip: TransmissionSlip) => {
        const updatedSlip = { ...slip, delivered: !slip.delivered };
        try {
            saveTransmissionSlip(updatedSlip);
            reloadDataFromStorage();
            addToast(updatedSlip.delivered ? "تم وضع علامة 'تم التسليم'" : "تم إلغاء علامة 'تم التسليم'", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleMarkAllSlipsDelivered = async (slipIds: string[]) => {
        try {
            markAllSlipsDelivered(slipIds);
            reloadDataFromStorage();
            addToast("تم وضع علامة 'تم التسليم' على جميع أوراق الإرسال", 'success');
            syncToCloudBackground();
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleSaveMemo = (memo: any) => {
        try {
            saveMemo(memo);
            reloadDataFromStorage();
            addToast("تم حفظ المذكرة بنجاح", 'success');
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const handleDeleteMemo = (id: string) => {
        try {
            deleteMemo(id);
            reloadDataFromStorage();
            addToast("تم حذف المذكرة بنجاح", 'success');
        } catch (e: any) {
            addToast(t('errorOccurredWithMessage', e.message), 'error');
        }
    };

    const getAcademicYear = (dateString: string): string => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    };

    const handleDeleteAcademicYear = (year: string) => {
        setConfirmationState({
            isOpen: true,
            title: t('confirmDeleteTitle_academicYear'),
            message: t('confirmDeleteMessage_academicYear'),
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const reportsToDelete = reports.filter(r => getAcademicYear(r.date) === year);
                    const otherReportsToDelete = otherReports.filter(r => getAcademicYear(r.date) === year);

                    // Delete Saved Reports
                    for (const r of reportsToDelete) {
                        deleteReport(r);
                    }

                    // Delete Other Reports
                    for (const r of otherReportsToDelete) {
                        deleteOtherReport(r);
                    }

                    addToast(`تم حذف تقارير الموسم ${year} بنجاح`, 'success');
                    reloadDataFromStorage();
                } catch (e: any) {
                    addToast(t('errorOccurredWithMessage', e.message), 'error');
                } finally {
                    setIsProcessing(false);
                    setConfirmationState({ ...confirmationState, isOpen: false });
                }
            }
        });
    };

    const handleDeleteTransmissionSlip = (slip: TransmissionSlip) => {
        setConfirmationState({
            isOpen: true, title: t('confirmDeleteTitle_slip'), message: t('confirmDeleteMessage_slip'),
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    deleteTransmissionSlip(slip);
                    addToast(t('successSlipDelete'), 'success');
                    reloadDataFromStorage();
                } catch (e: any) {
                    addToast(t('errorOccurredWithMessage', e.message), 'error');
                } finally {
                    setIsProcessing(false);
                    setConfirmationState({ ...confirmationState, isOpen: false });
                }
            },
        });
    };
    
    const showInspectorModal = () => setIsInspectorModalOpen(true);
    const showAboutModal = () => setIsAboutModalOpen(true);
    const navigateToTeachers = () => setPage('teachers');
    const navigateToReports = () => setPage('reports');
    
    const navigateToOtherReports = () => {
        setEditingOtherReport(null);
        setPage('otherReports');
    };

    const navigateToSettings = () => setPage('settings');
    const navigateToActivitySummary = () => setPage('activitySummary');
    const navigateToTransmissionSlip = () => {
        setEditingTransmissionSlip(null);
        setPage('transmissionSlip');
    };
    const navigateToInspectionSpace = () => setPage('inspectionSpace');
    const navigateToStatistics = () => setPage('statistics');
    const navigateToResearch = () => setPage('research');

    const handleTeacherSelectForReport = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setIsReportTypeModalOpen(true);
    };

    const handleReportTypeSelect = (type: ReportType) => {
        setIsReportTypeModalOpen(false);
        setNewReportType(type);
        setEditingReport(null);
        setPage('newReport_evaluation');
    };
    
    const handleStartNewReport = () => {
        setSelectedTeacher(null);
        setPage('newReport_selectTeacher');
    };

    const handleViewTeacherDetail = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setPage('teacherDetail');
    };

    const handleStartVisit = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setNewReportType(ReportType.VISIT);
        setEditingReport(null);
        setPage('newReport_evaluation');
    };
    
    const handleStartInspection = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setNewReportType(ReportType.INSPECTION);
        setEditingReport(null);
        setPage('newReport_evaluation');
    };

    const handleViewReport = (report: SavedReport) => {
        const teacherForReport = teachers.find(t => String(t.id) === String(report.teacherId)) || null;
        setViewingReport(report);
        setViewingReportTeacher(teacherForReport);
        setIsReportModalOpen(true);
    };

    const handleViewOtherReport = (report: OtherReport) => {
        setViewingOtherReport(report);
        setIsOtherReportModalOpen(true);
    };

    const handleViewTransmissionSlip = (slip: TransmissionSlip) => {
        setViewingTransmissionSlip(slip);
        setIsTransmissionSlipModalOpen(true);
    };

    const handleEditReport = (report: SavedReport) => {
        const teacherForReport = teachers.find(t => String(t.id) === String(report.teacherId));
        if (teacherForReport) {
            setSelectedTeacher(teacherForReport);
            setNewReportType(report.reportType);
            setEditingReport(report);
            setPage('newReport_evaluation');
        } else {
            addToast("لم يتم العثور على الأستاذ المرتبط بهذا التقرير.", 'error');
        }
    };

    const handleEditOtherReport = (report: OtherReport) => {
        setEditingOtherReport(report);
        setPage('otherReports');
    };
    
    const handleEditTransmissionSlip = (slip: TransmissionSlip) => {
        setEditingTransmissionSlip(slip);
        setPage('transmissionSlip');
    };

    const handleUpdateInstitutionLocation = (institution: string, lat: number, lng: number) => {
        const newLocations = { ...institutionLocations, [institution]: { lat, lng } };
        setInstitutionLocations(newLocations);
        
        const settingsData = {
            criteria: evaluationCriteria, academies, directorates, activities: sportActivities,
            levels, departments, subjects, ministryLogo, ministryLogoHeight,
            institutionLocations: newLocations
        };
        saveSettings(settingsData);
        addToast("تم تحديث موقع المؤسسة بنجاح", "success");
    };

    const handleSyncToCloud = async () => {
        if (!auth.currentUser) {
            addToast(t('errorAuthRequired'), 'error');
            return;
        }
        if (!inspector.fullName) {
            addToast(t('errorInspectorNameRequired'), 'error');
            return;
        }
        setIsProcessing(true);
        const loadingToastId = addToast(t('settings_syncingToCloud') || 'جاري الرفع إلى السحابة... يرجى الانتظار', 'info', false);
        try {
            await syncToCloud(inspector.fullName);
            removeToast(loadingToastId);
            addToast(t('settings_syncToCloudSuccess'), 'success');
        } catch (e: any) {
            const errorMsg = e.message || '';
            const isOffline = errorMsg === 'OFFLINE_ERROR' || errorMsg.toLowerCase().includes('offline');
            
            if (!isOffline) {
                console.error("Sync to cloud error:", e);
            }
            removeToast(loadingToastId);
            
            let finalMsg = t('settings_syncError');
            
            if (isOffline) {
                finalMsg = t('errorOfflineSync');
            } else if (errorMsg === 'AUTH_REQUIRED_ERROR') {
                finalMsg = t('errorAuthRequired');
            } else if (errorMsg.startsWith('{')) {
                try {
                    const parsed = JSON.parse(errorMsg);
                    if (parsed.error && parsed.error.includes('offline')) {
                        finalMsg = t('errorOfflineSync');
                    } else {
                        finalMsg = `${t('settings_syncError')}: ${parsed.error || errorMsg}`;
                    }
                } catch(err) {
                    finalMsg = `${t('settings_syncError')}: ${errorMsg}`;
                }
            } else {
                finalMsg = `${t('settings_syncError')}: ${errorMsg}`;
            }
            
            addToast(finalMsg, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSyncFromCloud = () => {
        if (!auth.currentUser) {
            addToast(t('errorAuthRequired'), 'error');
            return;
        }
        if (!inspector.fullName) {
            addToast(t('errorInspectorNameRequired'), 'error');
            return;
        }
        setConfirmationState({
            isOpen: true, 
            title: t('settings_syncFromCloudConfirmTitle') || 'تحديث من السحابة', 
            message: t('settings_syncFromCloudConfirmMessage') || 'هل أنت متأكد أنك تريد جلب البيانات من السحابة؟ سيتم استبدال جميع بياناتك الحالية.',
            confirmButtonText: t('confirmDeleteTitle_confirm') || 'نعم، قم بالتحديث', 
            messageColor: 'text-slate-500 dark:text-slate-400',
            onConfirm: async () => {
                setConfirmationState({ ...confirmationState, isOpen: false });
                setIsProcessing(true);
                const loadingToastId = addToast(t('settings_syncingFromCloud'), 'info', false);
                try {
                    await syncFromCloud(inspector.fullName);
                    reloadDataFromStorage();
                    removeToast(loadingToastId);
                    addToast(t('settings_syncSuccess'), 'success');
                } catch (e: any) {
                    const errorMsg = e.message || '';
                    const isOffline = errorMsg === 'OFFLINE_ERROR' || errorMsg.toLowerCase().includes('offline');

                    if (!isOffline) {
                        console.error("Sync from cloud error:", e);
                    }
                    removeToast(loadingToastId);
                    
                    let finalMsg = t('settings_syncError');
                    
                    if (isOffline) {
                        finalMsg = t('errorOfflineSync');
                    } else if (errorMsg === 'AUTH_REQUIRED_ERROR') {
                        finalMsg = t('errorAuthRequired');
                    } else if (errorMsg.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(errorMsg);
                            if (parsed.error && parsed.error.includes('offline')) {
                                finalMsg = t('errorOfflineSync');
                            } else {
                                finalMsg = `${t('settings_syncError')}: ${parsed.error || errorMsg}`;
                            }
                        } catch(err) {
                            finalMsg = `${t('settings_syncError')}: ${errorMsg}`;
                        }
                    } else {
                        finalMsg = `${t('settings_syncError')}: ${errorMsg}`;
                    }
                    
                    addToast(finalMsg, 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleSyncFromPlatform = async (showToast: boolean = true) => {
        if (!auth.currentUser) {
            addToast('يرجى تسجيل الدخول بحساب Google أولاً للتمكن من المزامنة', 'error');
            return;
        }

        setIsProcessing(true);
        let loadingToastId: number | null = null;
        if (showToast) {
            loadingToastId = addToast('جاري مزامنة الأساتذة من المنصة... يرجى الانتظار', 'info', false);
        }
        try {
            const teachersRef = collection(db, 'teachers');
            const q = query(teachersRef, where('is_deleted', '==', false));
            const querySnapshot = await getDocs(q);
            
            const data: any[] = [];
            querySnapshot.forEach((docSnap) => {
                data.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (data && data.length > 0) {
                let addedCount = 0;
                let updatedCount = 0;
                const updatedTeachers = [...teachers];

                data.forEach((t: any) => {
                    const mappedTeacher: Teacher = {
                        id: t.id,
                        fullName: t.full_name || '',
                        employeeId: t.employee_id || 0,
                        genre: t.genre || 'male',
                        framework: t.framework || '',
                        institution: t.institution || '',
                        subject: t.subject || '',
                        grade: t.grade || '',
                        rank: t.rank || 0,
                        lastInspectionScore: t.last_inspection_score || null,
                        lastInspectionDate: t.last_inspection_date || null,
                        lastInspector: t.last_inspector || null,
                        image: t.image || undefined,
                        schedule: t.schedule || [],
                        recruitmentDate: t.recruitment_date || undefined,
                        tenureDate: t.tenure_date || undefined,
                        gradeDate: t.grade_date || undefined,
                        promotionPace: t.promotion_pace || undefined,
                    };

                    const existingIndex = updatedTeachers.findIndex(
                        existing => String(existing.id) === String(t.id) || 
                                    (existing.employeeId && existing.employeeId === t.employee_id)
                    );

                    if (existingIndex > -1) {
                        // Keep local ID if matched by employeeId to avoid breaking relations
                        mappedTeacher.id = updatedTeachers[existingIndex].id;
                        updatedTeachers[existingIndex] = mappedTeacher;
                        updatedCount++;
                    } else {
                        updatedTeachers.push(mappedTeacher);
                        addedCount++;
                    }
                });

                replaceAllTeachers(updatedTeachers);
                reloadDataFromStorage();
                if (showToast) {
                    if (loadingToastId) removeToast(loadingToastId);
                    addToast(`تمت المزامنة بنجاح: إضافة ${addedCount} وتحديث ${updatedCount} أستاذ(ة).`, 'success');
                }
            } else {
                if (showToast) {
                    if (loadingToastId) removeToast(loadingToastId);
                    addToast('لم يتم العثور على أساتذة في المنصة.', 'info');
                }
            }
        } catch (e: any) {
            if (showToast) {
                console.error("Sync from platform error:", e);
                if (loadingToastId) removeToast(loadingToastId);
                addToast(`حدث خطأ أثناء المزامنة: ${e.message}`, 'error');
            } else {
                // Silently ignore background sync errors to avoid console spam
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const renderPage = () => {
        const currentSelectedTeacher = selectedTeacher ? teachers.find(t => String(t.id) === String(selectedTeacher.id)) || selectedTeacher : null;

        switch (page) {
            case 'teachers':
                return <TeachersListPage teachers={teachers} onTeacherSelect={handleViewTeacherDetail} onAddOrUpdateTeacher={handleSaveTeacher} onDeleteTeacher={handleDeleteTeacher} onImportTeachers={handleImportTeachers} onInitiateImport={handleInitiateImport} onGoHome={goHome} onNavigateToInspectionSpace={navigateToInspectionSpace} inspectorSubject={inspector.subject} subjects={subjects} institutionLocations={institutionLocations} onUpdateInstitutionLocation={handleUpdateInstitutionLocation} />;
            case 'teacherDetail':
                return currentSelectedTeacher && <TeacherDetailPage teacher={currentSelectedTeacher} reports={reports.filter(r => String(r.teacherId) === String(currentSelectedTeacher.id))} onBack={() => setPage('teachers')} onGoHome={goHome} onViewReport={handleViewReport} onStartVisit={handleStartVisit} onStartInspection={handleStartInspection} onEditReport={handleEditReport} onDeleteReport={handleDeleteReport} onToggleReportDelivered={handleToggleReportDelivered} />;
            case 'reports':
                return <ReportsListPage reports={reports} onStartNewReport={handleStartNewReport} onViewReport={handleViewReport} onEditReport={handleEditReport} onDeleteReport={handleDeleteReport} onGoHome={goHome} onToggleReportDelivered={handleToggleReportDelivered} onMarkAllDelivered={handleMarkAllReportsDelivered} />;
            case 'newReport_selectTeacher':
                return <TeachersListPage teachers={teachers} onTeacherSelect={handleTeacherSelectForReport} onAddOrUpdateTeacher={handleSaveTeacher} onDeleteTeacher={handleDeleteTeacher} onImportTeachers={handleImportTeachers} onInitiateImport={handleInitiateImport} onGoHome={goHome} onNavigateToInspectionSpace={navigateToInspectionSpace} mode="select" onCancelSelect={() => setPage('reports')} inspectorSubject={inspector.subject} subjects={subjects} institutionLocations={institutionLocations} onUpdateInstitutionLocation={handleUpdateInstitutionLocation} />;
            case 'newReport_evaluation':
                if (currentSelectedTeacher && newReportType) {
                    return <EvaluationPage 
                        teacher={currentSelectedTeacher} 
                        reportType={newReportType} 
                        inspector={inspector} 
                        onSave={handleSaveReport} 
                        onCancel={() => setPage(editingReport ? 'reports' : 'teacherDetail')} 
                        onGoHome={goHome} 
                        initialData={editingReport} 
                        evaluationCriteria={evaluationCriteria} 
                        sportActivities={sportActivities} 
                        levels={levels} 
                        ministryLogo={ministryLogo} 
                        ministryLogoHeight={ministryLogoHeight}
                        ministryLogoFr={ministryLogoFr}
                        ministryLogoHeightFr={ministryLogoHeightFr}
                    />;
                }
                return <p>خطأ: لم يتم اختيار أستاذ أو نوع تقرير.</p>;
            case 'otherReports':
                return <OtherReportsPage reports={otherReports} slips={transmissionSlips} onSave={handleSaveOtherReport} onViewReport={handleViewOtherReport} onDeleteReport={handleDeleteOtherReport} onGoHome={goHome} departments={departments} reportToEdit={editingOtherReport} onEditHandled={() => setEditingOtherReport(null)} teachers={teachers} onToggleReportDelivered={handleToggleOtherReportDelivered} onMarkAllDelivered={handleMarkAllOtherReportsDelivered} memos={memos} />;
            case 'settings':
                return <SettingsPage 
                    initialCriteria={evaluationCriteria} 
                    initialAcademies={academies} 
                    initialDirectorates={directorates} 
                    initialActivities={sportActivities} 
                    initialLevels={levels} 
                    initialDepartments={departments} 
                    initialSubjects={subjects} 
                    initialMinistryLogo={ministryLogo} 
                    initialMinistryLogoFr={ministryLogoFr} 
                    initialMinistryLogoHeight={ministryLogoHeight} 
                    initialMinistryLogoHeightFr={ministryLogoHeightFr} 
                    initialGeminiApiKey={geminiApiKey} 
                    onSave={handleSaveSettings} 
                    onGoHome={goHome} 
                    onRestore={handleRestoreData} 
                    onSyncToCloud={handleSyncToCloud} 
                    onSyncFromCloud={handleSyncFromCloud} 
                />;
            case 'activitySummary':
                return <ActivitySummaryPage reports={reports} otherReports={otherReports} teachers={teachers} onViewReport={handleViewReport} onViewOtherReport={handleViewOtherReport} onGoHome={goHome} onEditReport={handleEditReport} onDeleteReport={handleDeleteReport} onEditOtherReport={handleEditOtherReport} onDeleteOtherReport={handleDeleteOtherReport} onDeleteAcademicYear={handleDeleteAcademicYear} inspector={inspector} ministryLogo={ministryLogo} ministryLogoHeight={ministryLogoHeight} onToggleReportDelivered={handleToggleReportDelivered} onToggleOtherReportDelivered={handleToggleOtherReportDelivered} />;
            case 'transmissionSlip':
                return <TransmissionSlipPage slips={transmissionSlips} reports={reports} otherReports={otherReports} teachers={teachers} onSave={handleSaveTransmissionSlip} onViewSlip={handleViewTransmissionSlip} onDeleteSlip={handleDeleteTransmissionSlip} onGoHome={goHome} departments={departments} slipToEdit={editingTransmissionSlip} onEditHandled={() => setEditingTransmissionSlip(null)} onToggleSlipDelivered={handleToggleSlipDelivered} onMarkAllDelivered={handleMarkAllSlipsDelivered} />;
            case 'inspectionSpace':
                return <InspectionSpace teachers={teachers} reports={reports} onGoHome={goHome} onImportTeachers={handleImportTeachers} onInitiateImport={handleInitiateImport} onAddTeacher={handleSaveTeacher} onDeleteTeacher={handleDeleteTeacher} onStartVisit={handleStartVisit} onStartInspection={handleStartInspection} onViewReport={handleViewReport} onEditReport={handleEditReport} onDeleteReport={handleDeleteReport} inspectorSubject={inspector.subject} subjects={subjects} institutionLocations={institutionLocations} onUpdateInstitutionLocation={handleUpdateInstitutionLocation} onToggleReportDelivered={handleToggleReportDelivered} />;
            case 'statistics':
                return <StatisticsPage reports={reports} otherReports={otherReports} memos={memos} onSaveMemo={handleSaveMemo} onDeleteMemo={handleDeleteMemo} onGoHome={goHome} />;
            case 'research':
                return <EducationalResearchPage onGoHome={goHome} />;
            case 'adminUsers':
                return <AdminUsersPage />;
            case 'home':
            default:
                return <HomePage reports={reports} otherReports={otherReports} onShowInspectorModal={showInspectorModal} onNavigateToTeachers={navigateToTeachers} onNavigateToReports={navigateToReports} onNavigateToOtherReports={navigateToOtherReports} onNavigateToActivitySummary={navigateToActivitySummary} onNavigateToTransmissionSlip={navigateToTransmissionSlip} onNavigateToInspectionSpace={navigateToInspectionSpace} onNavigateToStatistics={navigateToStatistics} onNavigateToResearch={navigateToResearch} />;
        }
    };

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        const screenWidth = window.innerWidth;
        
        // Swipe from right edge to left opens the sidebar (since it's on the right)
        if (isLeftSwipe && touchStart > screenWidth - 50) {
            setIsSidebarOpen(true);
        }
        
        // Swipe right closes the sidebar (since it's on the right)
        if (isRightSwipe && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-background))]">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600 mb-4"></div>
                </div>
            </div>
        );
    }

    const activeLogo = language === 'fr' ? (ministryLogoFr || ministryLogo) : ministryLogo;
    const activeLogoHeight = language === 'fr' ? (ministryLogoHeightFr || ministryLogoHeight) : ministryLogoHeight;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg))]">
                <LoginScreen 
                    onGoogleLogin={handleGoogleLogin} 
                    ministryLogo={activeLogo} 
                    ministryLogoHeight={activeLogoHeight * 0.7}
                    onShowAbout={() => setIsAboutModalOpen(true)} 
                />
                <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
                <Toast toasts={toasts} removeToast={removeToast} />
            </div>
        );
    }

    return (
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="min-h-screen flex flex-col" dir={dir}>
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                onNavigate={(p) => setPage(p as Page)} 
                currentPage={page} 
                onLogout={handleLogout} 
                onOpenInspectorModal={() => setIsInspectorModalOpen(true)} 
                onSyncToCloud={handleSyncToCloud} 
                onSyncFromCloud={handleSyncFromCloud} 
                onRestore={handleRestoreData} 
                isSuperAdmin={isSuperAdmin}
            />
            <Toast toasts={toasts} removeToast={removeToast} />
            {page !== 'inspectionSpace' && (
                <Header 
                    inspector={inspector} 
                    ministryLogo={activeLogo} 
                    ministryLogoHeight={activeLogoHeight}
                    onShowAboutModal={showAboutModal} 
                    onNavigateToSettings={navigateToSettings} 
                    onToggleSidebar={() => setIsSidebarOpen(true)}
                    onSyncFromPlatform={handleSyncFromPlatform} 
                />
            )}
            <main className={page === 'inspectionSpace' ? 'flex-1' : "container mx-auto px-4 pb-8 flex-1"}>
                {renderPage()}
            </main>
            <InspectorModal isOpen={isInspectorModalOpen} onClose={() => setIsInspectorModalOpen(false)} onSave={handleSaveInspector} initialData={inspector} academies={academies} directorates={directorates} subjects={subjects} />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
            <ReportTypeSelectionModal isOpen={isReportTypeModalOpen} onClose={() => setIsReportTypeModalOpen(false)} onSelect={handleReportTypeSelect} />
            <ReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)} 
                report={viewingReport} 
                teacher={viewingReportTeacher} 
                inspector={inspector} 
                ministryLogo={ministryLogo} 
                ministryLogoHeight={ministryLogoHeight}
                ministryLogoFr={ministryLogoFr}
                ministryLogoHeightFr={ministryLogoHeightFr}
            />
            <OtherReportModal 
                isOpen={isOtherReportModalOpen} 
                onClose={() => setIsOtherReportModalOpen(false)} 
                report={viewingOtherReport} 
                inspector={inspector} 
                ministryLogo={ministryLogo} 
                ministryLogoHeight={ministryLogoHeight}
                ministryLogoFr={ministryLogoFr}
                ministryLogoHeightFr={ministryLogoHeightFr}
                teachers={teachers} 
                memos={memos} 
            />
            <TransmissionSlipModal 
                isOpen={isTransmissionSlipModalOpen} 
                onClose={() => setIsTransmissionSlipModalOpen(false)} 
                slip={viewingTransmissionSlip} 
                inspector={inspector} 
                ministryLogo={ministryLogo} 
                ministryLogoHeight={ministryLogoHeight}
                ministryLogoFr={ministryLogoFr}
                ministryLogoHeightFr={ministryLogoHeightFr}
                reports={reports} 
                teachers={teachers} 
            />
            <ConfirmationModal isOpen={confirmationState.isOpen} onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} isProcessing={isProcessing} messageColor={confirmationState.messageColor} confirmButtonText={confirmationState.confirmButtonText} />
            {page !== 'inspectionSpace' && (
                <footer className="bg-[rgb(var(--color-card))] border-t border-[rgb(var(--color-border))] mt-auto py-4 text-center text-xs text-slate-500">
                    <div dangerouslySetInnerHTML={{ __html: t('footerText') }} />
                </footer>
            )}
        </div>
    );
};

export default App;
