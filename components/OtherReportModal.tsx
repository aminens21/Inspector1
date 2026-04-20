
import React, { useMemo } from 'react';
import { Modal } from './ui/Modal';
import { OtherReport, Inspector, Teacher, Memo } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { exportFile } from '../services/fileExport';
import { convertHtmlToDocx } from '../services/htmlToDocx';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    XLSX: any;
    docx: any;
  }
}

const escapeHtml = (unsafe: any): string => {
    const str = String(unsafe || '');
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

interface OtherReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: OtherReport | null;
  inspector: Inspector;
  ministryLogo: string;
  ministryLogoHeight?: number;
  ministryLogoFr?: string;
  ministryLogoHeightFr?: number;
  teachers?: Teacher[];
  memos: Memo[];
}

export const OtherReportModal: React.FC<OtherReportModalProps> = ({ 
  isOpen, onClose, report, inspector, ministryLogo, ministryLogoHeight = 120,
  ministryLogoFr, ministryLogoHeightFr,
  teachers = [], memos = [] 
}) => {
  const { t, language, dir } = useTranslations();

  const [zoomLevel, setZoomLevel] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem('otherReportModalZoomLevel');
      if (savedZoom) {
        return parseFloat(savedZoom);
      }
      return window.innerWidth < 768 ? 0.35 : 0.30;
    }
    return 0.30;
  });

  const [reportFontSize, setReportFontSize] = React.useState<number>(16);
  const [reportFontFamily, setReportFontFamily] = React.useState<string>("");
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
      localStorage.setItem('otherReportModalZoomLevel', zoomLevel.toString());
    }
  }, [zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.05, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.05, 0.1));
  };

  const handleResetZoom = () => {
    setZoomLevel(window.innerWidth < 768 ? 0.35 : 0.30);
    setReportFontSize(16);
    setReportFontFamily("");
    setLogoScale(1.26);
    setMarginTop(1.5);
    setMarginBottom(1.5);
    setMarginSide(1.5);
  };

  const linkedMemo = useMemo(() => {
    if (!report) return null;
    const typeToMatch = report.activityType === 'أنشطة أخرى' && report.activityCategory ? report.activityCategory : report.activityType;
    if (!typeToMatch) return null;
    return memos.find(m => m.activityType === typeToMatch);
  }, [report, memos]);

  if (!isOpen || !report) {
    return null;
  }

  // Helper to split array into chunks of 20
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const getReportHtml = () => {
    const d = new Date(report.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const reportDate = language === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
    const direction = dir;
    const defaultFontFamily = "'Sakkal Majalla', 'SakkalMajalla', 'Cairo', Arial, sans-serif";
    const fontFamily = reportFontFamily || defaultFontFamily;

    // Logic to handle single vs multiple references
    const validRefs = report.references ? [...report.references] : [];
    if (linkedMemo) {
        validRefs.push(linkedMemo.content);
    }
    const filteredRefs = validRefs.filter(r => r && r.trim() !== '');
    let referencesHtml = '';

    if (filteredRefs.length > 0) {
        // Use a table layout for references to ensure dashes align perfectly
        // "المرجع:" in one cell, list of references in the next
        const refsRows = filteredRefs.map(ref => `<div style="margin-bottom: 2px;">- ${escapeHtml(ref)}</div>`).join('');
        
        referencesHtml = `
            <table style="border: none; border-collapse: collapse; margin: 0; padding: 0; width: auto;">
                <tr>
                    <td style="vertical-align: top; white-space: nowrap; padding-left: 8px; border: none; font-size: ${reportFontSize}pt;">
                        <strong>${t('report_reference_field')}</strong>
                    </td>
                    <td style="vertical-align: top; border: none; font-size: ${reportFontSize}pt;">
                        ${refsRows}
                    </td>
                </tr>
            </table>
        `;
    }

    const currentLogo = (language === 'fr' && ministryLogoFr) ? ministryLogoFr : ministryLogo;
    const currentLogoHeight = (language === 'fr' && ministryLogoHeightFr) ? ministryLogoHeightFr : ministryLogoHeight;

    const currentInspectorName = (language === 'fr' && inspector.fullNameFr) ? inspector.fullNameFr : inspector.fullName;
    const currentFramework = (language === 'fr') ? (t(inspector.framework) || inspector.framework) : inspector.framework;
    const currentSubject = (language === 'fr') ? (t(inspector.subject) || inspector.subject) : inspector.subject;
    const currentAcademy = (language === 'fr') ? (t(inspector.regionalAcademy) || inspector.regionalAcademy) : inspector.regionalAcademy;
    const currentDirectorate = (language === 'fr') ? (t(inspector.regionalDirectorate) || inspector.regionalDirectorate) : inspector.regionalDirectorate;
    const currentRegionalDirectorTitle = t(inspector.regionalDirectorTitle || 'المدير الإقليمي');

    // Standard Ministry Header
    // Logo centered
    const headerHtml = `
      <div style="text-align: center; margin-bottom: 0.5rem; width: 100%;">
        <img src="${currentLogo}" alt="${t('ministryLogoAlt')}" style="height: ${currentLogoHeight * logoScale}px; max-width: 100%; object-fit: contain; margin: 0 auto;" />
      </div>
    `;

    // Reduced margin for document number
    const documentNumberHtml = report.documentNumber 
        ? `<div style="text-align: right; font-weight: bold; margin-bottom: 0.25rem;">
             ${t('otherReports_documentNumber')} ${escapeHtml(report.documentNumber)}
           </div>`
        : '';

    // --- LOGIC FOR TEACHERS TABLES ---
    let teachersSectionsHtml = '';
    
    // Only generate table if includeTeachersList is explicitly true or undefined (default true)
    if (report.includeTeachersList !== false) {
        const isValidationReport = report.templateId === 'timetable_validation';
        const isCycleValidation = report.templateId === 'cycle_validation';
        const isAnyValidation = isValidationReport || isCycleValidation;

        const invitedList = (report.invitedTeacherIds || []).map(id => teachers.find(t => String(t.id) === String(id))).filter(Boolean) as Teacher[];

        // Sort by Institution globally first
        invitedList.sort((a, b) => {
            const instCompare = (a.institution || '').localeCompare(b.institution || '', 'ar');
            if (instCompare !== 0) return instCompare;
            return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
        });

        if (isAnyValidation) {
            const approvedTeachers = invitedList.filter(t => report.invitedTeacherStatuses?.[String(t.id)]?.status === 'approved');
            const rejectedTeachers = invitedList.filter(t => report.invitedTeacherStatuses?.[String(t.id)]?.status === 'rejected');
            
            // Force 'institutions' mode for Cycle Validation regardless of user selection
            const displayMode = isCycleValidation ? 'institutions' : (report.validationDisplayMode || 'teachers');

            const renderValidationTable = (list: Teacher[], title: string, showReason: boolean) => {
                if (list.length === 0) return '';

                if (displayMode === 'institutions') {
                    const uniqueInstitutions = [...new Set(list.map(t => (language === 'fr' && t.institutionFr) ? t.institutionFr : t.institution).filter(Boolean))].sort((a, b) => a.localeCompare(b, language === 'fr' ? 'fr' : 'ar'));
                    const chunks = chunkArray(uniqueInstitutions, 30);
                    
                    return chunks.map((chunk, chunkIdx) => `
                        <div class="attendance-page-block" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; page-break-before: always; min-height: 1000px; position: relative;">
                            ${headerHtml}
                            <div style="text-align: center; margin-bottom: 1.5rem; margin-top: 1rem;">
                                <h3 style="text-decoration: underline; font-size: ${reportFontSize}pt; margin: 0;">${title}</h3>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: ${reportFontSize - 2}pt;">
                                <thead>
                                    <tr>
                                        <th style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2; width: 10%;">ر.ت</th>
                                        <th style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2; text-align: right;">${t('teacher_institution')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${chunk.map((inst, idx) => `
                                        <tr>
                                            <td style="border: 1px solid #000; padding: 10px; text-align: center;">${(chunkIdx * 30) + idx + 1}</td>
                                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">${escapeHtml(inst)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${(showReason && report.generalRejectionReason) ? `
                                <div style="margin-top: 2rem; border: 1px solid #000; padding: 10px; text-align: justify; font-size: ${reportFontSize - 2}pt;">
                                    <strong>السبب والملاحظات: </strong>
                                    <span>${escapeHtml(report.generalRejectionReason).replace(/\n/g, '<br />')}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                } else {
                    const chunks = chunkArray(list, 20);
                    return chunks.map((chunk, chunkIdx) => `
                        <div class="attendance-page-block" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; page-break-before: always; min-height: 1000px; position: relative;">
                            ${headerHtml}
                            <div style="text-align: center; margin-bottom: 1.5rem; margin-top: 1rem;">
                                <h3 style="text-decoration: underline; font-size: ${reportFontSize}pt; margin: 0;">${title}</h3>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: ${reportFontSize - 2}pt;">
                                <thead>
                                    <tr>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%;">ر.ت</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_fullName')}</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%; white-space: nowrap;">${t('teacher_employeeId')}</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_institution')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${chunk.map((teacher, idx) => {
                                        const teacherInst = (language === 'fr' && teacher.institutionFr) ? teacher.institutionFr : teacher.institution;
                                        const teacherName = (language === 'fr' && teacher.fullNameFr) ? teacher.fullNameFr : teacher.fullName;
                                        return `
                                        <tr>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${(chunkIdx * 20) + idx + 1}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: ${language === 'fr' ? 'left' : 'right'};">${escapeHtml(teacherName)}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${escapeHtml(teacher.employeeId)}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: ${language === 'fr' ? 'left' : 'right'};">${escapeHtml(teacherInst)}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                            ${(showReason && report.generalRejectionReason) ? `
                                <div style="margin-top: 2rem; border: 1px solid #000; padding: 10px; text-align: justify; font-size: ${reportFontSize - 2}pt;">
                                    <strong>السبب والملاحظات: </strong>
                                    <span>${escapeHtml(report.generalRejectionReason).replace(/\n/g, '<br />')}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                }
            };

            const approvedTitle = isCycleValidation ? "التوازيع الحلقية التي تمت المصادقة عليها" : "جداول الحصص التي تمت المصادقة عليها";
            const rejectedTitle = isCycleValidation ? "التوازيع الحلقية التي لم يصادق عليها" : "جداول الحصص التي لم يصادق عليها";

            teachersSectionsHtml = renderValidationTable(approvedTeachers, approvedTitle, false);
            teachersSectionsHtml += renderValidationTable(rejectedTeachers, rejectedTitle, true);

        } else if (invitedList.length > 0) {
            const chunks = chunkArray(invitedList, 20);
            teachersSectionsHtml = chunks.map((chunk, chunkIdx) => `
                <div class="attendance-page-block" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; page-break-before: always; min-height: 1000px; position: relative;">
                    ${headerHtml}
                    <div style="text-align: center; margin-bottom: 1.5rem; margin-top: 1rem;">
                        <h3 style="text-decoration: underline; font-size: ${reportFontSize}pt; margin: 0;">${t('otherReports_invitedListTitle')}</h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: ${reportFontSize - 2}pt;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%;">ر.ت</th>
                                <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_fullName')}</th>
                                <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%; white-space: nowrap;">${t('teacher_employeeId')}</th>
                                <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_institution')}</th>
                                <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 15%;">توقيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${chunk.map((teacher, idx) => `
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${(chunkIdx * 20) + idx + 1}</td>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${escapeHtml(teacher.fullName)}</td>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${escapeHtml(teacher.employeeId)}</td>
                                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">${escapeHtml(teacher.institution)}</td>
                                    <td style="border: 1px solid #000; padding: 8px; height: 35px;"></td> 
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('');
        }
    }

    const regionalDirectorTitle = t(inspector.regionalDirectorTitle || 'المدير الإقليمي');

    const mainReportContentHtml = `
        <div id="main-report-content" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; min-height: 1000px; position: relative;">
            <div style="position: absolute; top: 20px; left: 20px; font-weight: bold; font-size: ${reportFontSize}pt;">${reportDate}</div>
            <div style="margin-bottom: 1.5cm;">
                ${headerHtml}
            </div>
            <table style="width: 100%; margin-bottom: 2rem; border-collapse: collapse; font-size: ${reportFontSize}pt;">
                <tbody>
                    <tr>
                        <td style="width: 55%; vertical-align: top; text-align: right; padding: 0 5px;">
                            <p style="margin: 0;">${t('report_from')} <strong>${escapeHtml(inspector.fullName)}</strong></p>
                            <p style="margin: 0;">${t('report_framework_label')} ${escapeHtml(inspector.framework)}</p>
                            <p style="margin: 0;">${t('report_subject_label')} ${escapeHtml(inspector.subject)}</p>
                        </td>
                        <td style="width: 45%; vertical-align: top; text-align: right; padding: 0 5px;">
                            <p style="margin: 0;">${language === 'fr' ? 'À Monsieur ' : 'إلى السيد '}${escapeHtml(currentRegionalDirectorTitle)} لوزارة التربية الوطنية والتعليم الأولي والرياضة</p>
                            <p style="margin: 0;"><strong>${escapeHtml(report.concernedDepartment)}</strong></p>
                        </td>
                    </tr>
                </tbody>
            </table>
            <!-- Subject and Reference Section with reduced margin -->
            <div style="text-align: right; padding: 0 5px; margin-bottom: 10px; font-size: ${reportFontSize}pt;">
                ${documentNumberHtml}
                <p style="margin: 0; line-height: 1.4;"><strong>${t('report_subject_field')}</strong> ${escapeHtml(report.subject)}</p>
                ${referencesHtml}
            </div>
            <!-- Main Content -->
            <div style="text-align: justify; white-space: pre-wrap; line-height: 1.8; text-indent: 2.5em; padding: 0 5px; min-height: 150px; font-size: ${reportFontSize}pt;">
                ${escapeHtml(report.content).replace(/\n/g, '<br />')}
            </div>
            <div style="margin-top: 1.5cm; page-break-inside: avoid; font-size: ${reportFontSize}pt;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; text-align: ${language === 'fr' ? 'left' : 'right'}; vertical-align: top;">
                            <p style="font-weight: bold; text-decoration: underline; margin-bottom: 5rem;">${language === 'fr' ? 'Signature de l\'Inspecteur:' : 'توقيع المفتش:'}</p>
                        </td>
                        <td style="width: 50%; text-align: ${language === 'fr' ? 'right' : 'left'}; vertical-align: top;">
                            <p style="font-weight: bold; text-decoration: underline; margin-bottom: 5rem;">${language === 'fr' ? 'Signature du ' : 'توقيع السيد '}${escapeHtml(currentRegionalDirectorTitle)}:</p>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    return `
      <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <style>
          @font-face {
            font-family: 'Sakkal Majalla';
            src: local('Sakkal Majalla'), local('SakkalMajalla'), url('https://db.onlinewebfonts.com/t/056353a27c68233bc7a545e1459b2528.woff2') format('woff2');
          }
          body { 
            font-family: ${fontFamily};
            font-size: ${reportFontSize}pt;
            margin: ${marginTop}cm ${marginSide}cm ${marginBottom}cm;
            padding: 0; 
            background: white; 
            color: black;
          }
          .attendance-page-block { page-break-before: always; }
          table { font-size: 14pt; }
          
          @media print {
            @page {
              size: A4 portrait;
              margin: ${marginTop}cm ${marginSide}cm ${marginBottom}cm;
            }
            body { 
              margin: 0; 
              padding: 0; 
              width: 100%;
            }
            #full-export-wrapper { 
              width: 100% !important; 
              max-width: 100% !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            #main-report-content, .attendance-page-block {
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div id="full-export-wrapper" style="width: 100%; max-width: 100%; margin: 0 auto; background: white;">
            ${mainReportContentHtml}
            ${teachersSectionsHtml}
        </div>
      </body>
      </html>`;
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
      alert(t('errorExportLibrary'));
      return null;
    }

    const { jsPDF } = window.jspdf;
    const fullHtml = getReportHtml();
    
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
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const marginX = 10;
        const marginY = 10; // Top margin 1cm (10mm)
        const bottomGap = 10; 
        const imgWidth = pdfWidth - (marginX * 2);

        const mainEl = container.querySelector('#main-report-content') as HTMLElement;
        if (mainEl) {
            const canvasMain = await window.html2canvas(mainEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const imgMain = canvasMain.toDataURL('image/jpeg', 0.95);
            
            // Safety check for canvas dimensions
            const canvasWidth = canvasMain.width || 1;
            const canvasHeight = canvasMain.height || 1;
            const ratio = canvasWidth / canvasHeight;
            
            let drawWidth = imgWidth;
            let drawHeight = drawWidth / ratio;
            const availableHeight = pdfHeight - marginY - bottomGap;
            
            if (drawHeight > availableHeight) {
                drawHeight = availableHeight;
                drawWidth = drawHeight * ratio;
            }
            
            const xOffset = marginX + (imgWidth - drawWidth) / 2;
            pdf.addImage(imgMain, 'JPEG', xOffset, marginY, drawWidth, drawHeight);
        }

        const tablePages = container.querySelectorAll('.attendance-page-block');
        for (let i = 0; i < tablePages.length; i++) {
            pdf.addPage();
            const pageEl = tablePages[i] as HTMLElement;
            const canvasPage = await window.html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const imgPage = canvasPage.toDataURL('image/jpeg', 0.95);
            
            // Safety check for canvas dimensions
            const canvasWidth = canvasPage.width || 1;
            const canvasHeight = canvasPage.height || 1;
            const ratio = canvasWidth / canvasHeight;
            
            let drawWidth = imgWidth;
            let drawHeight = drawWidth / ratio;
            const availableHeight = pdfHeight - marginY - bottomGap;
            
            if (drawHeight > availableHeight) {
                drawHeight = availableHeight;
                drawWidth = drawHeight * ratio;
            }
            
            const xOffset = marginX + (imgWidth - drawWidth) / 2;
            pdf.addImage(imgPage, 'JPEG', xOffset, marginY, drawWidth, drawHeight);
        }
        
        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
  };

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
    if (!report) return;
    const fullHtml = getReportHtml();
    const bodyContent = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
    // For Word export, we ensure font stack is compatible
    const defaultFontFamily = "'Sakkal Majalla', 'SakkalMajalla', 'Cairo', Arial, sans-serif";
    const fontFamily = reportFontFamily || defaultFontFamily;
    const lang = dir === 'rtl' ? 'ar' : 'fr';

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="${lang}">
        <head>
            <meta charset='utf-8'>
            <title>${report.subject || t('report')}</title>
            <style>
                body { 
                    font-family: ${fontFamily}; 
                    direction: ${dir}; 
                    text-align: ${dir === 'rtl' ? 'right' : 'left'}; 
                    font-size: ${reportFontSize}pt; 
                }
                /* Use 100% width for Word landscape to fill the page */
                #full-export-wrapper { width: 100% !important; margin: 0 !important; }
                table { border-collapse: collapse; width: 100%; font-size: 14pt; }
                th, td { border: 1px solid black; padding: 5px; }
                .attendance-page-block { page-break-before: always; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `;
    
    try {
        const docxBlob = await convertHtmlToDocx(htmlContent, {
            orientation: 'landscape',
            margins: { top: 425, right: 1440, bottom: 708, left: 1440 }
        });
        await exportFile(docxBlob, `${report.subject || t('report')}.doc`);
    } catch (error) {
        console.error('Error generating DOCX:', error);
        alert('حدث خطأ أثناء إنشاء ملف Word.');
    }
  };
  
  const handleExportPdf = async () => {
    const pdfBlob = await generatePdfBlob();
    if (pdfBlob) {
        await exportFile(pdfBlob, `${report.subject || t('report')}.pdf`);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    try {
        const pdfBlob = await generatePdfBlob();
        if (!pdfBlob) return;
        await exportFile(pdfBlob, `${report.subject || t('report')}.pdf`);
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

  const fullHtml = getReportHtml();
  const reportBodyHtml = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;

  const ARABIC_FONTS = [
    { label: 'Sakkal Majalla', value: "'Sakkal Majalla', 'SakkalMajalla', 'Cairo', Arial, sans-serif" },
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

  const currentFonts = language === 'ar' ? ARABIC_FONTS : FRENCH_FONTS;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('otherReportModal_title')} size="5xl">
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

      <div className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded-lg border border-[rgb(var(--color-border))] overflow-hidden">
          <div className="max-h-[65vh] overflow-auto custom-scrollbar flex flex-col items-center">
              <div
                id="other-report-modal-content-for-export"
                className="report-preview-container-forced-style bg-white text-black p-8 shadow-sm mx-auto transition-all duration-300 origin-top"
                dir={dir}
                style={{ 
                    zoom: zoomLevel, 
                    width: '100%',
                    cursor: 'default',
                    fontSize: `${reportFontSize}pt`,
                    fontFamily: reportFontFamily || (language === 'ar' ? "'Sakkal Majalla', serif" : "'Times New Roman', serif")
                }}
                dangerouslySetInnerHTML={{ __html: reportBodyHtml }}
              >
              </div>
          </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t border-[rgb(var(--color-border))] print-hidden space-x-2 rtl:space-x-reverse">
        <button onClick={onClose} title={t('close')} className="btn p-0 h-10 w-10 justify-center bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] hover:bg-[rgb(var(--color-button-secondary-hover-bg))]">
            <i className="fas fa-times"></i>
        </button>
        {typeof navigator !== 'undefined' && !!navigator.share && (
            <button onClick={handleShare} title={t('share')} className="btn p-0 h-10 w-10 justify-center bg-teal-600 text-white hover:bg-teal-700">
                <i className="fas fa-share-alt"></i>
            </button>
        )}
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
