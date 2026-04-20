
import { SavedReport, OtherReport, Teacher, Inspector, Memo, ReportType, EvaluationCriterion, LessonObservation } from '../types';

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
        ministryLogoAlt: "شعار الوزارة",
        teacherDetail_infoCardTitle: "المعلومات المهنية",
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
        signature_regionalDirector: "Signature du Directeur Provincial",
        signature_institutionDirector: "Signature du Directeur de l'établissement",
        teacher: "Enseignant"
    }
};

export const generateSavedReportHtml = (
    report: SavedReport,
    teacher: Teacher | null,
    inspector: Inspector,
    ministryLogo: string,
    ministryLogoHeight: number = 120,
    reportFontSize: number = 14,
    reportFontFamily: string = ""
) => {
    const reportLanguage = report.language || 'ar';
    const direction = reportLanguage === 'ar' ? 'rtl' : 'ltr';
    const defaultFontFamily = reportLanguage === 'ar' ? "'Sakkal Majalla', Arial, sans-serif" : "'Times New Roman', Times, serif";
    const fontFamily = reportFontFamily || defaultFontFamily;
    const isInspection = report.reportType === ReportType.INSPECTION;

    const rt = reportTranslations[reportLanguage] || reportTranslations['ar'];
    const currentReportTypeLabel = isInspection ? rt.inspectionReport : rt.visitReport;
    const teacherTitle = teacher?.genre === 'female' && reportLanguage === 'ar' ? 'الأستاذة' : rt.teacher;

    const formatDate = (dateStr: string | null | undefined, lang: string = 'ar') => {
        if (!dateStr) return '';
        try {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-');
                return lang === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
            }
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return lang === 'fr' ? `${day}/${month}/${year}` : `${year}/${month}/${day}`;
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
    const lastInspector = lastScore !== '' ? (report.previousInspector !== undefined ? (report.previousInspector === null ? '' : report.previousInspector) : (teacher?.lastInspector || '')) : '';
    const reportDateForDisplay = formatDate(report.date);

    const isNetwork = report.reportTemplate === 'network';
    
    const headerHtml = `
      <table style="width: 100%; margin-bottom: 0.5rem; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; text-align: right; vertical-align: middle;">
            <img src="${ministryLogo}" alt="${rt.ministryLogoAlt}" style="height: ${ministryLogoHeight * 1.26}px; width: auto; max-width: 100%; object-fit: contain;" />
          </td>
          <td style="width: 50%; text-align: left; vertical-align: middle;">
            <table style="width: 400px; border-collapse: collapse; float: left;">
              <tr>
                <td style="background-color: #f2f2f2; border: 1px solid #000; padding: 10px; text-align: center; vertical-align: middle;">
                  <span style="font-size: 18pt; font-weight: bold; margin: 0; color: #000;">${escapeHtml(currentReportTypeLabel)}</span>
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
                <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${isNetwork ? '16px' : '1.2rem'}; vertical-align: middle; line-height: 1.3;">${rt.teacherDetail_infoCardTitle}</td>
            </tr>
        </table>
        <div style="border: 1px solid #ddd; border-top: none; padding: 0.4rem;">
            <table style="width: 100%; border-collapse: collapse; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; font-size: ${isNetwork ? '14px' : 'inherit'};">
                <tbody>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_fullName}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.fullName)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_subject}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(reportTranslations[reportLanguage][teacher.subject] || teacher.subject)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_lastScore}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastScore)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_employeeId}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.employeeId)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_grade}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', ''))}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_lastDate}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastDate)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_framework}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.framework)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_rank}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.rank)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${lastScore !== '' ? rt.teacher_lastInspector + ':' : ''}</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastInspector)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.2; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_institution}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.2; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};" colspan="5">${escapeHtml(teacher.institution)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>` : '';

    const parsedObservation: LessonObservation | undefined = (() => {
        if (!report?.observation) return undefined;
        if (typeof report.observation === 'string') {
          try {
            const parsed = JSON.parse(report.observation);
            return (typeof parsed === 'object' && parsed !== null) ? parsed : undefined;
          } catch (e) {
            return undefined;
          }
        }
        return (typeof report.observation === 'object' && report.observation !== null) ? report.observation : undefined;
    })();

    const observationHtml = parsedObservation ? `
      <div style="margin-top: 0.5rem;">
          <table style="width: 100%; border-collapse: collapse; background-color: #f2f2f2;">
              <tr>
                  <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${isNetwork ? '16px' : '1.2rem'}; vertical-align: middle; line-height: 1.3;">${rt.reportModal_lessonObservation}</td>
              </tr>
          </table>
          <div style="border: 1px solid #ddd; border-top: none;">
              <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: ${isNetwork ? '14px' : 'inherit'};">
                <tr style="background-color: #e0e0e0;">
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_activityCategory}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_activity}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_level}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_class}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_studentCount}</th>
                  <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_tools}</th>
                </tr>
                <tr>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.activityCategory)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.activity)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.level)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.class)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.studentCount)}</td>
                  <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(parsedObservation.tools)}</td>
                </tr>
              </table>
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #ddd; font-size: ${isNetwork ? '14px' : 'inherit'};">
                  <tr>
                    <td style="background-color: #f2f2f2; padding: 6px 4px; text-align: center; font-weight: bold; border-right: 1px solid #ddd; width: 20%; vertical-align: middle; line-height: 1.3;">${rt.evaluation_field_lessonGoal} :</td>
                    <td style="padding: 6px 4px; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; vertical-align: middle; line-height: 1.3;">${escapeHtml(parsedObservation.lessonGoal).replace(/\n/g, '<br />')}</td>
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

    const parsedCriteria = (() => {
        if (!report?.criteria) return [];
        if (typeof report.criteria === 'string') {
          try {
            const parsed = JSON.parse(report.criteria);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return Array.isArray(report.criteria) ? report.criteria : [];
    })();

    let criteriaHtml = '';
    if (report.reportTemplate === 'network') {
        criteriaHtml = `
        <div style="margin-top: 0.5rem; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 0.85em; line-height: 1.3;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 20%; vertical-align: middle; text-align: center; line-height: 1.3;">${reportLanguage === 'ar' ? 'المجالات' : 'Domaines'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 35%; vertical-align: middle; text-align: center; line-height: 1.3;">${reportLanguage === 'ar' ? 'المؤشرات' : 'Indicateurs'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 15%; vertical-align: middle; text-align: center; line-height: 1.3;">${reportLanguage === 'ar' ? 'مستوى الإنجاز' : 'Niveau de réalisation'}</th>
                        <th style="padding: 6px 5px; border: 1px solid #ccc; width: 30%; vertical-align: middle; text-align: center; line-height: 1.3;">${reportLanguage === 'ar' ? 'الملاحظات والتوجيهات' : 'Observations et orientations'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${parsedCriteria.map((c: EvaluationCriterion) => {
                        const indicators = c.indicators || [];
                        const rowSpan = indicators.length > 0 ? indicators.length : 1;
                        
                        if (indicators.length === 0) {
                            return `
                            <tr>
                                <td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(c.name)}</td>
                                <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">-</td>
                                <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.3;">-</td>
                                <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.3;">${escapeHtml(c.comment.trim()).replace(/\n/g, '<br />')}</td>
                            </tr>`;
                        }

                        return indicators.map((ind, index) => {
                            if (index === 0) {
                                return `
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; vertical-align: middle; text-align: center; line-height: 1.3;" rowspan="${rowSpan}">${escapeHtml(c.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(ind.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.3;"><strong>${escapeHtml(getAchievementLevelText(ind.level))}</strong></td>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;" rowspan="${rowSpan}">${escapeHtml(c.comment.trim()).replace(/\n/g, '<br />')}</td>
                                </tr>`;
                            } else {
                                return `
                                <tr>
                                    <td style="padding: 5px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(ind.name)}</td>
                                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.3;"><strong>${escapeHtml(getAchievementLevelText(ind.level))}</strong></td>
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
                    <p style="font-weight: bold;">${escapeHtml(c.name)} :</p>
                    <div style="padding: 0.4rem; min-height: 40px; white-space: pre-wrap; text-align: justify; text-indent: 1.5em;">${escapeHtml(c.comment).replace(/\n/g, '<br />') || '<br/>'}</div>
                  </div>
                `).join('')}
          </div>`;
    }

    const overallAssessmentHtml = report.reportTemplate === 'network' && report.overallAssessment ? `
      <div style="margin-top: 0.5rem; border: 1px solid #ddd; padding: 0.3rem; background-color: #fafafa; font-size: 0.85em;">
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

    const regionalDirectorTitle = inspector.regionalDirectorTitle || 'المدير الإقليمي';
    const signatureRegionalDirector = rt.signature_regionalDirector.replace('{regionalDirectorTitle}', regionalDirectorTitle);

    const signaturesHtml = teacher ? `
      <div style="margin-top: 1rem; padding-top: 0.5rem; text-align: right; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr>
            <td style="width: 33%; vertical-align: middle;"><strong>${rt.signature_title_1}</strong></td>
            <td style="width: 33%; vertical-align: middle;"><strong>${signatureRegionalDirector}</strong></td>
            <td style="width: 33%; vertical-align: middle;"><strong>${rt.signature_institutionDirector}</strong></td>
          </tr>
          <tr>
            <td style="padding-top: 4rem;"></td>
            <td style="padding-top: 4rem;"></td>
            <td style="padding-top: 4rem;"></td>
          </tr>
        </table>
      </div>` : '';
      
    const bodyContent = `${headerHtml}${teacherInfoHtml}${observationHtml}${criteriaHtml}${overallAssessmentHtml}${dateAndScoreHtml}${signaturesHtml}`;
    return bodyContent;
};

export const generateOtherReportHtml = (
    report: OtherReport,
    inspector: Inspector,
    ministryLogo: string,
    t: (key: string) => string,
    teachers: Teacher[] = [],
    memos: Memo[] = [],
    reportFontSize: number = 16,
    reportFontFamily: string = ""
) => {
    const reportDate = new Date(report.date).toLocaleDateString('fr-CA').replace(/-/g, '/');
    const direction = 'rtl'; // Assuming Arabic for Other Reports
    const defaultFontFamily = "'Sakkal Majalla', 'SakkalMajalla', 'Cairo', Arial, sans-serif";
    const fontFamily = reportFontFamily || defaultFontFamily;

    const linkedMemo = memos.find(m => m.activityType === report.activityType);
    const validRefs = report.references ? [...report.references] : [];
    if (linkedMemo) {
        validRefs.push(linkedMemo.content);
    }
    const filteredRefs = validRefs.filter(r => r && r.trim() !== '');
    let referencesHtml = '';

    if (filteredRefs.length > 0) {
        const refsRows = filteredRefs.map(ref => `<div style="margin-bottom: 2px;">- ${escapeHtml(ref)}</div>`).join('');
        referencesHtml = `
            <table style="border: none; border-collapse: collapse; margin: 0; padding: 0; width: auto;">
                <tr>
                    <td style="vertical-align: top; white-space: nowrap; padding-left: 8px; border: none; font-size: 16pt;">
                        <strong>${t('report_reference_field')}</strong>
                    </td>
                    <td style="vertical-align: top; border: none; font-size: 16pt;">
                        ${refsRows}
                    </td>
                </tr>
            </table>
        `;
    }

    const headerHtml = `
      <div style="text-align: center; margin-bottom: 0.5rem; width: 100%;">
        <img src="${ministryLogo}" alt="${t('ministryLogoAlt')}" style="height: 120px; max-width: 100%; object-fit: contain; margin: 0 auto;" />
      </div>
    `;

    const documentNumberHtml = report.documentNumber 
        ? `<div style="text-align: right; font-weight: bold; margin-bottom: 0.25rem;">
             ${t('otherReports_documentNumber')} ${escapeHtml(report.documentNumber)}
           </div>`
        : '';

    let teachersSectionsHtml = '';
    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    if (report.includeTeachersList !== false) {
        const isValidationReport = report.templateId === 'timetable_validation';
        const isCycleValidation = report.templateId === 'cycle_validation';
        const isAnyValidation = isValidationReport || isCycleValidation;

        const invitedList = (report.invitedTeacherIds || []).map(id => teachers.find(t => String(t.id) === String(id))).filter(Boolean) as Teacher[];
        invitedList.sort((a, b) => {
            const instCompare = (a.institution || '').localeCompare(b.institution || '', 'ar');
            if (instCompare !== 0) return instCompare;
            return (a.fullName || '').localeCompare(b.fullName || '', 'ar');
        });

        if (isAnyValidation) {
            const approvedTeachers = invitedList.filter(t => report.invitedTeacherStatuses?.[String(t.id)]?.status === 'approved');
            const rejectedTeachers = invitedList.filter(t => report.invitedTeacherStatuses?.[String(t.id)]?.status === 'rejected');
            const displayMode = isCycleValidation ? 'institutions' : (report.validationDisplayMode || 'teachers');

            const renderValidationTable = (list: Teacher[], title: string, showReason: boolean) => {
                if (list.length === 0) return '';
                if (displayMode === 'institutions') {
                    const uniqueInstitutions = [...new Set(list.map(t => t.institution).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
                    const chunks = chunkArray(uniqueInstitutions, 30);
                    return chunks.map((chunk, chunkIdx) => `
                        <div class="attendance-page-block" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; page-break-before: always; min-height: 1000px; position: relative;">
                            ${headerHtml}
                            <div style="text-align: center; margin-bottom: 1.5rem; margin-top: 1rem;">
                                <h3 style="text-decoration: underline; font-size: 16pt; margin: 0;">${title}</h3>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14pt;">
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
                                <div style="margin-top: 2rem; border: 1px solid #000; padding: 10px; text-align: justify; font-size: 14pt;">
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
                                <h3 style="text-decoration: underline; font-size: 16pt; margin: 0;">${title}</h3>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14pt;">
                                <thead>
                                    <tr>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%;">ر.ت</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_fullName')}</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 1%; white-space: nowrap;">${t('teacher_employeeId')}</th>
                                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: right;">${t('teacher_institution')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${chunk.map((teacher, idx) => `
                                        <tr>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${(chunkIdx * 20) + idx + 1}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${escapeHtml(teacher.fullName)}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${escapeHtml(teacher.employeeId)}</td>
                                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${escapeHtml(teacher.institution)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${(showReason && report.generalRejectionReason) ? `
                                <div style="margin-top: 2rem; border: 1px solid #000; padding: 10px; text-align: justify; font-size: 14pt;">
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
                        <h3 style="text-decoration: underline; font-size: 16pt; margin: 0;">${t('otherReports_invitedListTitle')}</h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14pt;">
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

    const regionalDirectorTitle = inspector.regionalDirectorTitle || 'المدير الإقليمي';

    const mainReportContentHtml = `
        <div id="main-report-content" style="padding: 20px; background: white; width: 100%; box-sizing: border-box; min-height: 1000px; position: relative;">
            <div style="position: absolute; top: 20px; left: 20px; font-weight: bold; font-size: 16pt;">${reportDate}</div>
            <div style="margin-bottom: 1.5cm;">
                ${headerHtml}
            </div>
            <table style="width: 100%; margin-bottom: 2rem; border-collapse: collapse; font-size: 16pt;">
                <tbody>
                    <tr>
                        <td style="width: 55%; vertical-align: top; text-align: right; padding: 0 5px;">
                            <p style="margin: 0;">${t('report_from')} <strong>${escapeHtml(inspector.fullName)}</strong></p>
                            <p style="margin: 0;">${t('report_framework_label')} ${escapeHtml(inspector.framework)}</p>
                            <p style="margin: 0;">${t('report_subject_label')} ${escapeHtml(inspector.subject)}</p>
                        </td>
                        <td style="width: 45%; vertical-align: top; text-align: right; padding: 0 5px;">
                            <p style="margin: 0;">إلى السيد ${escapeHtml(regionalDirectorTitle)} لوزارة التربية الوطنية والتعليم الأولي والرياضة</p>
                            <p style="margin: 0;"><strong>${escapeHtml(report.concernedDepartment)}</strong></p>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div style="text-align: right; padding: 0 5px; margin-bottom: 10px; font-size: 16pt;">
                ${documentNumberHtml}
                <p style="margin: 0; line-height: 1.4;"><strong>${t('report_subject_field')}</strong> ${escapeHtml(report.subject)}</p>
                ${referencesHtml}
            </div>
            <div style="text-align: justify; white-space: pre-wrap; line-height: 1.8; text-indent: 2.5em; padding: 0 5px; min-height: 150px; font-size: 16pt;">
                ${escapeHtml(report.content).replace(/\n/g, '<br />')}
            </div>
            <div style="margin-top: 1.5cm; page-break-inside: avoid; font-size: 16pt;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; text-align: right; vertical-align: top;">
                            <p style="font-weight: bold; text-decoration: underline; margin-bottom: 5rem;">توقيع المفتش:</p>
                        </td>
                        <td style="width: 50%; text-align: left; vertical-align: top;">
                            <p style="font-weight: bold; text-decoration: underline; margin-bottom: 5rem;">توقيع السيد ${escapeHtml(regionalDirectorTitle)}:</p>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    return `
        <div id="full-export-wrapper" style="width: 1000px; margin: 0 auto; background: white;">
            ${mainReportContentHtml}
            ${teachersSectionsHtml}
        </div>
    `;
};
