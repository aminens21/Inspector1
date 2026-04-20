
import React, { useMemo } from 'react';
import { SavedReport, ReportType, Teacher, Inspector, EvaluationCriterion, LessonObservation } from '../types';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { exportFile } from '../services/fileExport';
import { convertHtmlToDocx } from '../services/htmlToDocx';
import { appTexts } from '../appTexts';

// Déclarations pour les bibliothèques globales chargées via CDN
declare global {
  interface Window {
    XLSX: any;
    jspdf: any;
    html2canvas: any;
    docx: any;
  }
}

const dataUrlToBuffer = async (dataUrl: string): Promise<ArrayBuffer> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return await blob.arrayBuffer();
};


const escapeHtml = (unsafe: any): string => {
    if (unsafe === null || unsafe === undefined) return '';
    const str = String(unsafe);
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

const reportTranslations: Record<string, any> = {
    ar: {
        inspectionReport: "تقرير تفتيش",
        visitReport: "تقرير زيارة صفية",
        inspection_report_title: "تقرير تفتيش تربوي",
        visit_report_title: "تقرير زيارة صفية",
        grade_label: "الدرجة",
        score_label: "النقطة",
        observation_progress: "ملاحظات حول سير الدرس",
        ministryLogoAlt: "شعار الوزارة",
        teacherDetail_infoCardTitle: "المعلومات المهنية للأستاذ(ة)",
        teacher_fullName: "الإسم الكامل",
        teacher_subject: "المادة",
        teacher_lastScore: "آخر نقطة",
        teacher_employeeId: "رقم التأجير",
        teacher_grade: "الدرجة",
        teacher_lastDate: "تاريخ آخر تفتيش",
        teacher_framework: "الإطار",
        teacher_rank: "الرتبة",
        teacher_lastInspector: "المفتش",
        teacher_institution: "المؤسسة",
        reportModal_lessonObservation: "ملاحظات حول سير الدرس",
        evaluation_field_activityCategory: "نوع النشاط",
        evaluation_field_activity: "النشاط",
        evaluation_field_level: "المستوى",
        evaluation_field_class: "القسم",
        evaluation_field_studentCount: "عدد التلاميذ",
        evaluation_field_tools: "الوسائل التعليمية",
        evaluation_field_lessonGoal: "هدف الحصة",
        report_dateLabel: "حرر بتاريخ",
        reportModal_newScore: "النقطة الممنوحة",
        signature_title_1: "توقيع المفتش",
        signature_regionalDirector: "توقيع {regionalDirectorTitle}",
        signature_institutionDirector: "توقيع مدير المؤسسة",
        teacher: "الأستاذ"
    },
    fr: {
        inspectionReport: "Rapport d'inspection",
        visitReport: "Rapport de visite de classe",
        inspection_report_title: "Rapport d'inspection pédagogique",
        visit_report_title: "Rapport de visite de classe",
        grade_label: "Grade",
        score_label: "Note",
        observation_progress: "Observations sur le déroulement de la leçon",
        ministryLogoAlt: "Logo du Ministère",
        teacherDetail_infoCardTitle: "Informations Professionnelles",
        teacher_fullName: "Nom complet",
        teacher_subject: "Matière",
        teacher_lastScore: "Dernière note",
        teacher_employeeId: "PPR",
        teacher_grade: "Grade",
        teacher_lastDate: "Date de dernière inspection",
        teacher_framework: "Cadre",
        teacher_rank: "Échelon",
        teacher_lastInspector: "Inspecteur",
        teacher_institution: "Établissement",
        reportModal_lessonObservation: "Observations sur le déroulement de la leçon",
        evaluation_field_activityCategory: "Type d'activité",
        evaluation_field_activity: "Activité",
        evaluation_field_level: "Niveau",
        evaluation_field_class: "Classe",
        evaluation_field_studentCount: "Nombre d'élèves",
        evaluation_field_tools: "Matériel didactique",
        evaluation_field_lessonGoal: "Objectif de la séance",
        report_dateLabel: "Fait le",
        reportModal_newScore: "Note attribuée",
        signature_title_1: "Signature de l'inspecteur",
        signature_regionalDirector: "Signature du {regionalDirectorTitle}",
        signature_institutionDirector: "Signature du Directeur de l'établissement",
        teacher: "Enseignant"
    }
};


interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SavedReport | null;
  teacher: Teacher | null;
  inspector: Inspector;
  ministryLogo: string;
  ministryLogoHeight?: number;
  ministryLogoFr?: string;
  ministryLogoHeightFr?: number;
}

export const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, onClose, report, teacher, inspector, ministryLogo, ministryLogoHeight = 120,
  ministryLogoFr, ministryLogoHeightFr
}) => {
  const { t, language, dir } = useTranslations();
  
  const [zoomLevel, setZoomLevel] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem('reportModalZoomLevel');
      if (savedZoom) {
        return parseFloat(savedZoom);
      }
      return window.innerWidth < 768 ? 0.35 : 0.75;
    }
    return 0.75;
  });

  const [reportFontSize, setReportFontSize] = React.useState<number>(11);
  const [reportFontFamily, setReportFontFamily] = React.useState<string>('');
  const [logoScale, setLogoScale] = React.useState<number>(1.26);
  const [marginTop, setMarginTop] = React.useState<number>(1.5);
  const [marginBottom, setMarginBottom] = React.useState<number>(1.5);
  const [marginSide, setMarginSide] = React.useState<number>(1.5);

  React.useEffect(() => {
    if (report) {
      if (report.reportFontSize) setReportFontSize(report.reportFontSize);
      if (report.reportFontFamily) setReportFontFamily(report.reportFontFamily);
      if (report.reportLogoScale) setLogoScale(report.reportLogoScale / 100);
      if (report.reportMarginTop !== undefined) setMarginTop(report.reportMarginTop);
      if (report.reportMarginBottom !== undefined) setMarginBottom(report.reportMarginBottom);
      if (report.reportMarginSide !== undefined) setMarginSide(report.reportMarginSide);
    }
  }, [report]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reportModalZoomLevel', zoomLevel.toString());
    }
  }, [zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.05, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.05, 0.1));
  };

  const handleResetZoom = () => {
    setReportFontSize(14);
    setReportFontFamily('');
    setZoomLevel(window.innerWidth < 768 ? 0.35 : 0.75);
    setLogoScale(1.26);
    setMarginTop(1.5);
    setMarginBottom(1.5);
    setMarginSide(1.5);
  };

  const parsedCriteria = useMemo(() => {
    if (!report?.criteria) return [];
    if (typeof report.criteria === 'string') {
      try {
        const parsed = JSON.parse(report.criteria);
        return Array.isArray(parsed) ? parsed.map(c => ({
            ...c,
            name: c.name || t('evaluation_criterion') 
        })) : [];
      } catch (e) {
        console.error("Impossible de parser les critères du rapport:", e);
        return [];
      }
    }
    return Array.isArray(report.criteria) ? report.criteria.map(c => ({
        ...c,
        name: c.name || t('evaluation_criterion')
    })) : [];
  }, [report, t]);

  const parsedObservation: LessonObservation | undefined = useMemo(() => {
    if (!report?.observation) return undefined;
    if (typeof report.observation === 'string') {
      try {
        const parsed = JSON.parse(report.observation);
        return (typeof parsed === 'object' && parsed !== null) ? parsed : undefined;
      } catch (e) {
        console.error("Impossible de parser l'observation du rapport:", e);
        return undefined;
      }
    }
    return (typeof report.observation === 'object' && report.observation !== null) ? report.observation : undefined;
  }, [report]);


  if (!isOpen || !report) return null;

  const reportTypeLabel = report.reportType === ReportType.INSPECTION ? t('inspectionReport') : t('visitReport');

  const getReportHtml = () => {
    const reportLanguage = report.language || 'ar';
    const direction = reportLanguage === 'ar' ? 'rtl' : 'ltr';
    const defaultFontFamily = reportLanguage === 'ar' ? "'Sakkal Majalla', Arial, sans-serif" : "'Times New Roman', Times, serif";
    const fontFamily = reportFontFamily || defaultFontFamily;
    const isInspection = report.reportType === ReportType.INSPECTION;
    const rt = reportTranslations[reportLanguage] || reportTranslations['ar'];

    // Translation helper that uses appTexts and respects the report's language
    const langT = (key: string) => {
      if (!key) return '';
      const trimmedKey = key.trim();
      // Prioritize local reportTranslations, then appTexts
      if (rt[trimmedKey]) return rt[trimmedKey];
      
      const globalTexts = appTexts[reportLanguage] || appTexts['ar'];
      return globalTexts[trimmedKey] || trimmedKey;
    };

    const currentReportTypeLabel = isInspection ? (langT('inspection_report_title') || langT('inspectionReport')) : (langT('visit_report_title') || langT('visitReport'));
    const teacherTitle = teacher?.genre === 'female' && reportLanguage === 'ar' ? 'الأستاذة' : langT('teacher');

    // Robust Date Formatter (DD/MM/YYYY)
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
            
            return reportLanguage === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
        } catch (e) {
            return dateStr;
        }
    };

    // If previousInspectionScore is explicitly null, it means there was no previous score.
    const rawLastScore = report.previousInspectionScore !== undefined 
        ? (report.previousInspectionScore === null ? '' : report.previousInspectionScore)
        : (teacher?.lastInspectionScore ?? '');
        
    const lastScore = rawLastScore !== '' ? rawLastScore : '';
        
    const lastDateRaw = report.previousInspectionDate !== undefined
        ? (report.previousInspectionDate === null ? '' : report.previousInspectionDate)
        : (teacher?.lastInspectionDate ?? '');
    const lastDate = lastDateRaw ? formatDate(lastDateRaw) : '';
    
    // Only show last inspector if there is a last score
    const lastInspector = lastScore !== '' ? (report.previousInspector !== undefined ? (report.previousInspector === null ? '' : report.previousInspector) : (teacher?.lastInspector || '')) : '';
    
    const reportDateForDisplay = formatDate(report.date);

    const isNetwork = report.reportTemplate === 'network';
    
    const currentLogo = (report.language === 'fr' && ministryLogoFr) ? ministryLogoFr : ministryLogo;
    const currentLogoHeight = (report.language === 'fr' && ministryLogoHeightFr) ? ministryLogoHeightFr : ministryLogoHeight;
    
    // Localized fields using the report language independent helper
    const currentTeacherName = (report.language === 'fr' && teacher?.fullNameFr) ? teacher.fullNameFr : (teacher?.fullName || '');
    const currentSubject = (report.language === 'fr') ? (langT(teacher?.subject || '') || teacher?.subject || '') : (teacher?.subject || '');
    const currentFramework = (report.language === 'fr') ? (langT(teacher?.framework || '') || teacher?.framework || '') : (teacher?.framework || '');
    const currentInstitution = (report.language === 'fr' && teacher?.institutionFr) ? teacher.institutionFr : (teacher?.institution || '');
    const currentAcademy = (report.language === 'fr') ? (langT(inspector.regionalAcademy || '') || inspector.regionalAcademy || '') : (inspector.regionalAcademy || '');
    const currentDirectorate = (report.language === 'fr') ? (langT(inspector.regionalDirectorate || '') || inspector.regionalDirectorate || '') : (inspector.regionalDirectorate || '');
    const currentRegionalDirectorTitle = (report.language === 'fr') ? (langT(inspector.regionalDirectorTitle || '') || inspector.regionalDirectorTitle || 'Directeur Provincial') : (inspector.regionalDirectorTitle || 'المدير الإقليمي');

    const headerHtml = `
      <table style="width: 100%; margin-bottom: 0.5rem; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; vertical-align: middle;">
            <img src="${currentLogo}" alt="${langT('ministryLogoAlt')}" style="height: ${currentLogoHeight * logoScale}px; width: auto; max-width: 100%; object-fit: contain;" />
          </td>
          <td style="width: 50%; text-align: ${reportLanguage === 'ar' ? 'left' : 'right'}; vertical-align: middle;">
            <table style="width: 400px; border-collapse: collapse; float: ${reportLanguage === 'ar' ? 'left' : 'right'};">
              <tr>
                <td style="background-color: #f2f2f2; border: 1px solid #000; padding: 10px; text-align: center; vertical-align: middle;">
                  <span style="font-size: ${18/11}em; font-weight: bold; margin: 0; color: #000;">${escapeHtml(currentReportTypeLabel)}</span>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 5px;">
                  <span style="font-size: 1.1em; font-weight: bold;">${escapeHtml(currentInstitution)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    
    const teacherInfoHtml = teacher ? `
    <div style="margin-top: 0.5rem;">
          <table style="width: 100%; border-collapse: collapse; background-color: #f2f2f2;">
              <tr>
                  <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${12/11}em; vertical-align: middle; line-height: 1.3;">${langT('teacherDetail_infoCardTitle')}</td>
              </tr>
          </table>
        <div style="border: 1px solid #ddd; border-top: none; padding: 0.4rem;">
            <table style="width: 100%; border-collapse: collapse; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; font-size: inherit;">
                <tbody>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_fullName')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(currentTeacherName)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_subject')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(currentSubject)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_lastScore')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastScore)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_employeeId')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.employeeId)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_grade')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(langT(String(teacher.grade)) || String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', ''))}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_lastDate')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastDate)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_framework')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(currentFramework)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${langT('teacher_rank')}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.rank)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${lastScore !== '' ? langT('teacher_lastInspector') + ':' : ''}</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastInspector)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>` : '';
      
    const observationHtml = parsedObservation ? `
      <div style="margin-top: 0.5rem;">
          <table style="width: 100%; border-collapse: collapse; background-color: #f2f2f2;">
              <tr>
                  <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${12/11}em; vertical-align: middle; line-height: 1.3;">${langT('reportModal_lessonObservation')}</td>
              </tr>
          </table>
        <div style="border: 1px solid #ddd; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: inherit;">
                <tr style="background-color: #e0e0e0;">
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_activityCategory')}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_activity')}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_level')}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_class')}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_studentCount')}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${langT('evaluation_field_tools')}</th>
                </tr>
                <tr>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(langT(parsedObservation.activityCategory) || parsedObservation.activityCategory)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(langT(parsedObservation.activity) || parsedObservation.activity)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(langT(parsedObservation.level) || parsedObservation.level)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.class)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.studentCount)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.tools)}</td>
                </tr>
              </table>
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #ddd; font-size: inherit;">
                  <tr>
                    <td style="background-color: #f2f2f2; padding: 6px 4px; text-align: center; font-weight: bold; border-right: 1px solid #ddd; width: 20%; vertical-align: middle; line-height: 1.3;">${langT('evaluation_field_lessonGoal')} :</td>
                    <td style="padding: 6px 4px; text-align: center; vertical-align: middle; line-height: 1.3;">${escapeHtml(parsedObservation.lessonGoal).replace(/\n/g, '<br />')}</td>
                  </tr>
              </table>
          </div>
      </div>` : '';
    
    const getAchievementLevelText = (level: string) => {
        switch (level) {
            case '3': return 'جيد';
            case '2': return 'لا بأس بها';
            case '1': return 'ينبغي الأشتغال عليه';
            case '0': return 'غير متوفر';
            default: return level || (reportLanguage === 'ar' ? 'غير مقيم' : 'Non évalué');
        }
    };

    let criteriaHtml = '';
    if (report.reportTemplate === 'network') {
        criteriaHtml = `
        <div style="margin-top: 0.5rem; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 0.85em; line-height: 1.1;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 20%; vertical-align: middle; text-align: center; line-height: 1.1;">${reportLanguage === 'ar' ? 'المجالات' : 'Domaines'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 35%; vertical-align: middle; text-align: center; line-height: 1.1;">${reportLanguage === 'ar' ? 'المؤشرات' : 'Indicateurs'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 15%; vertical-align: middle; text-align: center; line-height: 1.1;">${reportLanguage === 'ar' ? 'مستوى الإنجاز' : 'Niveau de réalisation'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 30%; vertical-align: middle; text-align: center; line-height: 1.1;">${reportLanguage === 'ar' ? 'الملاحظات والتوجيهات' : 'Observations et orientations'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${parsedCriteria.map((c: EvaluationCriterion) => {
                        const indicators = c.indicators || [];
                        const rowSpan = indicators.length > 0 ? indicators.length : 1;
                        
                        if (indicators.length === 0) {
                            return `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; vertical-align: middle; text-align: center; line-height: 1.1;">${escapeHtml(c.name)}</td>
                                <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.1;">-</td>
                                <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.1;">-</td>
                                <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.1;">${escapeHtml(c.comment.trim()).replace(/\n/g, '<br />')}</td>
                            </tr>`;
                        }

                        return indicators.map((ind, index) => {
                            if (index === 0) {
                                return `
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; vertical-align: middle; text-align: center; line-height: 1.1;" rowspan="${rowSpan}">${escapeHtml(c.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.1;">${escapeHtml(ind.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.1;"><strong>${escapeHtml(getAchievementLevelText(ind.level))}</strong></td>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.1;" rowspan="${rowSpan}">${escapeHtml(c.comment.trim()).replace(/\n/g, '<br />')}</td>
                                </tr>`;
                            } else {
                                return `
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.1;">${escapeHtml(ind.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.1;"><strong>${escapeHtml(getAchievementLevelText(ind.level))}</strong></td>
                                </tr>`;
                            }
                        }).join('');
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    } else {
        criteriaHtml = `
          <div style="margin-top: 0.75rem; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">
            ${parsedCriteria.map((c: EvaluationCriterion) => `
                  <div style="margin-bottom: 0.5rem;">
                    <p style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 1.1em; margin-bottom: 0.5rem;">${escapeHtml(c.name)}</p>
                    <div style="padding: 0.4rem; min-height: 40px; white-space: pre-wrap; text-align: justify; text-indent: 1.5em;">${escapeHtml(c.comment).replace(/\n/g, '<br />') || '<br/>'}</div>
                  </div>
                `).join('')}
          </div>`;
    }

    const overallAssessmentHtml = report.reportTemplate === 'network' && report.overallAssessment ? `
      <div style="margin-top: 0.5rem; border: 1px solid #ddd; padding: 0.3rem; background-color: #fafafa; font-size: 1em;">
        <p style="font-weight: bold; margin-bottom: 0.2rem;">${reportLanguage === 'ar' ? 'التقدير الإجمالي' : 'Appréciation globale'} :</p>
        <div style="white-space: pre-wrap; text-align: justify; text-indent: 1.5em; line-height: 1.2;">${escapeHtml(report.overallAssessment).replace(/\n/g, '<br />')}</div>
      </div>
    ` : '';

    const dateLabel = rt.report_dateLabel;

    const scoreLine = isInspection && report.score != null ? `
        <span style="font-weight: bold; margin-right: 1rem; margin-left: 1rem; display: inline-block; white-space: nowrap;">
            <strong>${rt.reportModal_newScore}:</strong> <span dir="ltr" style="unicode-bidi: isolate;">${report.score} / 20</span>
        </span>
    ` : '';

    const dateAndScoreHtml = `
      <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #ccc; page-break-inside: avoid; text-align: ${reportLanguage === 'ar' ? 'left' : 'right'};">
        <p style="margin-bottom: 0.2rem; white-space: nowrap;">
          <strong>${dateLabel}:</strong> ${reportDateForDisplay}
          ${scoreLine}
        </p>
      </div>
    `;

    const signatureRegionalDirector = rt.signature_regionalDirector.replace('{regionalDirectorTitle}', currentRegionalDirectorTitle);

    // Updated Signature Order: Inspector (Right) -> Reg Dir -> Inst Dir -> Teacher (Left)
    // REMOVED inspector/teacher names from signatures rows as requested
    const signaturesHtml = teacher ? `
      <div style="margin-top: 1.5rem; padding-top: 0.5rem; text-align: right; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr>
            <td style="width: 25%; vertical-align: middle;"><strong>${rt.signature_title_1}</strong></td>
            <td style="width: 25%; vertical-align: middle;"><strong>${signatureRegionalDirector}</strong></td>
            <td style="width: 25%; vertical-align: middle;"><strong>${rt.signature_institutionDirector}</strong></td>
            <td style="width: 25%; vertical-align: middle;"><strong>${teacherTitle}</strong></td>
          </tr>
          <tr>
            <td style="padding-top: 5.5rem;"></td>
            <td style="padding-top: 5.5rem;"></td>
            <td style="padding-top: 5.5rem;"></td>
            <td style="padding-top: 5.5rem;"></td>
          </tr>
        </table>
      </div>` : '';
      
    const bodyContent = `${headerHtml}${teacherInfoHtml}${observationHtml}${criteriaHtml}${overallAssessmentHtml}${dateAndScoreHtml}${signaturesHtml}`;

    return `
      <html lang="${reportLanguage}">
      <head>
          <meta charset="UTF-8">
      </head>
      <body>
          <style>
              body { 
                  direction: ${direction}; 
                  font-family: ${fontFamily}; 
                  line-height: ${report.reportTemplate === 'network' ? '1.1' : '1.5'}; 
                  font-size: ${reportFontSize}pt;
                  background-color: white;
                  color: black;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  margin: ${marginTop}cm ${marginSide}cm ${marginBottom}cm;
                  padding: 0;
              } 
              p { white-space: pre-wrap; margin: 0; }
              table { border-spacing: 0; }
          </style>
          ${bodyContent}
      </body>
      </html>`;
  };

  // Safe extract for Excel
  const lastScoreForExcel = report.previousInspectionScore !== undefined 
      ? (report.previousInspectionScore === null ? '' : report.previousInspectionScore)
      : (teacher?.lastInspectionScore ?? '');

  const lastDateRawForExcel = report.previousInspectionDate !== undefined
      ? (report.previousInspectionDate === null ? '' : report.previousInspectionDate)
      : (teacher?.lastInspectionDate ?? '');
  const lastDateForExcel = lastDateRawForExcel ? new Date(lastDateRawForExcel).toLocaleDateString('fr-CA') : '';
  
  const lastInspectorForExcel = lastScoreForExcel !== '' ? (report.previousInspector !== undefined ? (report.previousInspector === null ? '' : report.previousInspector) : (teacher?.lastInspector || '')) : '';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const fullHtml = getReportHtml();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    } else {
        alert(t('errorPopupBlocker'));
    }
  };

  const handleExportWord = async () => {
    if (!report || !teacher) {
        return;
    }
    
    const fullHtml = getReportHtml();
    const reportLanguage = report.language || 'ar';
    const direction = reportLanguage === 'ar' ? 'rtl' : 'ltr';
    const isInspection = report.reportType === ReportType.INSPECTION;
    const rt = reportTranslations[reportLanguage] || reportTranslations['ar'];
    const currentReportTypeLabel = isInspection ? rt.inspectionReport : rt.visitReport;

    // Extract body content
    const bodyContent = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
    const defaultFontFamily = reportLanguage === 'ar' ? "'Sakkal Majalla', Arial, sans-serif" : "'Times New Roman', Times, serif";
    const fontFamily = reportFontFamily || defaultFontFamily;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="${reportLanguage}">
        <head>
            <meta charset='utf-8'>
            <title>${currentReportTypeLabel}</title>
            <style>
                body { font-family: ${fontFamily}; direction: ${direction}; text-align: ${direction === 'rtl' ? 'right' : 'left'}; font-size: ${reportFontSize}pt; line-height: ${report.reportTemplate === 'network' ? '1.1' : '1.5'}; }
                table { border-collapse: collapse; width: 100%; border: none; }
                th, td { border: none; padding: 2px; vertical-align: middle; }
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `;

    try {
        const docxBlob = await convertHtmlToDocx(htmlContent, {
            orientation: 'portrait',
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        });
        await exportFile(docxBlob, `${reportTypeLabel} - ${report.teacherName}.doc`);
    } catch (error) {
        console.error('Error generating DOCX:', error);
        alert('حدث خطأ أثناء إنشاء ملف Word.');
    }
  };
  
  const generatePdfBlob = async (): Promise<Blob | null> => {
    const fullHtml = getReportHtml();
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
      alert(t('errorExportLibrary'));
      return null;
    }

    const { jsPDF } = window.jspdf;
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.width = '1000px'; 
    container.innerHTML = fullHtml;
    document.body.appendChild(container);

    // Wait for images to load
    const images = container.getElementsByTagName('img');
    await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(r => setTimeout(r, 500));

    try {
        const canvas = await window.html2canvas(container.querySelector('body') || container, {
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: container.scrollWidth,
          windowHeight: container.scrollHeight
        });
      
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = pdfWidth - 20; // 10mm margin on each side (1cm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const isNetwork = report.reportTemplate === 'network';
        const topMargin = 5; // 5mm = 0.5cm
        const bottomMargin = 10;
        const usableHeight = pdfHeight - topMargin - bottomMargin;

        let heightLeft = imgHeight;
        let position = topMargin; 
        
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
        
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + topMargin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
            heightLeft -= usableHeight;
        }
        
        return pdf.output('blob');

    } finally {
        document.body.removeChild(container);
    }
  };

  const handleExportPdf = async () => {
    const pdfBlob = await generatePdfBlob();
    if (pdfBlob) {
        await exportFile(pdfBlob, `${reportTypeLabel} - ${report.teacherName}.pdf`);
    }
  };

  const handleShare = async () => {
    // Sur mobile, l'export PDF agit comme un partage (ouvre le menu de partage avec le fichier)
    // On utilise donc exportFile
    try {
        const pdfBlob = await generatePdfBlob();
        if (!pdfBlob) return;

        const reportFileName = `${reportTypeLabel} - ${report.teacherName}.pdf`;
        await exportFile(pdfBlob, reportFileName);
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };


  const fullHtml = getReportHtml();
  const reportBodyHtml = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
  
  // Recalculate label for modal title
  const reportLanguage = report.language || 'ar';
  const rt = reportTranslations[reportLanguage] || reportTranslations['ar'];
  const modalTitle = report.reportType === ReportType.INSPECTION ? rt.inspectionReport : rt.visitReport;
  const defaultFontFamily = reportLanguage === 'ar' ? "'Sakkal Majalla', serif" : "'Times New Roman', Times, serif";
  const fontFamily = reportFontFamily || defaultFontFamily;

  const ARABIC_FONTS = [
    { label: 'Sakkal Majalla', value: "'Sakkal Majalla', Arial, sans-serif" },
    { label: 'Traditional Arabic', value: "'Traditional Arabic', serif" },
    { label: 'Arial', value: "Arial, sans-serif" },
    { label: 'Tahoma', value: "Tahoma, sans-serif" },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Cairo', value: "'Cairo', sans-serif" },
    { label: 'Amiri', value: "'Amiri', serif" },
    { label: 'Tajawal', value: "'Tajawal', sans-serif" }
  ];

  const FRENCH_FONTS = [
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Arial', value: "Arial, sans-serif" },
    { label: 'Calibri', value: "Calibri, sans-serif" },
    { label: 'Helvetica', value: "Helvetica, sans-serif" },
    { label: 'Georgia', value: "Georgia, serif" }
  ];

  const currentFonts = reportLanguage === 'ar' ? ARABIC_FONTS : FRENCH_FONTS;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="5xl">
       <div className="flex flex-wrap items-center justify-center gap-4 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-[rgb(var(--color-border))] print-hidden">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button 
              onClick={handleZoomOut}
              className="btn p-0 h-8 w-8 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              title={t('zoomOut')}
            >
              <i className="fas fa-search-minus"></i>
            </button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={handleZoomIn}
              className="btn p-0 h-8 w-8 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              title={t('zoomIn')}
            >
              <i className="fas fa-search-plus"></i>
            </button>
            <button 
              onClick={handleResetZoom}
              className="btn px-2 h-8 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t('resetZoom')}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الخط:</label>
            <select 
              value={reportFontFamily}
              onChange={(e) => setReportFontFamily(e.target.value)}
              className="p-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value="">الافتراضي</option>
              {currentFonts.map(font => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">حجم الخط:</label>
            <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
              <button 
                onClick={() => setReportFontSize(prev => Math.max(prev - 1, 8))}
                className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[2rem] text-center">{reportFontSize}</span>
              <button 
                onClick={() => setReportFontSize(prev => Math.min(prev + 1, 36))}
                className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">حجم الشعار:</label>
            <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
              <button 
                onClick={() => setLogoScale(prev => Math.max(prev - 0.05, 0.5))}
                className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[3rem] text-center">{Math.round(logoScale * 100)}%</span>
              <button 
                onClick={() => setLogoScale(prev => Math.min(prev + 0.05, 3.0))}
                className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">هامش علوي:</label>
                <input 
                    type="range" min="0" max="5" step="0.1" value={marginTop} 
                    onChange={(e) => setMarginTop(parseFloat(e.target.value))}
                    className="w-20"
                />
                <span className="text-xs min-w-[2rem]">{marginTop}cm</span>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">هامش سفلي:</label>
                <input 
                    type="range" min="0" max="5" step="0.1" value={marginBottom} 
                    onChange={(e) => setMarginBottom(parseFloat(e.target.value))}
                    className="w-20"
                />
                <span className="text-xs min-w-[2rem]">{marginBottom}cm</span>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">هامش جانبي:</label>
                <input 
                    type="range" min="0" max="5" step="0.1" value={marginSide} 
                    onChange={(e) => setMarginSide(parseFloat(e.target.value))}
                    className="w-20"
                />
                <span className="text-xs min-w-[2rem]">{marginSide}cm</span>
            </div>
          </div>
        </div>

       <div
        id="report-modal-content-for-export"
        className="max-h-[65vh] overflow-auto p-4 rounded-lg bg-gray-50 flex flex-col items-center"
        dir={reportLanguage === 'ar' ? 'rtl' : 'ltr'}
        style={{
            fontFamily: fontFamily,
            fontSize: `${reportFontSize}pt`,
            textAlign: reportLanguage === 'ar' ? 'right' : 'left',
            color: 'black'
        }}
       >
          <div 
            className="report-preview-container-forced-style w-full transition-all duration-300 origin-top"
            style={{ 
              zoom: zoomLevel,
              width: '100%',
              cursor: 'default'
            }}
            dangerouslySetInnerHTML={{ __html: reportBodyHtml }} 
          />
      </div>
      
      <div className="flex justify-end pt-4 mt-4 border-t border-[rgb(var(--color-border))] print-hidden space-x-2 rtl:space-x-reverse">
        <button onClick={onClose} title={t('close')} className="btn p-0 h-10 w-10 justify-center bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))]">
            <i className="fas fa-times"></i>
        </button>
        {/* Sur mobile, le bouton partage fait la même chose que l'export PDF, on peut le garder ou l'enlever */}
        <button onClick={handleShare} title={t('share')} className="btn p-0 h-10 w-10 justify-center bg-teal-600 text-white hover:bg-teal-700">
            <i className="fas fa-share-alt"></i>
        </button>
        <button onClick={handleExportWord} title={t('exportWord')} className="btn p-0 h-10 w-10 justify-center bg-blue-600 text-white hover:bg-blue-700">
            <i className="fas fa-file-word"></i>
        </button>
        <button onClick={handleExportPdf} title={t('exportPdf')} className="btn p-0 h-10 w-10 justify-center bg-red-600 text-white hover:bg-red-700">
            <i className="fas fa-file-pdf"></i>
        </button>
        <button onClick={handlePrint} title={t('print')} className="btn p-0 h-10 w-10 justify-center bg-sky-700 text-white hover:bg-sky-800">
            <i className="fas fa-print"></i>
        </button>
      </div>
    </Modal>
  );
};
