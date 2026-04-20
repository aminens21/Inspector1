import { convertHtmlToDocx } from './services/htmlToDocx';
import { generateSavedReportHtml } from './services/reportHtmlGenerator';
import { ReportType } from './types';

async function run() {
  const report = {
    id: '1',
    teacherId: '1',
    teacherName: 'John Doe',
    date: '2023-10-27',
    reportType: ReportType.INSPECTION,
    language: 'ar',
    criteria: [],
    observation: {
      activityCategory: 'Category',
      activity: 'Activity',
      level: 'Level',
      class: 'Class',
      studentCount: '30',
      tools: 'Tools',
      lessonGoal: 'Goal'
    },
    score: 18,
    previousInspectionScore: 16,
    previousInspectionDate: '2022-10-27',
    previousInspector: 'Jane Doe',
    reportTemplate: 'standard'
  };

  const teacher = {
    id: '1',
    fullName: 'John Doe',
    subject: 'Math',
    employeeId: '12345',
    grade: '1',
    framework: 'Framework',
    rank: 'Rank',
    institution: 'Institution',
    lastInspectionScore: 16,
    lastInspectionDate: '2022-10-27',
    lastInspector: 'Jane Doe',
    genre: 'male'
  };

  const inspector = {
    id: '1',
    fullName: 'Inspector Name',
    framework: 'Framework',
    subject: 'Subject',
    regionalDirectorate: 'Directorate',
    academy: 'Academy',
    email: 'email@example.com'
  };

  const html = generateSavedReportHtml(report as any, teacher as any, inspector as any, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
  
  const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset='utf-8'>
            <title>Test</title>
            <style>
                body { font-family: Arial; direction: rtl; text-align: right; font-size: 14pt; line-height: 1.5; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 2px; vertical-align: middle; }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;

  try {
    const blob = await convertHtmlToDocx(htmlContent);
    console.log("Success!");
  } catch (e) {
    console.error(e);
  }
}

run();
