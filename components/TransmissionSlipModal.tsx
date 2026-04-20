
import React from 'react';
import { Modal } from './ui/Modal';
import { TransmissionSlip, Inspector, SavedReport, Teacher, ReportType, TransmissionSlipItem } from '../types';
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

const dataUrlToBuffer = async (dataUrl: string): Promise<ArrayBuffer> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return await blob.arrayBuffer();
};

const escapeHtml = (unsafe: any): string => {
    const str = String(unsafe || '');
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

interface TransmissionSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: TransmissionSlip | null;
  inspector: Inspector;
  ministryLogo: string;
  ministryLogoHeight?: number;
  ministryLogoFr?: string;
  ministryLogoHeightFr?: number;
  reports: SavedReport[];
  teachers: Teacher[];
}

export const TransmissionSlipModal: React.FC<TransmissionSlipModalProps> = ({ 
  isOpen, onClose, slip, inspector, ministryLogo, ministryLogoHeight = 120,
  ministryLogoFr, ministryLogoHeightFr,
  reports, teachers 
}) => {
  const { t, language, dir } = useTranslations();

  const [zoomLevel, setZoomLevel] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem('transmissionSlipModalZoomLevel');
      if (savedZoom) {
        return parseFloat(savedZoom);
      }
      return window.innerWidth < 768 ? 0.35 : 0.30;
    }
    return 0.30;
  });

  const [reportFontSize, setReportFontSize] = React.useState<number>(9);
  const [reportFontFamily, setReportFontFamily] = React.useState<string>("");
  const [logoScale, setLogoScale] = React.useState<number>(0.8);
  const [marginTop, setMarginTop] = React.useState<number>(1.5);
  const [marginBottom, setMarginBottom] = React.useState<number>(1.5);
  const [marginSide, setMarginSide] = React.useState<number>(1.5);

  React.useEffect(() => {
    if (slip) {
      if (slip.reportFontSize) setReportFontSize(slip.reportFontSize);
      if (slip.reportFontFamily) setReportFontFamily(slip.reportFontFamily);
      if (slip.reportLogoScale) setLogoScale(slip.reportLogoScale / 100);
      if (slip.reportMarginTop !== undefined) setMarginTop(slip.reportMarginTop);
      if (slip.reportMarginBottom !== undefined) setMarginBottom(slip.reportMarginBottom);
      if (slip.reportMarginSide !== undefined) setMarginSide(slip.reportMarginSide);
    }
  }, [slip]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('transmissionSlipModalZoomLevel', zoomLevel.toString());
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
    setReportFontSize(9);
    setReportFontFamily("");
    setLogoScale(1.0);
    setMarginTop(1.5);
    setMarginBottom(1.5);
    setMarginSide(1.5);
  };

  if (!isOpen || !slip) {
    return null;
  }

  const getEnhancedSubject = (item: TransmissionSlipItem): string => {
    if (item.reportType === 'other' || item.reportType === 'activity_summary') {
        return item.reportSubject;
    }
    
    const report = reports.find(r => String(r.id) === String(item.reportId));
    if (!report) {
        return item.reportSubject;
    }

    const teacher = teachers.find(t => String(t.id) === String(report.teacherId));
    const typeLabel = report.reportType === ReportType.VISIT ? t('visit') : t('inspection');
    const teacherName = (language === 'fr' && teacher?.fullNameFr) ? teacher.fullNameFr : (report.teacherName || teacher?.fullName || '');
    const teacherTitle = teacher?.genre === 'female' ? t('teacher_female') : t('teacher_male');
    const employeeIdInfo = teacher ? ` (${t('teacher_employeeId')}: ${teacher.employeeId})` : '';

    return `${typeLabel} - ${teacherTitle} ${teacherName}${employeeIdInfo}`;
  };


  const getSlipHtml = (options?: { withBorder?: boolean }) => {
    const withBorder = options?.withBorder ?? true;
    const d = new Date(slip.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const slipDate = language === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
    const direction = dir;
    const defaultFontFamily = language === 'ar' ? "'Cairo', serif" : "'Times New Roman', Times, serif";
    const fontFamily = reportFontFamily || defaultFontFamily;

    const processedItems: (TransmissionSlipItem & { rowSpan: number; index: number })[] = [];
    for (let i = 0; i < slip.items.length; i++) {
        const item = slip.items[i];
        let rowSpan = 1;
        
        // Check if this note was already handled by a previous rowSpan
        const isAlreadyMerged = i > 0 && slip.items[i-1].notes === item.notes && item.notes !== '';
        
        if (!isAlreadyMerged) {
            // Count how many subsequent items have the same note
            for (let j = i + 1; j < slip.items.length; j++) {
                if (slip.items[j].notes === item.notes && item.notes !== '') {
                    rowSpan++;
                } else {
                    break;
                }
            }
            processedItems.push({ ...item, rowSpan, index: i + 1 });
        } else {
            processedItems.push({ ...item, rowSpan: 0, index: i + 1 });
        }
    }

    const itemsHtml = processedItems.map((item) => `
        <tr style="min-height: 35px;">
            <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-size: ${reportFontSize}pt; vertical-align: middle; line-height: 1.2;">${item.index}</td>
            <td style="border: 1px solid #000; padding: 8px 4px; font-size: ${reportFontSize}pt; text-align: center; vertical-align: middle; line-height: 1.2;">${escapeHtml(getEnhancedSubject(item))}</td>
            <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-size: ${reportFontSize}pt; vertical-align: middle; line-height: 1.2;">${escapeHtml(String(item.copyCount))}</td>
            ${item.rowSpan > 0 ? `
                <td rowspan="${item.rowSpan}" style="border: 1px solid #000; padding: 8px 4px; font-size: ${reportFontSize}pt; text-align: center; vertical-align: middle; line-height: 1.2;">
                    ${escapeHtml(item.notes)}
                </td>
            ` : ''}
        </tr>
    `).join('');

    const currentInspectorName = (language === 'fr' && inspector.fullNameFr) ? inspector.fullNameFr : inspector.fullName;
    const currentFramework = (language === 'fr') ? (t(inspector.framework) || inspector.framework) : inspector.framework;
    const currentSubject = (language === 'fr') ? (t(inspector.subject) || inspector.subject) : inspector.subject;
    const currentRegionalDirectorTitle = (language === 'fr') ? (t(inspector.regionalDirectorTitle || '') || (inspector.regionalDirectorTitle ? inspector.regionalDirectorTitle : 'Directeur Provincial')) : (inspector.regionalDirectorTitle || 'المدير الإقليمي');

    const currentLogo = (language === 'fr' && ministryLogoFr) ? ministryLogoFr : ministryLogo;
    const currentLogoHeight = (language === 'fr' && ministryLogoHeightFr) ? ministryLogoHeightFr : ministryLogoHeight;

    const slipContent = `
        <div style="text-align: left; margin-bottom: 0.5rem; font-size: ${reportFontSize * 1.1}pt;">${slipDate}</div>
      
        <div style="text-align: center; margin-bottom: 0.5rem;">
            <img src="${currentLogo}" alt="${t('ministryLogoAlt')}" style="height: ${currentLogoHeight * logoScale}px; margin: 0 auto;" />
        </div>

        <div style="text-align: center; margin-bottom: 0.5rem; font-size: ${reportFontSize}pt;">
            <p style="margin: 0; font-size: ${reportFontSize}pt;">${t('report_from')} ${escapeHtml(currentInspectorName)}</p>
            <p style="margin: 0; font-size: ${reportFontSize}pt;">${t('report_framework_label')} ${escapeHtml(currentFramework)}</p>
            <p style="margin: 0; font-size: ${reportFontSize}pt;">${t('report_subject_label')} ${escapeHtml(currentSubject)}</p>
            <br/>
            <p style="margin: 0; font-size: ${reportFontSize}pt;">${language === 'fr' ? 'À Monsieur' : 'إلى السيد'} ${escapeHtml(currentRegionalDirectorTitle)} ${language === 'fr' ? 'du Ministère de l\'Éducation Nationale, du Préscolaire et des Sports' : 'لوزارة التربية الوطنية والتعليم الأولي والرياضة'}</p>
            <p style="margin: 0; font-size: ${reportFontSize}pt;"><strong>${escapeHtml(slip.concernedDepartment)}</strong></p>
        </div>
        
        <div style="text-align: right; margin-bottom: 0.5rem; font-weight: bold; font-size: ${reportFontSize * 1.1}pt;">
            ${t('transmissionSlip_pageTitle')} رقم: ${escapeHtml(slip.slipNumber)}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: ${reportFontSize}pt;">
            <thead>
                <tr>
                    <th style="border: 1px solid #000; padding: 8px 4px; background-color: #e0e0e0; width: 5%; text-align: center; vertical-align: middle; line-height: 1.2; font-size: ${reportFontSize}pt;">${t('slip_item_seq')}</th>
                    <th style="border: 1px solid #000; padding: 8px 4px; background-color: #e0e0e0; width: 50%; text-align: center; vertical-align: middle; line-height: 1.2; font-size: ${reportFontSize}pt;">${t('slip_item_subject')}</th>
                    <th style="border: 1px solid #000; padding: 8px 4px; background-color: #e0e0e0; width: 10%; text-align: center; vertical-align: middle; line-height: 1.2; font-size: ${reportFontSize}pt;">${t('slip_item_copies')}</th>
                    <th style="border: 1px solid #000; padding: 8px 4px; background-color: #e0e0e0; width: 35%; text-align: center; vertical-align: middle; line-height: 1.2; font-size: ${reportFontSize}pt;">${t('slip_item_notes')}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div style="text-align: left; padding-left: 10px; margin-top: 1rem; font-size: ${reportFontSize}pt;">
            <p>${t('report_signature_line')}</p>
        </div>
    `;

    const borderStyle = withBorder ? 'border: 1px solid #ccc;' : '';
    
    // Use a Table layout instead of Flexbox for better Word compatibility
    const bodyHtml = `
      <table style="width: 100%; border-collapse: collapse; border: none;">
        <tr>
            <td style="width: 49%; vertical-align: top; ${borderStyle} padding: 10px;">
                ${slipContent}
            </td>
            <td style="width: 2%; border: none;"></td>
            <td style="width: 49%; vertical-align: top; ${borderStyle} padding: 10px;">
                ${slipContent}
            </td>
        </tr>
      </table>
    `;

    return `
      <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: ${fontFamily}, Arial, sans-serif;
            line-height: 1.3;
            font-size: ${reportFontSize}pt;
            direction: ${direction};
            color: black;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: ${marginTop}cm ${marginSide}cm ${marginBottom}cm;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const fullHtml = getSlipHtml({ withBorder: false });
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
    if (!slip) return;

    const fullHtml = getSlipHtml({ withBorder: true });
    const bodyContent = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
    const defaultFontFamily = language === 'ar' ? "'Cairo', serif" : "'Times New Roman', Times, serif";
    const fontFamily = reportFontFamily || defaultFontFamily;

    // XML Namespaces and specific CSS are crucial for Word to recognize Landscape
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
            <meta charset='utf-8'>
            <title>${t('transmissionSlip_pageTitle')}</title>
            <style>
                body { 
                    font-family: ${fontFamily}, Arial, sans-serif; 
                    line-height: 1.3; 
                    font-size: ${reportFontSize}pt; 
                    direction: ${dir}; 
                    text-align: ${dir === 'rtl' ? 'right' : 'left'};
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
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
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        });
        await exportFile(docxBlob, `${t('transmissionSlip_pageTitle')} - ${slip.slipNumber}.doc`);
    } catch (error) {
        console.error('Error generating DOCX:', error);
        alert('حدث خطأ أثناء إنشاء ملف Word.');
    }
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
      alert(t('errorExportLibrary'));
      return null;
    }

    const { jsPDF } = window.jspdf;
    const fullHtml = getSlipHtml({ withBorder: false });
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.width = '1123px'; // A4 landscape width roughly
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
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const margin = 10;
        const imgWidth = pdfWidth - (margin * 2);
        
        // Safety check for canvas dimensions
        const canvasWidth = canvas.width || 1;
        const canvasHeight = canvas.height || 1;
        const imgHeight = canvasHeight * imgWidth / canvasWidth;
        
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - (margin * 2));

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - (margin * 2));
        }
        
        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
  };

  const handleExportPdf = async () => {
    const pdfBlob = await generatePdfBlob();
    if (pdfBlob) {
        await exportFile(pdfBlob, `${t('transmissionSlip_pageTitle')} - ${slip.slipNumber}.pdf`);
    }
  };
  
  const handleShare = async () => {
    if (!slip) return;
    try {
        const pdfBlob = await generatePdfBlob();
        if (!pdfBlob) return;
        const fileName = `${t('transmissionSlip_pageTitle')} - ${slip.slipNumber}.pdf`;
        await exportFile(pdfBlob, fileName);
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };

  const fullHtml = getSlipHtml({ withBorder: false });
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('transmissionSlipModal_title')} size="5xl">
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
                onClick={() => setReportFontSize(prev => Math.max(prev - 1, 6))}
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
        id="slip-modal-content-for-export"
        className="report-preview-container-forced-style max-h-[65vh] overflow-y-auto p-4 rounded-lg bg-white"
        dir={dir}
        style={{ 
            zoom: zoomLevel,
            fontSize: `${reportFontSize}pt`,
            fontFamily: reportFontFamily || (language === 'ar' ? "'Cairo', sans-serif" : "'Times New Roman', serif"),
            color: 'black'
        }}
        dangerouslySetInnerHTML={{ __html: reportBodyHtml }}
      >
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
