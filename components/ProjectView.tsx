import React, { useState, useEffect } from 'react';
import { ProjectData, ProjectAxis, ProjectAxisActivity } from '../types/project';
import { INITIAL_PROJECT_DATA } from '../constants/projectData';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { convertHtmlToDocx } from '../services/htmlToDocx';
import { exportFile } from '../services/fileExport';

interface ProjectViewProps {
  ministryLogo: string;
  ministryLogoHeight?: number;
}

export default function ProjectView({ ministryLogo, ministryLogoHeight = 120 }: ProjectViewProps) {
  const { t } = useTranslations();
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_PROJECT_DATA);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('projectData');
    if (savedData) {
      try {
        setProjectData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse project data', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('projectData', JSON.stringify(projectData));
    setIsEditing(false);
    setIsPreviewModalOpen(true);
  };

  const handleHeaderChange = (field: keyof ProjectData, value: string) => {
    setProjectData({ ...projectData, [field]: value });
  };

  const handleActivityChange = (axisId: string, activityId: string, field: keyof ProjectAxisActivity, value: string) => {
    setProjectData(prev => ({
      ...prev,
      axes: prev.axes.map(axis => 
        axis.id === axisId 
          ? {
              ...axis,
              activities: axis.activities.map(act => 
                act.id === activityId ? { ...act, [field]: value } : act
              )
            }
          : axis
      )
    }));
  };

  const handleAddActivity = (axisId: string) => {
    setProjectData(prev => ({
      ...prev,
      axes: prev.axes.map(axis => 
        axis.id === axisId 
          ? {
              ...axis,
              activities: [
                ...axis.activities,
                {
                  id: `new-${Date.now()}`,
                  activityType: '',
                  subject: '',
                  executionPeriod: '',
                  targetGroup: '',
                  notes: ''
                }
              ]
            }
          : axis
      )
    }));
  };

  const handleDeleteActivity = (axisId: string, activityId: string) => {
    setProjectData(prev => ({
      ...prev,
      axes: prev.axes.map(axis => 
        axis.id === axisId 
          ? {
              ...axis,
              activities: axis.activities.filter(act => act.id !== activityId)
            }
          : axis
      )
    }));
  };

  const exportToPdf = async () => {
    const originalElement = document.getElementById('project-preview-content');
    if (!originalElement) return;

    const jspdf = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    if (!jspdf || !html2canvas) {
      alert('حدث خطأ أثناء تحميل مكتبة PDF');
      return;
    }

    const { jsPDF } = jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm = 1cm
    const contentWidth = pageWidth - (margin * 2);
    
    // Create a temporary container for rendering parts
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '1123px'; // A4 landscape width in px
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.dir = 'rtl';
    document.body.appendChild(tempContainer);

    const style = document.createElement('style');
    style.innerHTML = `
      .pdf-part { background: white; width: 100%; padding: 0; margin: 0; box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; text-align: center; table-layout: fixed; }
      th, td { border: 1px solid black; padding: 8px; font-size: 12px; word-wrap: break-word; overflow-wrap: break-word; }
      th { background-color: #f3f4f6; font-weight: bold; }
      .bg-blue-100 { background-color: #dbeafe; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .mb-8 { margin-bottom: 20px; }
      .mb-2 { margin-bottom: 8px; }
      .text-2xl { font-size: 24px; }
      .text-xl { font-size: 20px; }
      .flex { display: flex; }
      .justify-center { justify-content: center; }
      .items-center { align-items: center; }
      .border-b-2 { border-bottom: 2px solid black; }
      .pb-4 { padding-bottom: 16px; }
    `;
    tempContainer.appendChild(style);

    let currentY = margin;

    const addElementToPdf = async (element: HTMLElement, repeatHeaderHtml?: string) => {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      if (currentY + imgHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        
        if (repeatHeaderHtml) {
          const headerDiv = document.createElement('div');
          headerDiv.className = 'pdf-part';
          headerDiv.innerHTML = repeatHeaderHtml;
          tempContainer.appendChild(headerDiv);
          
          const hCanvas = await html2canvas(headerDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const hImgData = hCanvas.toDataURL('image/jpeg', 0.95);
          const hImgHeight = (hCanvas.height * contentWidth) / hCanvas.width;
          
          pdf.addImage(hImgData, 'JPEG', margin, currentY, contentWidth, hImgHeight);
          currentY += hImgHeight;
          tempContainer.removeChild(headerDiv);
        }
      }

      pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight);
      currentY += imgHeight;
    };

    try {
      // 1. Header Section (Centered on first page)
      const headerDiv = document.createElement('div');
      headerDiv.className = 'pdf-part';
      headerDiv.style.padding = '40px';
      headerDiv.style.height = '770px'; // Approximate height to fill the landscape page
      headerDiv.style.display = 'flex';
      headerDiv.style.flexDirection = 'column';
      headerDiv.style.justifyContent = 'center';
      headerDiv.innerHTML = `
        ${originalElement.querySelector('.flex.justify-center')?.outerHTML || ''}
        ${originalElement.querySelector('.text-center.mb-8')?.outerHTML || ''}
        ${originalElement.querySelector('.header-table')?.outerHTML || ''}
      `;
      tempContainer.appendChild(headerDiv);
      await addElementToPdf(headerDiv);
      tempContainer.removeChild(headerDiv);

      // Force a new page before axes
      const axes = originalElement.querySelectorAll('.mb-6');
      if (axes.length > 0) {
        pdf.addPage();
        currentY = margin;
      }

      // 2. Axes Section
      for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        const axisTitle = axis.querySelector('.bg-blue-100');
        const table = axis.querySelector('table') as HTMLTableElement;
        const thead = table?.querySelector('thead');
        
        if (!axisTitle || !table || !thead) continue;

        const repeatHeaderHtml = `
          <div class="bg-blue-100 border border-black p-2 text-center font-bold text-lg mb-0" style="border: 1px solid black;">
            ${axisTitle.innerHTML}
          </div>
        `;

        // Process rows one by one to handle pagination and unmerge rowSpan
        const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
        
        // Pre-calculate merged cell content for the first column
        const firstColContent: string[] = [];
        let lastContent = '';
        rows.forEach((row) => {
          if (row.cells.length === 5) {
            lastContent = row.cells[0].innerHTML;
            firstColContent.push(lastContent);
          } else {
            firstColContent.push(lastContent);
          }
        });

        let currentTableDiv = document.createElement('div');
        currentTableDiv.className = 'pdf-part';
        let currentTableHtml = `
          ${repeatHeaderHtml}
          <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid black; table-layout: fixed;">
            ${thead.outerHTML}
            <tbody>
        `;
        
        let rowsInCurrentTable = 0;

        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          
          // Reconstruct row without rowspan for individual capture
          let rowHtml = '<tr>';
          
          // If row is missing the first column (due to rowspan), add it back
          if (row.cells.length < 5) {
            rowHtml += `<td style="border: 1px solid black; padding: 8px; font-weight: bold; width: 15%;">${firstColContent[j]}</td>`;
            Array.from(row.cells).forEach((cell, idx) => {
              const widths = ['30%', '15%', '20%', '20%'];
              rowHtml += `<td style="border: 1px solid black; padding: 8px; width: ${widths[idx]};">${cell.innerHTML}</td>`;
            });
          } else {
            Array.from(row.cells).forEach((cell, idx) => {
              const widths = ['15%', '30%', '15%', '20%', '20%'];
              rowHtml += `<td style="border: 1px solid black; padding: 8px; width: ${widths[idx]}; ${idx === 0 ? 'font-weight: bold;' : ''}">${cell.innerHTML}</td>`;
            });
          }
          rowHtml += '</tr>';
          
          // Test if adding this row exceeds the page height
          const testDiv = document.createElement('div');
          testDiv.className = 'pdf-part';
          testDiv.innerHTML = currentTableHtml + rowHtml + '</tbody></table>';
          tempContainer.appendChild(testDiv);
          
          // Approximate height calculation (since html2canvas is async, we use DOM height)
          // 1mm = 3.78px approx. So pageHeight in px is pageHeight * 3.78
          const pxToMm = 0.264583;
          const testHeightMm = testDiv.clientHeight * pxToMm;
          const availableHeightMm = pageHeight - currentY - margin;
          
          tempContainer.removeChild(testDiv);

          if (testHeightMm > availableHeightMm && rowsInCurrentTable > 0) {
            // Render current table, then start a new one
            currentTableDiv.innerHTML = currentTableHtml + '</tbody></table>';
            tempContainer.appendChild(currentTableDiv);
            await addElementToPdf(currentTableDiv);
            tempContainer.removeChild(currentTableDiv);
            
            // Start new table on next page
            pdf.addPage();
            currentY = margin;
            currentTableHtml = `
              ${repeatHeaderHtml}
              <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid black; table-layout: fixed;">
                ${thead.outerHTML}
                <tbody>
                  ${rowHtml}
            `;
            rowsInCurrentTable = 1;
          } else {
            currentTableHtml += rowHtml;
            rowsInCurrentTable++;
          }
        }
        
        // Render the remaining table
        if (rowsInCurrentTable > 0) {
          currentTableDiv.innerHTML = currentTableHtml + '</tbody></table>';
          tempContainer.appendChild(currentTableDiv);
          await addElementToPdf(currentTableDiv);
          tempContainer.removeChild(currentTableDiv);
        }
      }

      // 3. Footer Section
      const footerNote = originalElement.querySelector('.border.border-black.p-4.mt-8');
      const signature = originalElement.querySelector('.mt-8.text-left.pl-16');

      if (footerNote) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'pdf-part';
        noteDiv.style.padding = '10px';
        noteDiv.innerHTML = `<div style="border: 1px solid black; padding: 10px;">${footerNote.innerHTML}</div>`;
        tempContainer.appendChild(noteDiv);
        await addElementToPdf(noteDiv);
        tempContainer.removeChild(noteDiv);
      }

      if (signature) {
        const sigDiv = document.createElement('div');
        sigDiv.className = 'pdf-part';
        sigDiv.style.padding = '10px';
        sigDiv.innerHTML = `<div style="text-align: left; padding-left: 60px; font-weight: bold; font-size: 18px;">${signature.innerHTML}</div>`;
        tempContainer.appendChild(sigDiv);
        await addElementToPdf(sigDiv);
        tempContainer.removeChild(sigDiv);
      }

      pdf.save('مشروع_البرنامج_السنوي.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const exportToWord = async () => {
    const element = document.getElementById('project-preview-content');
    if (!element) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
        th, td { border: 1px solid #000; padding: 8px; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .header-table th { width: 25%; }
        .header-table td { width: 25%; }
        h1, h2, h3 { text-align: center; }
        .axis-title { background-color: #e5e7eb; padding: 10px; font-weight: bold; text-align: center; border: 1px solid #000; margin-top: 20px; margin-bottom: 0; }
        .footer-note { margin-top: 30px; font-size: 14px; border: 1px solid #000; padding: 10px; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-start { align-items: flex-start; }
        .mb-8 { margin-bottom: 2rem; }
        .border-b-2 { border-bottom-width: 2px; }
        .border-black { border-color: #000; }
        .pb-4 { padding-bottom: 1rem; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-sm { font-size: 0.875rem; }
        .font-bold { font-weight: bold; }
        .leading-relaxed { line-height: 1.625; }
        .flex-1 { flex: 1 1 0%; }
        .justify-center { justify-content: center; }
        .w-16 { width: 4rem; }
        .h-16 { height: 4rem; }
        .border-2 { border-width: 2px; }
        .border-gray-400 { border-color: #9ca3af; }
        .rounded-full { border-radius: 9999px; }
        .items-center { align-items: center; }
        .text-gray-400 { color: #9ca3af; }
        .text-xs { font-size: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-xl { font-size: 1.25rem; }
        .flex-col { flex-direction: column; }
        .p-1 { padding: 0.25rem; }
        .text-gray-800 { color: #1f2937; }
        .border-gray-800 { border-color: #1f2937; }
        img { max-width: 100%; height: auto; }
        .h-\\[80px\\] { height: 80px; }
        .w-auto { width: auto; }
        .object-contain { object-fit: contain; }
      </style>
    `;

    const header = `<!DOCTYPE html><html lang="ar"><head><meta charset='utf-8'><title>Export HTML To Doc</title>${styles}</head><body><div class="WordSection1">`;
    const footer = "</div></body></html>";
    const sourceHTML = header + element.innerHTML + footer;
    
    try {
        const docxBlob = await convertHtmlToDocx(sourceHTML, {
            orientation: 'landscape',
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        });
        await exportFile(docxBlob, 'مشروع_البرنامج_السنوي.doc');
    } catch (error) {
        console.error('Error generating DOCX:', error);
        alert('حدث خطأ أثناء إنشاء ملف Word.');
    }
  };

  const printPreview = () => {
    const printContent = document.getElementById('project-preview-content')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl" lang="ar">
          <head>
            <title>مشروع البرنامج السنوي</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
              th, td { border: 1px solid #000; padding: 8px; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .header-table th { width: 25%; }
              .header-table td { width: 25%; }
              h1, h2, h3 { text-align: center; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-start { align-items: flex-start; }
              .mb-8 { margin-bottom: 2rem; }
              .border-b-2 { border-bottom-width: 2px; }
              .border-black { border-color: #000; }
              .pb-4 { padding-bottom: 1rem; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .text-sm { font-size: 0.875rem; }
              .font-bold { font-weight: bold; }
              .leading-relaxed { line-height: 1.625; }
              .flex-1 { flex: 1 1 0%; }
              .justify-center { justify-content: center; }
              .w-16 { width: 4rem; }
              .h-16 { height: 4rem; }
              .border-2 { border-width: 2px; }
              .border-gray-400 { border-color: #9ca3af; }
              .rounded-full { border-radius: 9999px; }
              .items-center { align-items: center; }
              .text-gray-400 { color: #9ca3af; }
              .text-xs { font-size: 0.75rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .text-2xl { font-size: 1.5rem; }
              .text-xl { font-size: 1.25rem; }
              .flex-col { flex-direction: column; }
              .p-1 { padding: 0.25rem; }
              .text-gray-800 { color: #1f2937; }
              .border-gray-800 { border-color: #1f2937; }
              img { max-width: 100%; height: auto; }
              .h-\\[80px\\] { height: 80px; }
              .w-auto { width: auto; }
              .object-contain { object-fit: contain; }
              .axis-title { background-color: #e5e7eb; padding: 10px; font-weight: bold; text-align: center; border: 1px solid #000; margin-top: 20px; margin-bottom: 0; }
              .footer-note { margin-top: 30px; font-size: 14px; border: 1px solid #000; padding: 10px; }
              @media print {
                body { margin: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const getRowSpan = (axis: ProjectAxis, actIndex: number) => {
    if (actIndex > 0 && axis.activities[actIndex].activityType === axis.activities[actIndex - 1].activityType) {
      return 0; // Don't render td
    }
    let span = 1;
    for (let i = actIndex + 1; i < axis.activities.length; i++) {
      if (axis.activities[i].activityType === axis.activities[actIndex].activityType) {
        span++;
      } else {
        break;
      }
    }
    return span;
  };

  const renderPreviewContent = () => (
    <div id="project-preview-content" className="p-8 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <div className="flex justify-center items-center mb-8 border-b-2 border-black pb-4">
        <div className="text-center">
          {ministryLogo ? (
            <img src={ministryLogo} alt="شعار الوزارة" style={{ height: `${ministryLogoHeight}px` }} className="w-auto object-contain" />
          ) : (
            <div className="w-16 h-16 border-2 border-gray-800 rounded-full flex flex-col items-center justify-center text-gray-800 text-xs font-bold text-center p-1">
              <span>شعار</span>
              <span>الوزارة</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">مشروع البرنامج العمل السنوي الخاص بهيأة التفتيش التربوي</h1>
        <h2 className="text-xl font-bold">للموسم الدراسي {projectData.schoolYear}</h2>
      </div>

      <table className="w-full border-collapse border border-black mb-8 text-center header-table">
        <tbody>
          <tr>
            <th className="border border-black p-2 bg-gray-100">الاسم والنسب</th>
            <td className="border border-black p-2 font-bold">{projectData.name}</td>
            <th className="border border-black p-2 bg-gray-100">الأكاديمية</th>
            <td className="border border-black p-2 font-bold">{projectData.academy}</td>
          </tr>
          <tr>
            <th className="border border-black p-2 bg-gray-100">رقم التأجير</th>
            <td className="border border-black p-2 font-bold">{projectData.employeeNumber}</td>
            <th className="border border-black p-2 bg-gray-100">المديرية الإقليمية</th>
            <td className="border border-black p-2 font-bold">{projectData.directorate}</td>
          </tr>
          <tr>
            <th className="border border-black p-2 bg-gray-100">الإطار</th>
            <td className="border border-black p-2 font-bold">{projectData.framework}</td>
            <th className="border border-black p-2 bg-gray-100">المادة</th>
            <td className="border border-black p-2 font-bold">{projectData.subject}</td>
          </tr>
          <tr>
            <th className="border border-black p-2 bg-gray-100">تاريخ التسمية</th>
            <td className="border border-black p-2 font-bold">{projectData.appointmentDate}</td>
            <th className="border border-black p-2 bg-gray-100">تاريخ التوظيف</th>
            <td className="border border-black p-2 font-bold">{projectData.employmentDate}</td>
          </tr>
        </tbody>
      </table>

      {projectData.axes.map((axis, index) => (
        <div key={axis.id} className="mb-6">
          <div className="bg-blue-100 border border-black p-2 text-center font-bold text-lg mb-0">
            {axis.title}
          </div>
          <table className="w-full border-collapse border border-black text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2" style={{ width: '15%' }}>نوع الأنشطة</th>
                <th className="border border-black p-2" style={{ width: '30%' }}>الموضوع</th>
                <th className="border border-black p-2" style={{ width: '15%' }}>فترة الانجاز</th>
                <th className="border border-black p-2" style={{ width: '20%' }}>الفئة المستهدفة</th>
                <th className="border border-black p-2" style={{ width: '20%' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {axis.activities.map((act, actIndex) => {
                const rowSpan = getRowSpan(axis, actIndex);
                return (
                <tr key={act.id}>
                  {rowSpan > 0 ? (
                    <td className="border border-black p-2 font-bold align-middle" rowSpan={rowSpan}>
                      {act.activityType}
                    </td>
                  ) : null}
                  <td className="border border-black p-2 text-right whitespace-pre-wrap">{act.subject}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap">{act.executionPeriod}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap">{act.targetGroup}</td>
                  <td className="border border-black p-2 whitespace-pre-wrap">{act.notes}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="border border-black p-4 mt-8 text-sm leading-relaxed">
        <strong>ملحوظة:</strong> برنامج العمل التربوي أعلاه ليس نهائيا فهو يعد مشروعا تربويا قابلا للإغناء والتعديل، حسب ما تسمح به الشروط الموضوعية للعمل التربوي التأطيري وحسب ما ستسفر عنه اللقاءات الاولية مع أساتذة المادة وكذا بناء على تشخيص الحاجيات وتحديد الاولويات.
      </div>
      
      <div className="mt-8 text-left pl-16 font-bold text-lg">
        التوقيع :
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">مشروع البرنامج السنوي</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="btn bg-slate-200 text-slate-700 hover:bg-slate-300">
                إلغاء
              </button>
              <button onClick={handleSave} className="btn bg-teal-600 text-white hover:bg-teal-700">
                <i className="fas fa-save ml-2"></i> حفظ
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn bg-sky-600 text-white hover:bg-sky-700">
                <i className="fas fa-edit ml-2"></i> تعديل
              </button>
              <button onClick={() => setIsPreviewModalOpen(true)} className="btn bg-indigo-600 text-white hover:bg-indigo-700">
                <i className="fas fa-eye ml-2"></i> معاينة وطباعة
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-8">
          {/* Header Info Edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            {Object.entries({
              schoolYear: 'الموسم الدراسي',
              name: 'الاسم والنسب',
              academy: 'الأكاديمية',
              directorate: 'المديرية الإقليمية',
              employeeNumber: 'رقم التأجير',
              framework: 'الإطار',
              subject: 'المادة',
              appointmentDate: 'تاريخ التسمية',
              employmentDate: 'تاريخ التوظيف'
            }).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                <input
                  type="text"
                  value={projectData[key as keyof ProjectData] as string}
                  onChange={(e) => handleHeaderChange(key as keyof ProjectData, e.target.value)}
                  className="input-style w-full"
                />
              </div>
            ))}
          </div>

          {/* Axes Edit */}
          {projectData.axes.map(axis => (
            <div key={axis.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 font-bold text-lg border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                {axis.title}
                <button onClick={() => handleAddActivity(axis.id)} className="btn bg-emerald-500 text-white hover:bg-emerald-600 py-1 px-3 text-sm">
                  <i className="fas fa-plus ml-1"></i> إضافة نشاط
                </button>
              </div>
              <div className="p-4 space-y-4">
                {axis.activities.map((act, index) => (
                  <div key={act.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 relative">
                    <button 
                      onClick={() => handleDeleteActivity(axis.id, act.id)}
                      className="absolute top-2 left-2 text-red-500 hover:text-red-700"
                      title="حذف النشاط"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">نوع الأنشطة</label>
                      <input type="text" value={act.activityType} onChange={(e) => handleActivityChange(axis.id, act.id, 'activityType', e.target.value)} className="input-style w-full text-sm" />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">الموضوع</label>
                      <textarea value={act.subject} onChange={(e) => handleActivityChange(axis.id, act.id, 'subject', e.target.value)} className="input-style w-full text-sm min-h-[80px]" />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">فترة الانجاز</label>
                      <textarea value={act.executionPeriod} onChange={(e) => handleActivityChange(axis.id, act.id, 'executionPeriod', e.target.value)} className="input-style w-full text-sm min-h-[80px]" />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">الفئة المستهدفة</label>
                      <textarea value={act.targetGroup} onChange={(e) => handleActivityChange(axis.id, act.id, 'targetGroup', e.target.value)} className="input-style w-full text-sm min-h-[80px]" />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">ملاحظات</label>
                      <textarea value={act.notes} onChange={(e) => handleActivityChange(axis.id, act.id, 'notes', e.target.value)} className="input-style w-full text-sm min-h-[80px]" />
                    </div>
                  </div>
                ))}
                {axis.activities.length === 0 && (
                  <div className="text-center text-slate-500 py-4">لا توجد أنشطة في هذا المحور.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
          {/* Read-only preview inside the page */}
          <div className="transform scale-[0.8] origin-top">
            {renderPreviewContent()}
          </div>
        </div>
      )}

      <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="معاينة مشروع البرنامج السنوي" size="5xl">
        <div className="flex flex-col gap-4">
          <div className="flex justify-end gap-2 print-hidden">
            <button onClick={exportToWord} className="btn bg-blue-600 text-white hover:bg-blue-700">
              <i className="fas fa-file-word ml-2"></i> تحميل Word
            </button>
            <button onClick={exportToPdf} className="btn bg-red-600 text-white hover:bg-red-700">
              <i className="fas fa-file-pdf ml-2"></i> تحميل PDF
            </button>
            <button onClick={printPreview} className="btn bg-sky-600 text-white hover:bg-sky-700">
              <i className="fas fa-print ml-2"></i> طباعة
            </button>
          </div>
          <div className="overflow-auto max-h-[70vh] border border-slate-300 rounded">
            {renderPreviewContent()}
          </div>
        </div>
      </Modal>
    </div>
  );
}
