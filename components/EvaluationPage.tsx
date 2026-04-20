
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Teacher, ReportType, LessonObservation, EvaluationCriterion, SavedReport, Inspector, SportActivities } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { appTexts } from '../appTexts';
import { PageHeader } from './ui/PageHeader';
import { exportFile } from '../services/fileExport';
import { loadInitialData } from '../services/localStorageManager';
import { convertHtmlToDocx } from '../services/htmlToDocx';

// Déclarations pour les bibliothèques globales chargées via CDN
declare global {
  interface Window {
    XLSX: any;
    jspdf: any;
    html2canvas: any;
    docx: any;
  }
}

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

const initialObservationState: LessonObservation = {
    activityCategory: '',
    activity: '',
    level: '',
    class: '',
    studentCount: '',
    tools: '',
    lessonGoal: '',
};

const getStandardCriteria = (t: any): EvaluationCriterion[] => [
    { id: '1', name: t('evaluation_criteria_prep') || 'التخطيط والإعداد', comment: '' },
    { id: '2', name: t('evaluation_criteria_execution') || 'تدبير إنجاز الحصة', comment: '' },
    { id: '3', name: t('evaluation_criteria_evaluation') || 'التقويم', comment: '' },
    { id: '4', name: t('evaluation_criteria_professionalism') || 'التطور المهني والإلتزام', comment: '' },
];

const getNetworkGrid = (t: any): EvaluationCriterion[] => [
  {
    id: 'net-1',
    name: t('network_grid_c1') || 'الشروط المادية والتنظيمية',
    comment: '',
    indicators: [
      { name: t('network_grid_c1_i1') || 'الوضعية المادية لفضاء التعلم', level: '' },
      { name: t('network_grid_c1_i2') || 'الوسائل التعليمية', level: '' },
      { name: t('network_grid_c1_i3') || 'تنظيم فضاء التعلم', level: '' }
    ]
  },
  {
    id: 'net-2',
    name: t('network_grid_c2') || 'القدرة على التنظيم والتخطيط',
    comment: '',
    indicators: [
      { name: t('network_grid_c2_i1') || 'وثائق تربوية محينة', level: '' },
      { name: t('network_grid_c2_i2') || 'احترام البرنامج الوطني لتدريس المادة', level: '' },
      { name: t('network_grid_c2_i3') || 'اجراء التقويم التشخيصي', level: '' },
      { name: t('network_grid_c2_i4') || 'وضوح الأهداف المسطرة للدرس', level: '' },
      { name: t('network_grid_c2_i5') || 'اختيار الوسائل التعليمية المناسبة', level: '' },
      { name: t('network_grid_c2_i6') || 'احترام الغلاف الزمني للحصة/للحلقة', level: '' },
      { name: t('network_grid_c2_i7') || 'اعتماد المشروع البيداغوجي والرياضي ومشروع الحلقة', level: '' }
    ]
  },
  {
    id: 'net-3',
    name: t('network_grid_c3') || 'إنجاز الأعمال المرتبطة بالوظيفة',
    comment: '',
    indicators: [
      { name: t('network_grid_c3_i1') || 'التمكن من مفاهيم ومصطلحات المادة المعرفية', level: '' },
      { name: t('network_grid_c3_i2') || 'التمكن من منهجية تدريس المادة', level: '' },
      { name: t('network_grid_c3_i3') || 'تماسك البناء الداخلي للدرس (التدرج والانسجام)', level: '' },
      { name: t('network_grid_c3_i4') || 'احترام توزيع زمن مكونات الحصة الدراسية', level: '' },
      { name: t('network_grid_c3_i5') || 'توظيف الوسائل التعليمية', level: '' },
      { name: t('network_grid_c3_i6') || 'مراعاة الفوارق الفردية بين المتعلمين والمتعلمات', level: '' },
      { name: t('network_grid_c3_i7') || 'ملاءمة أنشطة التقويم و/ أو الدعم لأهداف الدرس', level: '' }
    ]
  },
  {
    id: 'net-4',
    name: t('network_grid_c4') || 'البحث والابتكار',
    comment: '',
    indicators: [
      { name: t('network_grid_c4_i1') || 'اعتماد أساليب وطرق تدريس جديدة ومبتكرة', level: '' },
      { name: t('network_grid_c4_i2') || 'استخدام تكنولوجيا المعلومات والاتصال والموارد الرقمية', level: '' },
      { name: t('network_grid_c4_i3') || 'أنشطة البحث التربوي (فردية أو جماعية)', level: '' }
    ]
  },
  {
    id: 'net-5',
    name: t('network_grid_c5') || 'المردودية',
    comment: '',
    indicators: [
      { name: t('network_grid_c5_i1') || 'انخراط ومشاركة المتعلمين والمتعلمات', level: '' },
      { name: t('network_grid_c5_i2') || 'نشاط المتعلمين: استبصار- تفاعل- إنتاج- إنجاز- إبداع', level: '' },
      { name: t('network_grid_c5_i3') || 'نتائج التقويمات: تشخيصي- تكويني- إجمالي', level: '' },
      { name: t('network_grid_c5_i4') || 'المساهمة في تفعيل أنشطة الرياضة المدرسية', level: '' }
    ]
  },
  {
    id: 'net-6',
    name: t('network_grid_c6') || 'السلوك المهني',
    comment: '',
    indicators: [
      { name: t('network_grid_c6_i1') || 'التواصل المهني المؤسساتي', level: '' },
      { name: t('network_grid_c6_i2') || 'الجاذبية الشخصية: الحضور والهندام', level: '' },
      { name: t('network_grid_c6_i3') || 'الجانب العلائقي مع المتعلمين', level: '' }
    ]
  }
];

interface EvaluationPageProps {
  teacher: Teacher;
  reportType: ReportType;
  inspector: Inspector;
  onSave: (report: SavedReport) => void;
  onCancel: () => void;
  onGoHome: () => void;
  initialData?: SavedReport | null;
  evaluationCriteria: EvaluationCriterion[];
  sportActivities: SportActivities;
  levels: string[];
  ministryLogo: string;
  ministryLogoHeight?: number;
  ministryLogoFr?: string;
  ministryLogoHeightFr?: number;
}

export const EvaluationPage: React.FC<EvaluationPageProps> = ({ 
    teacher, reportType, inspector, onSave, onCancel, onGoHome, initialData, 
    evaluationCriteria, sportActivities, levels, ministryLogo, ministryLogoHeight = 120,
    ministryLogoFr, ministryLogoHeightFr
}) => {
    const { t, language, dir } = useTranslations();
    const [currentReportType, setCurrentReportType] = useState(reportType);
    const [reportLanguage, setReportLanguage] = useState<'ar' | 'fr'>(initialData?.language || (language as 'ar' | 'fr') || 'ar');
    const [reportTemplate, setReportTemplate] = useState<'standard' | 'network'>(initialData?.reportTemplate || 'standard');
    const [observation, setObservation] = useState<LessonObservation>(initialObservationState);
    const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
    const [overallAssessment, setOverallAssessment] = useState<string>(initialData?.overallAssessment || '');
    const [score, setScore] = useState<number | undefined>(undefined);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]); 
    
    // Customization states
    const [reportFontFamily, setReportFontFamily] = useState<string>(initialData?.reportFontFamily || (initialData?.language === 'fr' || reportLanguage === 'fr' ? 'Inter' : 'Cairo'));
    const [reportFontSize, setReportFontSize] = useState<number>(initialData?.reportFontSize || (initialData?.reportTemplate === 'network' || reportTemplate === 'network' ? 11 : 13));
    const [reportLogoScale, setReportLogoScale] = useState<number>(initialData?.reportLogoScale || 100);
    const [reportMarginTop, setReportMarginTop] = useState<number>(initialData?.reportMarginTop || 1);
    const [reportMarginBottom, setReportMarginBottom] = useState<number>(initialData?.reportMarginBottom || 1);
    const [reportMarginSide, setReportMarginSide] = useState<number>(initialData?.reportMarginSide || 1);
    
    // New state to track if changes are saved
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(!initialData);

    // Previous Inspection Editable States
    // Initialize based on whether we are editing or creating new
    // If editing (initialData exists), use the SNAPSHOT stored in the report
    // If new, use the CURRENT teacher data
    const [lastInspectionScore, setLastInspectionScore] = useState<string | number>('');
    const [lastInspectionDate, setLastInspectionDate] = useState<string>('');
    const [lastInspector, setLastInspector] = useState<string>('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isProofreading, setIsProofreading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    
    const ARABIC_FONTS = ["Cairo", "Amiri", "Tajawal", "Almarai"];
    const FRENCH_FONTS = ["Inter", "Roboto", "Lato", "Open Sans"];

    const isInspection = currentReportType === ReportType.INSPECTION;
    const [zoomLevel, setZoomLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const savedZoom = localStorage.getItem(`reportZoomLevel_${currentReportType}`);
            if (savedZoom) {
                return parseInt(savedZoom, 10);
            }
        }
        return isInspection ? 75 : 30;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`reportZoomLevel_${currentReportType}`, zoomLevel.toString());
        }
    }, [zoomLevel, currentReportType]);

    // Ref for scrolling
    const scrollRef = useRef<HTMLDivElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scoreInputRef = useRef<HTMLDivElement>(null);

    // Sync report language with app language if app language changes
    // This addresses the user's issue with the language switch button
    useEffect(() => {
        if (!initialData && language !== reportLanguage) {
            handleLanguageChange(language as 'ar' | 'fr');
        }
    }, [language]);

    // Translation helper for report content
    const reportT = (key: string) => (appTexts as any)[reportLanguage][key] || key;

    useEffect(() => {
        if (initialData) {
            let obs;
            if (initialData.observation) {
                try {
                    obs = typeof initialData.observation === 'string' 
                        ? JSON.parse(initialData.observation) 
                        : initialData.observation;
                } catch (e) {
                    console.error("Failed to parse observation in EvaluationPage", e);
                    obs = null;
                }
            }
            
            let crit;
            if(initialData.criteria) {
                try {
                    crit = typeof initialData.criteria === 'string' 
                        ? JSON.parse(initialData.criteria) 
                        : initialData.criteria;
                } catch(e) {
                    console.error("Failed to parse criteria in EvaluationPage", e);
                    crit = null;
                }
            }
            
            setObservation(obs || initialObservationState);
            const reportT = (key: string) => appTexts[initialData.language || 'ar'][key] || key;
            setCriteria(Array.isArray(crit) ? crit : (initialData.reportTemplate === 'network' ? getNetworkGrid(reportT) : getStandardCriteria(reportT)));
            setCurrentReportType(initialData.reportType);
            setReportDate(initialData.date || new Date().toISOString().split('T')[0]); 
            setReportLanguage(initialData.language || 'ar');
            setReportTemplate(initialData.reportTemplate || 'standard');
            setOverallAssessment(initialData.overallAssessment || '');
            
            // Customization
            setReportFontFamily(initialData.reportFontFamily || (initialData.language === 'fr' ? 'Inter' : 'Cairo'));
            setReportFontSize(initialData.reportFontSize || (initialData.reportTemplate === 'network' ? 11 : 13));
            setReportLogoScale(initialData.reportLogoScale || 100);
            setReportMarginTop(initialData.reportMarginTop || 1);
            setReportMarginBottom(initialData.reportMarginBottom || 1);
            setReportMarginSide(initialData.reportMarginSide || 1);
            
            // LOGIC CHANGE: When editing, use the historical data from the report (the snapshot)
            // fallback to empty string if not present in the snapshot
            setLastInspectionScore(initialData.previousInspectionScore ?? '');
            setLastInspectionDate(initialData.previousInspectionDate ?? '');
            setLastInspector(initialData.previousInspector ?? '');

            if (initialData.reportType === ReportType.INSPECTION) {
                setScore(initialData.score);
            } else {
                setScore(undefined);
            }
            // If we have initial data, we assume it's saved until user touches it
            setHasUnsavedChanges(false);
        } else {
            const reportT = (key: string) => appTexts[reportLanguage][key] || key;
            setObservation(initialObservationState);
            setCriteria(reportTemplate === 'network' ? getNetworkGrid(reportT) : getStandardCriteria(reportT));
            setCurrentReportType(reportType);
            setScore(undefined);
            setReportDate(new Date().toISOString().split('T')[0]);
            setReportTemplate('standard');
            setOverallAssessment('');
            
            // Default Customization for new reports
            setReportFontFamily(reportLanguage === 'fr' ? 'Inter' : 'Cairo');
            setReportFontSize(reportTemplate === 'network' ? 11 : 13);
            setReportLogoScale(100);
            setReportMarginTop(1);
            setReportMarginBottom(1);
            setReportMarginSide(1);
            
            // LOGIC CHANGE: When creating new, use the current teacher data
            setLastInspectionScore(teacher.lastInspectionScore ?? '');
            setLastInspectionDate(teacher.lastInspectionDate ? new Date(teacher.lastInspectionDate).toISOString().split('T')[0] : '');
            setLastInspector(teacher.lastInspector ?? '');
            
            // New report always has "unsaved" changes
            setHasUnsavedChanges(true);
        }
    }, [initialData, reportType, evaluationCriteria, teacher]);

    // Removed useEffect for reportTemplate to prevent overwriting initial data

    const handleLanguageChange = (lang: 'ar' | 'fr') => {
        if (lang === reportLanguage) return;
        const oldLang = reportLanguage;
        setReportLanguage(lang);
        setHasUnsavedChanges(true);
        setReportFontFamily(lang === 'fr' ? 'Inter' : 'Cairo');

        setCriteria(prev => prev.map(c => {
            const oldT = (key: string) => (appTexts as any)[oldLang][key] || key;
            const newT = (key: string) => (appTexts as any)[lang][key] || key;

            const standardKeys = [
               'evaluation_criteria_prep',
               'evaluation_criteria_execution',
               'evaluation_criteria_evaluation',
               'evaluation_criteria_professionalism'
            ];
            
            const matchedStdKey = standardKeys.find(k => c.name.trim() === oldT(k).trim() || c.name.trim() === newT(k).trim());
            if (matchedStdKey) {
                return { ...c, name: newT(matchedStdKey) };
            }

            const allNetworkKeys = Object.keys(appTexts.ar).filter(k => k.startsWith('network_grid_c'));
            const isNetwork = allNetworkKeys.filter(k => !k.includes('_i')).find(key => c.name.trim() === oldT(key).trim() || c.name.trim() === newT(key).trim());
            
            if (isNetwork) {
                const newIndicators = c.indicators?.map(ind => {
                     const isInd = allNetworkKeys.filter(k => k.includes('_i')).find(key => ind.name.trim() === oldT(key).trim() || ind.name.trim() === newT(key).trim());
                     if (isInd) return { ...ind, name: newT(isInd) };
                     return ind;
                });
                return { ...c, name: newT(isNetwork), indicators: newIndicators };
            }

            return c;
        }));
    };

    const handleObservationChange = (field: keyof LessonObservation, value: string) => {
        setObservation(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
        if (field === 'activityCategory') {
            setObservation(prev => ({ ...prev, activity: '' })); 
        }
    };

    const handleCriterionChange = (id: string, field: 'name' | 'comment' | 'achievementLevel', value: string) => {
        setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
        setHasUnsavedChanges(true);
    };

    const handleIndicatorChange = (criterionId: string, indicatorIndex: number, level: string) => {
        setCriteria(prev => prev.map(c => {
            if (c.id === criterionId && c.indicators) {
                const newIndicators = [...c.indicators];
                newIndicators[indicatorIndex] = { ...newIndicators[indicatorIndex], level };
                return { ...c, indicators: newIndicators };
            }
            return c;
        }));
        setHasUnsavedChanges(true);
    };
    
    const handleAddCriterion = () => {
        const newCriterion: EvaluationCriterion = {
            id: crypto.randomUUID(),
            name: '',
            comment: ''
        };
        setCriteria(prev => [...prev, newCriterion]);
        setHasUnsavedChanges(true);
    };

    const handleRemoveCriterion = (id: string) => {
        if (criteria.length > 1) {
            setCriteria(prev => prev.filter(c => c.id !== id));
            setHasUnsavedChanges(true);
        } else {
            alert(t('evaluation_mustHaveOneCriterion'));
        }
    };

    const handleMoveCriterionUp = (index: number) => {
        if (index === 0) return;
        setCriteria(prev => {
            const newCriteria = [...prev];
            const temp = newCriteria[index - 1];
            newCriteria[index - 1] = newCriteria[index];
            newCriteria[index] = temp;
            return newCriteria;
        });
        setHasUnsavedChanges(true);
    };

    const handleMoveCriterionDown = (index: number) => {
        if (index === criteria.length - 1) return;
        setCriteria(prev => {
            const newCriteria = [...prev];
            const temp = newCriteria[index + 1];
            newCriteria[index + 1] = newCriteria[index];
            newCriteria[index] = temp;
            return newCriteria;
        });
        setHasUnsavedChanges(true);
    };

    const processImage = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setObservation(prev => ({ ...prev, lessonPlanImage: dataUrl }));
          setHasUnsavedChanges(true);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processImage(file);
        }
    };

    const removeLessonPlanImage = () => {
      setObservation(prev => {
        const { lessonPlanImage, ...rest } = prev;
        return rest;
      });
      setHasUnsavedChanges(true);
    };

    const handleScoreChange = (value: string) => {
        if (validationError) {
            setValidationError(null);
        }
        setScore(parseFloat(value));
        setHasUnsavedChanges(true);
    };

    const handleGenerateComments = async () => {
        if (!navigator.onLine) {
            setError(t('errorOfflineAI'));
            return;
        }
        
        const localData = loadInitialData();
        const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === '') {
            setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            let promptText = '';
            
            if (reportLanguage === 'fr') {
                promptText = `Vous êtes un inspecteur pédagogique expert en éducation physique et sportive au Maroc. Sur la base des données suivantes (et de l'image du plan de leçon si disponible), rédigez un rapport détaillé et approfondi dans un style administratif et pédagogique formel, en corrigeant les fautes d'orthographe et de grammaire des observations préliminaires. Le rapport doit être en français et inclure une analyse précise ainsi que des recommandations pratiques et constructives pour chaque critère.

**Données de l'évaluation :**

**1. Conditions de réalisation de la séance :**
- Catégorie d'activité : ${observation.activityCategory || 'Non spécifié'}
- Activité adoptée : ${observation.activity || 'Non spécifié'}
- Niveau scolaire : ${observation.level || 'Non spécifié'}
- Classe : ${observation.class || 'Non spécifié'}
- Nombre d'élèves : ${observation.studentCount || 'Non spécifié'}
- Matériel didactique : ${observation.tools || 'Non spécifié'}
- Objectif de la séance : ${observation.lessonGoal || 'Non spécifié'}
`;
                if (currentReportType === ReportType.INSPECTION && score !== undefined && score !== null) {
                    promptText += `
**2. Note numérique proposée :** ${score} / 20. Les observations et recommandations doivent refléter le niveau de cette note.
`;
                }

                promptText += `
**3. Observations préliminaires par critère (utilisez-les comme point de départ) :**
${criteria.map(c => {
    let text = `- ${c.name}: `;
    if (reportTemplate === 'network' && c.indicators) {
        text += `\n  Indicateurs:\n  ` + c.indicators.map(ind => `${ind.name} (Niveau: ${ind.level || 'Non évalué'})`).join('\n  ') + '\n  Observation: ';
    }
    text += `${c.comment || 'Aucune observation préliminaire.'}`;
    return text;
}).join('\n')}

**Instructions :**
Veuillez produire un texte complet pour chaque critère séparément, ${reportTemplate === 'network' ? "d'environ 10 à 15 mots maximum par critère (pour ne pas dépasser l'espace alloué dans le tableau)" : "d'environ 110 mots par critère"}, en tenant compte de toutes les données et en analysant le contenu de l'image du plan de leçon jointe (le cas échéant) pour renforcer les observations. Gardez les noms des critères tels quels dans la sortie. L'analyse doit être cohérente et refléter une vision évaluative globale.${reportTemplate === 'network' ? ' Assurez-vous que les commentaires reflètent les niveaux de réalisation spécifiés pour chaque indicateur du critère de manière très concise. De plus, veuillez fournir une appréciation globale (overallAssessment) d\'environ 60 mots résumant les points forts et les axes d\'amélioration, sans jamais mentionner la note numérique.' : ''}`;

            } else {
                promptText = `أنت مفتش تربوي خبير في مادة التربية البدنية والرياضية بالمغرب. بناءً على المعطيات التالية (وصورة الجذاذة إذا توفرت)، قم بصياغة تقرير مفصل ومعمق بأسلوب إداري وتربوي رسمي، مع تدقيق الملاحظات الأولية لغوياً وإملائياً. يجب أن يكون التقرير باللغة العربية الفصحى، وأن يتضمن تحليلًا دقيقًا وتوصيات عملية وبناءة لكل معيار.

**معطيات التقييم:**

**1. ظروف إنجاز الحصة:**
- صنف النشاط: ${observation.activityCategory || 'غير محدد'}
- النشاط المعتمد: ${observation.activity || 'غير محدد'}
- المستوى الدراسي: ${observation.level || 'غير محدد'}
- القسم: ${observation.class || 'غير محدد'}
- عدد التلاميذ: ${observation.studentCount || 'غير محدد'}
- الأدوات الديداكتيكية: ${observation.tools || 'غير محدد'}
- هدف الحصة: ${observation.lessonGoal || 'غير محدد'}
`;

                if (currentReportType === ReportType.INSPECTION && score !== undefined && score !== null) {
                    promptText += `
**2. النقطة العددية المقترحة:** ${score} / 20. يجب أن تعكس الملاحظات والتوصيات مستوى هذه النقطة.
`;
                }

                promptText += `
**3. الملاحظات الأولية حسب المعايير (استخدمها كنقطة انطلاق):**
${criteria.map(c => {
    let text = `- ${c.name}: `;
    if (reportTemplate === 'network' && c.indicators) {
        text += `\n  المؤشرات:\n  ` + c.indicators.map(ind => `${ind.name} (مستوى الإنجاز: ${ind.level || 'غير مقيم'})`).join('\n  ') + '\n  الملاحظة: ';
    }
    text += `${c.comment || 'لا توجد ملاحظات أولية.'}`;
    return text;
}).join('\n')}

**التعليمات:**
الرجاء إنتاج نص متكامل لكل معيار على حدة، مع الأخذ بعين الاعتبار جميع المعطيات وتحليل محتوى صورة الجذاذة المرفقة (إن وجدت) لتعزيز الملاحظات. حافظ على أسماء المعايير كما هي في المخرجات. يجب أن يكون التحليل متماسكا ويعكس رؤية تقييمية شاملة.
${reportTemplate === 'network' ? `
التزم بحدود الكلمات التالية لكل معيار بدقة لكي لا يتجاوز المساحة المخصصة له في الجدول:
- الشروط المادية والتنظيمية: 21 كلمة كحد أقصى (حوالي 3 أسطر)
- القدرة على التنظيم والتخطيط: 49 كلمة كحد أقصى
- إنجاز الأعمال المرتبطة بالوظيفة: 49 كلمة كحد أقصى
- البحث والابتكار: 21 كلمة كحد أقصى (حوالي 3 أسطر)
- المردودية: 28 كلمة كحد أقصى
- السلوك المهني: 21 كلمة كحد أقصى (حوالي 3 أسطر)
تأكد من أن الملاحظات تعكس مستويات الإنجاز المحددة لكل مؤشر ضمن المعيار بشكل مختصر جدا.
الرجاء تقديم تقدير إجمالي (overallAssessment) في حدود 24 كلمة يلخص نقاط القوة ومجالات التحسين للأستاذ، دون الإشارة بتاتاً إلى النقطة العددية.` : 'الرجاء جعل كل فقرة خاصة بمعيار معين في حدود 110 كلمات تتضمن تحليلاً عميقاً وتوجيهات دقيقة.'}`;
            }

            const parts: any[] = [{ text: promptText }];

            if (observation.lessonPlanImage) {
                const base64Data = observation.lessonPlanImage.split(',')[1];
                if (base64Data) {
                    parts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    });
                }
            }

            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: { parts: parts },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    report: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          criterionName: {
                            type: Type.STRING,
                            description: reportLanguage === 'fr' ? "Nom du critère original." : "اسم المعيار الأصلي."
                          },
                          detailedComment: {
                            type: Type.STRING,
                            description: reportLanguage === 'fr' ? "Le paragraphe détaillé et approfondi pour le critère, incluant l'analyse et les recommandations." : "الفقرة المفصلة والمعمقة للمعيار، متضمنةً التحليل والتوصيات."
                          }
                        },
                        required: ["criterionName", "detailedComment"]
                      }
                    },
                    overallAssessment: {
                      type: Type.STRING,
                      description: reportLanguage === 'fr' ? "L'appréciation globale pour l'enseignant (24 mots max)." : "التقدير الإجمالي للأستاذ (في حدود 24 كلمة كحد أقصى)."
                    }
                  },
                  required: ["report"]
                }
              }
            });

            const jsonString = response.text;
            if (jsonString) {
              const parsedResult = JSON.parse(jsonString);
              if (parsedResult && parsedResult.report && Array.isArray(parsedResult.report)) {
                  const newCriteria = criteria.map(originalCriterion => {
                      const found = parsedResult.report.find((c: any) => c.criterionName === originalCriterion.name);
                      return found ? { ...originalCriterion, comment: found.detailedComment } : originalCriterion;
                  });
                  setCriteria(newCriteria);
                  
                  if (reportTemplate === 'network' && parsedResult.overallAssessment) {
                      setOverallAssessment(parsedResult.overallAssessment);
                  }
                  
                  setHasUnsavedChanges(true);
              }
            }

        } catch (e: any) {
            let errorMsg = `${t('otherReports_rephraseError')}: ${e.message}`;
            if (e.message && (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED'))) {
                errorMsg = "تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي حالياً (Quota Exceeded). يرجى المحاولة مرة أخرى بعد دقيقة.";
            }
            setError(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleProofread = async () => {
        if (!navigator.onLine) {
            setError(t('errorOfflineAI'));
            return;
        }
        
        const localData = loadInitialData();
        const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === '') {
            setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
            return;
        }

        setIsProofreading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            const overallAssessmentLabel = reportLanguage === 'fr' ? 'Appréciation globale' : 'التقدير الإجمالي';
            
            // Collect all text to proofread
            const textsToProofread = [
                ...criteria.map(c => `[${c.name}]: ${c.comment}`),
                overallAssessment ? `[${overallAssessmentLabel}]: ${overallAssessment}` : ''
            ].filter(t => t.trim() !== '').join('\n\n');

            if (!textsToProofread || textsToProofread.trim() === '') {
                setError(reportLanguage === 'fr' ? "Aucun texte à corriger." : "لا يوجد نص للتدقيق.");
                setIsProofreading(false);
                return;
            }

            const prompt = reportLanguage === 'fr' ? `
                En tant qu'expert en langue française et en révision pédagogique, corrigez les textes suivants en rectifiant les fautes d'orthographe et de grammaire, et en améliorant le style pour qu'il soit plus académique et professionnel.
                
                Textes à corriger :
                ${textsToProofread}
                
                Instructions importantes :
                1. Gardez la même structure (utilisez les titres entre crochets comme [Nom du critère]).
                2. Ne changez pas le sens fondamental des observations.
                3. Renvoyez uniquement le texte corrigé dans le même format.
                4. N'écrivez aucune introduction ou conclusion.
            ` : `
                بصفتك خبيراً في اللغة العربية والتدقيق اللغوي التربوي، قم بتدقيق النصوص التالية وتصحيح الأخطاء الإملائية والنحوية وتحسين الأسلوب ليصبح أكثر أكاديمية ومهنية.
                
                النصوص المراد تدقيقها:
                ${textsToProofread}
                
                تعليمات هامة:
                1. حافظ على نفس الهيكل (استخدم العناوين بين الأقواس المربعة مثل [اسم المعيار]).
                2. لا تغير المعنى الأساسي للملاحظات.
                3. أعد النص المصحح فقط بنفس التنسيق.
                4. لا تكتب أي مقدمات أو خاتمات.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            const correctedText = response.text || "";
            
            // Parse the corrected text and update state
            const newCriteria = [...criteria];
            let newOverallAssessment = overallAssessment;

            const lines = correctedText.split('\n');
            let currentSection = '';
            let currentContent = '';

            const updateSection = () => {
                if (currentSection) {
                    if (currentSection === overallAssessmentLabel) {
                        newOverallAssessment = currentContent.trim();
                    } else {
                        const criterionIndex = newCriteria.findIndex(c => c.name === currentSection);
                        if (criterionIndex !== -1) {
                            newCriteria[criterionIndex].comment = currentContent.trim();
                        }
                    }
                }
            };

            lines.forEach(line => {
                const match = line.match(/^\[(.*?)\]:\s*(.*)/);
                if (match) {
                    updateSection();
                    currentSection = match[1];
                    currentContent = match[2];
                } else {
                    currentContent += (currentContent ? '\n' : '') + line;
                }
            });
            updateSection();

            setCriteria(newCriteria);
            setOverallAssessment(newOverallAssessment);
            setHasUnsavedChanges(true);

        } catch (e: any) {
            let errorMsg = reportLanguage === 'fr' ? `Erreur de correction : ${e.message}` : `خطأ في التدقيق: ${e.message}`;
            if (e.message && (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED'))) {
                errorMsg = reportLanguage === 'fr' ? "Quota dépassé pour l'IA. Veuillez réessayer dans une minute." : "تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي حالياً. يرجى المحاولة مرة أخرى بعد دقيقة.";
            }
            setError(errorMsg);
        } finally {
            setIsProofreading(false);
        }
    };

    const handleGenerateOverallAssessment = async () => {
        if (!navigator.onLine) {
            setError(t('errorOfflineAI'));
            return;
        }
        
        const localData = loadInitialData();
        const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === '') {
            setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            let promptText = '';
            
            if (reportLanguage === 'fr') {
                promptText = `Vous êtes un inspecteur pédagogique expert en éducation physique et sportive au Maroc. Sur la base des données suivantes, rédigez une appréciation globale (التقدير الإجمالي) pour l'enseignant. Le rapport doit être en français et inclure une conclusion générale sur la performance de l'enseignant.

**Données de l'évaluation :**
- Catégorie d'activité : ${observation.activityCategory || 'Non spécifié'}
- Activité adoptée : ${observation.activity || 'Non spécifié'}
- Niveau scolaire : ${observation.level || 'Non spécifié'}
- Objectif de la séance : ${observation.lessonGoal || 'Non spécifié'}
`;

                promptText += `\n**Critères et Indicateurs :**\n`;
                criteria.forEach(c => {
                    promptText += `- ${c.name}:\n`;
                    if (c.indicators) {
                        c.indicators.forEach(ind => {
                            promptText += `  * ${ind.name} : ${ind.level || 'Non évalué'}\n`;
                        });
                    }
                    promptText += `  Observation : ${c.comment || 'Aucune observation'}\n`;
                });

                promptText += `\n**Instructions :**
Veuillez produire un paragraphe de conclusion générale (environ 24 mots) résumant les points forts et les axes d'amélioration de l'enseignant, en vous basant sur les niveaux de réalisation des indicateurs et les observations notées. Ne mentionnez en aucun cas la note numérique.`;

            } else {
                promptText = `أنت مفتش تربوي خبير في مادة التربية البدنية والرياضية بالمغرب. بناءً على المعطيات التالية، قم بصياغة التقدير الإجمالي للأستاذ بأسلوب إداري وتربوي رسمي. يجب أن يكون التقرير باللغة العربية الفصحى، وأن يتضمن خلاصة عامة حول أداء الأستاذ.

**معطيات التقييم:**
- صنف النشاط: ${observation.activityCategory || 'غير محدد'}
- النشاط المعتمد: ${observation.activity || 'غير محدد'}
- المستوى الدراسي: ${observation.level || 'غير محدد'}
- هدف الحصة: ${observation.lessonGoal || 'غير محدد'}
`;

                promptText += `\n**المعايير والمؤشرات:**\n`;
                criteria.forEach(c => {
                    promptText += `- ${c.name}:\n`;
                    if (c.indicators) {
                        c.indicators.forEach(ind => {
                            promptText += `  * ${ind.name}: ${ind.level || 'غير مقيم'}\n`;
                        });
                    }
                    promptText += `  الملاحظة: ${c.comment || 'لا توجد ملاحظات'}\n`;
                });

                promptText += `\n**التعليمات:**
الرجاء إنتاج فقرة خلاصة عامة (في حدود 24 كلمة) تلخص نقاط القوة ومجالات التحسين للأستاذ، بناءً على مستويات إنجاز المؤشرات والملاحظات المدونة. يمنع منعاً باتاً الإشارة إلى النقطة العددية في هذا التقدير.`;
            }

            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: promptText,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    overallAssessment: {
                      type: Type.STRING,
                      description: reportLanguage === 'fr' ? "L'appréciation globale pour l'enseignant." : "التقدير الإجمالي للأستاذ."
                    }
                  },
                  required: ["overallAssessment"]
                }
              }
            });

            const jsonString = response.text;
            if (jsonString) {
              const parsedResult = JSON.parse(jsonString);
              if (parsedResult && parsedResult.overallAssessment) {
                  setOverallAssessment(parsedResult.overallAssessment);
                  setHasUnsavedChanges(true);
              }
            }

        } catch (e: any) {
            let errorMsg = `${t('otherReports_rephraseError')}: ${e.message}`;
            if (e.message && (e.message.includes('429') || e.message.includes('Quota') || e.message.includes('RESOURCE_EXHAUSTED'))) {
                errorMsg = "تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي حالياً (Quota Exceeded). يرجى المحاولة مرة أخرى بعد دقيقة.";
            }
            setError(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const validateScore = (): boolean => {
        if (currentReportType === ReportType.INSPECTION && (score === undefined || score === null || isNaN(score))) {
            const errorMsg = t('evaluation_scoreRequired');
            setValidationError(errorMsg);
            if (scoreInputRef.current) {
                scoreInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        setValidationError(null);
        return true;
    };
    
    const handleSaveReport = () => {
        if (!validateScore()) return;

        const reportToSave: SavedReport = {
            ...(initialData || {}),
            id: initialData?.id || Date.now().toString(),
            teacherId: teacher.id,
            teacherName: teacher.fullName,
            date: reportDate, 
            reportType: currentReportType,
            language: reportLanguage,
            reportTemplate: reportTemplate,
            observation,
            criteria,
            overallAssessment: reportTemplate === 'network' ? overallAssessment : undefined,
            score: currentReportType === ReportType.INSPECTION ? score : undefined,
            previousInspectionScore: lastInspectionScore !== '' ? Number(lastInspectionScore) : null,
            previousInspectionDate: lastInspectionDate || null,
            previousInspector: lastInspector || null,
            reportFontFamily,
            reportFontSize,
            reportLogoScale,
            reportMarginTop,
            reportMarginBottom,
            reportMarginSide
        };
        onSave(reportToSave);
        setHasUnsavedChanges(false);
    };

    const reportTypeLabel = isInspection ? t('inspectionReport') : t('visitReport');

    const reportTranslations = {
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
            teacher: "الأستاذ",
            network_domains: "المجالات",
            network_indicators: "المؤشرات",
            network_achievementLevel: "مستوى الإنجاز",
            network_observations: "الملاحظات والتوجيهات",
            overallAssessment: "التقدير الإجمالي",
            notEvaluated: "غير مقيم",
            achievementLevel_1: 'ينبغي الأشتغال عليه',
            achievementLevel_2: 'لا بأس بها',
            achievementLevel_3: 'جيد',
            achievementLevel_4: 'ممتاز',
            achievementLevel_none: 'غير متوفر'
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
            signature_regionalDirector: "Signature du Directeur Provincial",
            signature_institutionDirector: "Signature du Directeur de l'établissement",
            teacher: "Enseignant",
            network_domains: "Domaines",
            network_indicators: "Indicateurs",
            network_achievementLevel: "Niveau de réalisation",
            network_observations: "Observations et orientations",
            overallAssessment: "Appréciation globale",
            notEvaluated: "Non évalué",
            achievementLevel_1: "Non maîtrisé",
            achievementLevel_2: "En cours d'acquisition",
            achievementLevel_3: "Maîtrisé",
            achievementLevel_4: "Maîtrisé avec distinction",
            achievementLevel_none: "N/A"
        }
    };

    const getReportHtml = () => {
        const direction = reportLanguage === 'ar' ? 'rtl' : 'ltr';
        const fontFamily = reportFontFamily || (reportLanguage === 'ar' ? 'Cairo' : 'Inter');
        const rt = reportTranslations[reportLanguage];
        
        const currentReportTypeLabel = isInspection ? (rt.inspection_report_title || rt.inspectionReport) : (rt.visit_report_title || rt.visitReport);
        
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

        const lastScore = lastInspectionScore !== '' ? lastInspectionScore : '';
        const lastDate = lastInspectionDate ? formatDate(lastInspectionDate) : '';
        const lastInspectorStr = lastInspector || '';

        const isNetwork = reportTemplate === 'network';
        const overallFontSize = '1em';
        const dateScoreFontSize = '0.9em';
        const sigFontSize = '0.9em';

        const currentLogo = (reportLanguage === 'fr' && ministryLogoFr) ? ministryLogoFr : ministryLogo;
        const baseHeight = (reportLanguage === 'fr' && ministryLogoHeightFr) ? ministryLogoHeightFr : ministryLogoHeight;
        const currentLogoHeight = baseHeight * (reportLogoScale / 100);

        const headerHtml = `
          <table style="width: 100%; margin-bottom: 0.5rem; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; vertical-align: middle;">
            <img src="${currentLogo}" alt="${rt.ministryLogoAlt}" style="height: ${currentLogoHeight * 1.26}px; width: auto; max-width: 100%; object-fit: contain;" />
              </td>
              <td style="width: 50%; text-align: ${reportLanguage === 'ar' ? 'left' : 'right'}; vertical-align: middle;">
                <table style="width: 320px; border-collapse: collapse; float: ${reportLanguage === 'ar' ? 'left' : 'right'};">
                  <tr>
                    <td style="background-color: #f2f2f2; border: 1.5px solid #000; padding: 12px; text-align: center; vertical-align: middle;">
                      <span style="font-size: ${18/11}em; font-weight: bold; margin: 0; color: #000; text-transform: uppercase;">${escapeHtml(currentReportTypeLabel)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-top: 5px;">
                      <span style="font-size: 1.1em; font-weight: bold;">${escapeHtml(teacher.institution)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
    
        const reportDateForDisplay = formatDate(reportDate);

        const teacherInfoHtml = `
        <div style="margin-top: 0.2rem;">
            <table style="width: 100%; border-collapse: collapse; background-color: #f2f2f2;">
                <tr>
                    <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${12/11}em; vertical-align: middle; line-height: 1.3;">${rt.teacherDetail_infoCardTitle}</td>
                </tr>
            </table>
            <div style="border: 1px solid #ddd; border-top: none; padding: 0.2rem;">
                <table style="width: 100%; border-collapse: collapse; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'}; font-size: inherit;">
                    <tbody>
                        <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_fullName}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.fullName)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_subject}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(reportT(teacher.subject))}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_lastScore}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastScore)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_employeeId}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.employeeId)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_grade}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(reportT(String(teacher.grade)) || String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', ''))}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_lastDate}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastDate)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_framework}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 25%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(reportT(teacher.framework))}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 12%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_rank}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 18%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(teacher.rank)}</td>
                        <td style="padding: 4px 0.2rem; line-height: 1.3; font-weight: bold; width: 15%; white-space: nowrap; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${rt.teacher_lastInspector}:</td>
                        <td style="padding: 4px 0.5rem; line-height: 1.3; width: 15%; vertical-align: middle; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">${escapeHtml(lastInspectorStr)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
          
        const observationHtml = `
          <div style="margin-top: 0.2rem;">
              <table style="width: 100%; border-collapse: collapse; background-color: #f2f2f2;">
                  <tr>
                      <td style="padding: 5.4px 4px; text-align: center; font-weight: bold; border: 1px solid #ddd; font-size: ${12/11}em; vertical-align: middle; line-height: 1.3;">${rt.reportModal_lessonObservation}</td>
                  </tr>
              </table>
              <div style="border: 1px solid #ddd; border-top: none;">
                  <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: inherit;">
                    <tr style="background-color: #e0e0e0;">
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_activityCategory}</th>
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_activity}</th>
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_level}</th>
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_class}</th>
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_studentCount}</th>
                        <th style="padding: 5px 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${rt.evaluation_field_tools}</th>
                    </tr>
                    <tr>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(reportT(observation.activityCategory))}</td>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(reportT(observation.activity))}</td>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(reportT(observation.level))}</td>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(observation.class)}</td>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(observation.studentCount)}</td>
                        <td style="padding: 4px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.3;">${escapeHtml(observation.tools)}</td>
                    </tr>
                  </table>
                  <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #ddd; font-size: inherit;">
                      <tr>
                        <td style="background-color: #f2f2f2; padding: 6px 4px; text-align: center; font-weight: bold; border-right: 1px solid #ddd; width: 20%; vertical-align: middle; line-height: 1.3;">${rt.evaluation_field_lessonGoal} :</td>
                        <td style="padding: 6px 4px; text-align: center; vertical-align: middle; line-height: 1.3;">${escapeHtml(observation.lessonGoal).replace(/\n/g, '<br />')}</td>
                      </tr>
                  </table>
              </div>
          </div>`;
        
    
        const getAchievementLevelText = (level: string) => {
            switch (level) {
                case '3': return rt.achievementLevel_3 || 'جيد';
                case '2': return rt.achievementLevel_2 || 'لا بأس بها';
                case '1': return rt.achievementLevel_1 || 'ينبغي الأشتغال عليه';
                case '0': return rt.achievementLevel_none || 'غير متوفر';
                default: return level || rt.notEvaluated || (reportLanguage === 'ar' ? 'غير مقيم' : 'Non évalué');
            }
        };

        let criteriaHtml = '';
        if (reportTemplate === 'network') {
            criteriaHtml = `
            <div style="margin-top: 0.5rem; text-align: ${reportLanguage === 'ar' ? 'right' : 'left'};">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; line-height: 1.2;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 10px 6px; border: 1px solid #ccc; width: 15%; vertical-align: middle; text-align: center; line-height: 1.2;">${rt.network_domains}</th>
                            <th style="padding: 10px 6px; border: 1px solid #ccc; width: 35%; vertical-align: middle; text-align: center; line-height: 1.2;">${rt.network_indicators}</th>
                            <th style="padding: 10px 6px; border: 1px solid #ccc; width: 15%; vertical-align: middle; text-align: center; line-height: 1.2;">${rt.network_achievementLevel}</th>
                            <th style="padding: 10px 6px; border: 1px solid #ccc; width: 35%; vertical-align: middle; text-align: center; line-height: 1.2;">${rt.network_observations}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criteria.map((c: EvaluationCriterion) => {
                            const indicators = c.indicators || [];
                            const rowSpan = indicators.length > 0 ? indicators.length : 1;
                            
                            if (indicators.length === 0) {
                                return `
                                <tr>
                                    <td style="padding: 8px 6px; border: 1px solid #ccc; font-weight: bold; vertical-align: middle; text-align: center; line-height: 1.2;">${escapeHtml(c.name)}</td>
                                    <td style="padding: 8px 6px; border: 1px solid #ccc; vertical-align: middle; text-align: center; line-height: 1.2;">-</td>
                                    <td style="padding: 8px 6px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.2;">-</td>
                                    <td style="padding: 8px 6px; border: 1px solid #ccc; text-align: center; vertical-align: middle; line-height: 1.2;">${escapeHtml(c.comment.trim()).replace(/\n/g, '<br />')}</td>
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
                ${criteria.map((c: EvaluationCriterion) => `
                    <div style="margin-bottom: 0.5rem;">
                        <p style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 1.1em; margin-bottom: 0.5rem;">${escapeHtml(c.name)}</p>
                        <div style="padding: 0.4rem; min-height: 40px; white-space: pre-wrap; text-align: justify; text-indent: 1.5em;">${escapeHtml(c.comment).replace(/\n/g, '<br />') || '<br/>'}</div>
                    </div>
                    `).join('')}
            </div>`;
        }
        
        const overallAssessmentHtml = reportTemplate === 'network' && overallAssessment ? `
          <div style="margin-top: 0.5rem; border: 1px solid #ddd; padding: 0.3rem; background-color: #fafafa; font-size: ${overallFontSize};">
            <p style="font-weight: bold; margin-bottom: 0.2rem;">${rt.overallAssessment} :</p>
            <div style="white-space: pre-wrap; text-align: justify; text-indent: 1.5em; line-height: 1.2;">${escapeHtml(overallAssessment).replace(/\n/g, '<br />')}</div>
          </div>
        ` : '';

        const dateLabel = rt.report_dateLabel;

        const scoreLine = isInspection && score != null ? `
            <span style="font-weight: bold; margin-right: 1rem; margin-left: 1rem; display: inline-block; white-space: nowrap;">
                <strong>${rt.reportModal_newScore}:</strong> <span dir="ltr" style="unicode-bidi: isolate;">${score} / 20</span>
            </span>
        ` : '';

        const dateAndScoreHtml = `
          <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #ccc; page-break-inside: avoid; text-align: ${reportLanguage === 'ar' ? 'left' : 'right'}; font-size: ${dateScoreFontSize};">
            <p style="margin-bottom: 0.2rem; white-space: nowrap;">
              <strong>${dateLabel}:</strong> ${reportDateForDisplay}
              ${scoreLine}
            </p>
          </div>
        `;
    
        const regionalDirectorTitle = t(inspector.regionalDirectorTitle || 'المدير الإقليمي');
        const signatureRegionalDirector = rt.signature_regionalDirector.replace('{regionalDirectorTitle}', regionalDirectorTitle);

        const signaturesHtml = `
          <div style="margin-top: 1rem; padding-top: 0.5rem; text-align: right; font-size: ${sigFontSize}; page-break-inside: avoid;">
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
              <tr>
                <td style="width: 25%; vertical-align: middle;"><strong>${rt.signature_title_1}</strong></td>
                <td style="width: 25%; vertical-align: middle;"><strong>${signatureRegionalDirector}</strong></td>
                <td style="width: 25%; vertical-align: middle;"><strong>${rt.signature_institutionDirector}</strong></td>
                <td style="width: 25%; vertical-align: middle;"><strong>${rt.teacher}</strong></td>
              </tr>
              <tr>
                <td style="padding-top: 4rem;"></td>
                <td style="padding-top: 4rem;"></td>
                <td style="padding-top: 4rem;"></td>
                <td style="padding-top: 4rem;"></td>
              </tr>
            </table>
          </div>`;
          
        const bodyContent = `<div class="report-body" style="font-size: ${reportFontSize}pt;">${headerHtml}${teacherInfoHtml}${observationHtml}${criteriaHtml}${overallAssessmentHtml}${dateAndScoreHtml}${signaturesHtml}</div>`;
    
        return `
          <html lang="${reportLanguage}" dir="${direction}">
          <head>
              <meta charset="UTF-8">
              <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700&family=Almarai:wght@400;700&family=Inter:wght@400;500;600&family=Roboto:wght@400;500&family=Lato:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
          </head>
          <body>
              <style>
                  @page {
                      margin: ${reportMarginTop}cm ${reportMarginSide}cm ${reportMarginBottom}cm ${reportMarginSide}cm;
                  }
                  body, .report-body { 
                      direction: ${direction}; 
                      font-family: '${fontFamily}', sans-serif; 
                      line-height: ${reportTemplate === 'network' ? '1.3' : '1.5'}; 
                      font-size: ${reportFontSize}pt;
                      background-color: white;
                      color: black;
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                      width: 100%;
                  } 
                  p { white-space: pre-wrap; margin: 0; }
                  table { border-spacing: 0; width: 100%; border-collapse: collapse; table-layout: fixed; }
                  th, td { vertical-align: middle !important; padding: ${reportTemplate === 'network' ? '4px' : '6px'} !important; border: 1px solid #ccc; word-wrap: break-word; }
                  .info-table td { border: none !important; }
              </style>
              ${bodyContent}
          </body>
          </html>`;
    };

    const handlePrint = () => {
        if (hasUnsavedChanges) return;
        if (!validateScore()) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(getReportHtml());
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
        if (hasUnsavedChanges) return;
        if (!validateScore()) return;

        const fullHtml = getReportHtml();
        const bodyContent = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;
        const fontFamily = language === 'ar' ? "'Sakkal Majalla', Arial, sans-serif" : "'Times New Roman', Times, serif";

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${language}">
            <head>
                <meta charset='utf-8'>
                <title>${reportTypeLabel}</title>
                <style>
                    body { font-family: ${fontFamily}; direction: ${dir}; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: ${reportTemplate === 'network' ? '11pt' : '14pt'}; line-height: ${reportTemplate === 'network' ? '1.4' : '1.5'}; }
                    table { border-collapse: collapse; width: 100%; border: none; }
                    th, td { border: none; padding: 6px; vertical-align: middle; }
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
            await exportFile(docxBlob, `${reportTypeLabel} - ${teacher.fullName}.doc`);
        } catch (error) {
            console.error('Error generating DOCX:', error);
            alert('حدث خطأ أثناء إنشاء ملف Word.');
        }
    };
    
    const handleExportExcel = async () => {
        if (hasUnsavedChanges) return;
        if (!validateScore()) return;
        if (typeof window.XLSX === 'undefined') {
            alert(t('errorExportLibrary'));
            return;
        }
        let data: (string | number | null)[][] = [];
    
        if (inspector.regionalAcademy) data.push([`${t('regionalAcademyLabel')} ${inspector.regionalAcademy}`]);
        if (inspector.regionalDirectorate) data.push([`${t('regionalDirectorateLabel')} ${inspector.regionalDirectorate}`]);
        data.push([reportTypeLabel]);
    
        data.push([], [t('teacherDetail_infoCardTitle')]);
        data.push(
            [t('teacher_fullName'), teacher.fullName],
            [t('teacher_employeeId'), teacher.employeeId],
            [t('teacher_institution'), teacher.institution],
            [t('teacher_framework'), teacher.framework],
            [t('teacher_subject'), teacher.subject],
            [t('teacher_grade'), String(teacher.grade).replace('الدرجة ', '').replace('الدرجة', '')],
            [t('teacher_rank'), teacher.rank],
        );
        data.push([], [t('addTeacherModal_lastInspectionTitle')]);
        data.push(
            [t('teacher_lastScore'), lastInspectionScore || ''],
            [t('teacher_lastDate'), lastInspectionDate || ''],
            [t('teacher_lastInspector'), lastInspector],
        );
    
        data.push([], [t('reportModal_lessonObservation')]);
        data.push(
            [t('evaluation_field_activityCategory'), observation.activityCategory],
            [t('evaluation_field_activity'), observation.activity],
            [t('evaluation_field_level'), observation.level],
            [t('evaluation_field_class'), observation.class],
            [t('evaluation_field_studentCount'), observation.studentCount],
            [t('evaluation_field_tools'), observation.tools],
            [t('evaluation_field_lessonGoal'), observation.lessonGoal]
        );
    
        data.push([], [t('reportModal_criteria')]);
        criteria.forEach((c: EvaluationCriterion) => {
            data.push([c.name], [c.comment]);
        });
        
        if (isInspection && score != null) {
            data.push([], [t('reportModal_newScore')], [`${score} / 20`]);
        }
    
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        ws['!RTL'] = language === 'ar';
        ws['!cols'] = [{ wch: 25 }, { wch: 100 }];
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, t('report'));
        
        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        
        await exportFile(blob, `${reportTypeLabel} - ${teacher.fullName}.xlsx`);
    };

    const generatePdfBlob = async (): Promise<Blob | null> => {
        if (hasUnsavedChanges) return null;
        if (!validateScore()) return null;
        const fullHtml = getReportHtml();
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            alert(t('errorExportLibrary'));
            return null;
        }

        const { jsPDF } = window.jspdf;

        // Create an isolated iframe to prevent parent CSS from interfering
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = '794px'; // A4 width at 96 DPI
        iframe.style.border = 'none';
        iframe.style.backgroundColor = '#ffffff';
        document.body.appendChild(iframe);

        try {
            const doc = iframe.contentWindow?.document;
            if (!doc) throw new Error("Iframe document not accessible");

            // Force strict layout to prevent any content from stretching the container
            const styleFix = `<style>
                body { margin: 0 !important; padding: 20px !important; width: 794px !important; box-sizing: border-box !important; }
                * { max-width: 100% !important; box-sizing: border-box !important; }
                table { table-layout: fixed !important; width: 100% !important; word-wrap: break-word !important; }
                td, th { white-space: normal !important; overflow-wrap: break-word !important; }
                tr { page-break-inside: avoid; }
            </style>`;
            
            doc.open();
            doc.write(fullHtml.replace('<body>', '<body>' + styleFix));
            doc.close();

            // Ensure the document has content before proceeding
            if (!doc.body || doc.body.innerText.trim().length === 0 && doc.body.querySelectorAll('img, table, div').length === 0) {
                throw new Error("Document body is empty, cannot generate PDF");
            }

            // Wait a brief moment for any fonts/images to render
            await new Promise(resolve => setTimeout(resolve, 800));

            const canvas = await window.html2canvas(doc.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 794,
                width: 794
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pdfWidth - 20; // 10mm margin
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const isNetwork = reportTemplate === 'network';
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
        } catch (error) {
            console.error('Error generating PDF:', error);
            return null;
        } finally {
            document.body.removeChild(iframe);
        }
    };
    
    const handleExportPdf = async () => {
        if (hasUnsavedChanges) return;
        const pdfBlob = await generatePdfBlob();
        if (pdfBlob) {
            await exportFile(pdfBlob, `${reportTypeLabel} - ${teacher.fullName}.pdf`);
        }
    };
    
    const handleExportHtml = async () => {
        if (hasUnsavedChanges) return;
        if (!validateScore()) return;
        const fullHtml = getReportHtml();
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        await exportFile(blob, `${reportTypeLabel} - ${teacher.fullName}.html`);
    };

    const handleShare = async () => {
        if (hasUnsavedChanges) return;
        try {
            const pdfBlob = await generatePdfBlob();
            if (!pdfBlob) return;

            const reportFileName = `${reportTypeLabel} - ${teacher.fullName}.pdf`;
            await exportFile(pdfBlob, reportFileName);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const fullHtml = getReportHtml();
    const reportBodyHtml = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || fullHtml;

    // Common button classes for disabled state
    const exportBtnClass = (color: string) => `btn p-0 h-10 w-10 justify-center transition-all ${
        hasUnsavedChanges 
        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60 grayscale' 
        : `${color} text-white hover:brightness-110 shadow-sm`
    }`;

    return (
    <div className="container mx-auto p-4 md:p-6" dir={dir}>
        {isGenerating && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex flex-col justify-center items-center p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl flex flex-col items-center text-center max-w-xs w-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                    <h3 className="text-lg font-bold text-sky-700 dark:text-sky-400 mb-2">{t('evaluation_generatingAI')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('evaluation_draftingAI')}</p>
                </div>
            </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*"/>
        <input type="file" ref={cameraInputRef} onChange={handleImageChange} className="hidden" accept="image/*" capture="environment" />
        
        <PageHeader
            title={
                <div className="flex items-center gap-4">
                     <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700">
                        <i className="fas fa-home"></i>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold">
                        <span className="text-emerald-500">{initialData ? reportT('editReport') : reportT('reportsList_newReport')}:</span>
                        <span className="text-[rgb(var(--color-text-base))]"> {teacher.fullName}</span>
                    </h1>
                </div>
            }
            actions={
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isInspection ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'}`}>
                        {reportTypeLabel}
                    </span>
                    <select 
                        value={currentReportType} 
                        onChange={(e) => { setCurrentReportType(e.target.value as ReportType); setHasUnsavedChanges(true); }}
                        className="input-style p-1 text-sm rounded-md"
                    >
                        <option value={ReportType.VISIT}>{reportT('visit')}</option>
                        <option value={ReportType.INSPECTION}>{reportT('inspection')}</option>
                    </select>
                    <select 
                        value={reportTemplate} 
                        onChange={(e) => { 
                            const newTemplate = e.target.value as 'standard' | 'network';
                            setReportTemplate(newTemplate); 
                            const currentReportT = (key: string) => appTexts[reportLanguage][key] || key;
                            if (newTemplate === 'network' && (!criteria.length || !criteria[0].indicators)) {
                                setCriteria(getNetworkGrid(currentReportT));
                            } else if (newTemplate === 'standard' && criteria.length > 0 && criteria[0].indicators) {
                                setCriteria(getStandardCriteria(currentReportT));
                            }
                            setHasUnsavedChanges(true); 
                        }}
                        className="input-style p-1 text-sm rounded-md border-amber-300 bg-amber-50 text-amber-900"
                    >
                        <option value="standard">{reportT('reportTemplate_standard') || 'التقرير الوصفي'}</option>
                        <option value="network">{reportT('reportTemplate_network') || 'تقرير شبكة المفتشية'}</option>
                    </select>
                </div>
            }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                
                <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))]">
                    <h2 className="text-base font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-2 mb-4">{reportT('evaluation_previousInspectionData')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('teacher_lastScore')}</label>
                            <input 
                                type="number" 
                                value={typeof lastInspectionScore === 'number' && Number.isNaN(lastInspectionScore) ? '' : lastInspectionScore} 
                                onChange={(e) => { setLastInspectionScore(e.target.value); setHasUnsavedChanges(true); }} 
                                className="input-style w-full"
                                placeholder="مثال: 18"
                                step="0.25"
                                min="0"
                                max="20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('teacher_lastDate')}</label>
                            <input 
                                type="date" 
                                value={lastInspectionDate} 
                                onChange={(e) => { setLastInspectionDate(e.target.value); setHasUnsavedChanges(true); }} 
                                className="input-style w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('teacher_lastInspector')}</label>
                            <input 
                                type="text" 
                                value={lastInspector} 
                                onChange={(e) => { setLastInspector(e.target.value); setHasUnsavedChanges(true); }} 
                                className="input-style w-full"
                                placeholder={reportT('teacher_lastInspector')}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))]">
                    <h2 className="text-base font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-2 mb-4">{reportT('reportModal_lessonObservation')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       <div className="md:col-span-2 bg-[rgb(var(--color-background))] p-3 rounded-lg border border-[rgb(var(--color-border))]">
                            <label className="block text-sm font-bold text-[rgb(var(--color-text-muted))] mb-1">{reportT('date')}</label>
                            <input 
                                type="date" 
                                value={reportDate} 
                                onChange={(e) => { setReportDate(e.target.value); setHasUnsavedChanges(true); }} 
                                className="input-style w-full font-bold" 
                            />
                       </div>

                       <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_activityCategory')}</label>
                            <select value={observation.activityCategory} onChange={e => handleObservationChange('activityCategory', e.target.value)} className="input-style w-full text-sm py-1.5 px-3">
                                <option value="" disabled>{reportT('settings_selectCategory')}</option>
                                {Object.keys(sportActivities).map(cat => <option key={cat} value={cat}>{reportT(cat)}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_activity')}</label>
                            <select value={observation.activity} onChange={e => handleObservationChange('activity', e.target.value)} className="input-style w-full text-sm py-1.5 px-3" disabled={!observation.activityCategory}>
                                <option value="" disabled>{reportT('settings_selectActivity')}</option>
                                {(sportActivities[observation.activityCategory] || []).map(act => <option key={act} value={act}>{reportT(act)}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_level')}</label>
                            <select value={observation.level} onChange={e => handleObservationChange('level', e.target.value)} className="input-style w-full text-sm py-1.5 px-3">
                                <option value="" disabled>{reportT('evaluation_selectLevel')}</option>
                                {levels.map(lvl => <option key={lvl} value={lvl}>{reportT(lvl)}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_class')}</label>
                            <input type="text" value={observation.class} onChange={e => handleObservationChange('class', e.target.value)} className="input-style w-full text-sm py-1.5 px-3" placeholder={reportT('evaluation_fieldValuePlaceholder')} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_studentCount')}</label>
                            <input type="text" value={observation.studentCount} onChange={e => handleObservationChange('studentCount', e.target.value)} className="input-style w-full text-sm py-1.5 px-3" placeholder={reportT('evaluation_fieldValuePlaceholder')} />
                        </div>
                        <div className="md:col-span-1">
                             <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_tools')}</label>
                            <input type="text" value={observation.tools} onChange={e => handleObservationChange('tools', e.target.value)} className="input-style w-full text-sm py-1.5 px-3" placeholder={reportT('evaluation_fieldValuePlaceholder')} />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{reportT('evaluation_field_lessonGoal')}</label>
                            <textarea value={observation.lessonGoal} onChange={e => handleObservationChange('lessonGoal', e.target.value)} rows={2} className="input-style w-full text-sm py-2 px-3" placeholder={reportT('evaluation_fieldValuePlaceholder')} />
                        </div>
                         <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-medium text-[rgb(var(--color-text-base))]">{reportT('reportModal_lessonPlanSectionTitle')}</label>
                            {observation.lessonPlanImage ? (
                                <div className="flex items-center gap-2">
                                    <img src={observation.lessonPlanImage} alt="Lesson Plan" className="h-16 w-16 object-cover rounded-md border border-slate-300"/>
                                    <button onClick={() => fileInputRef.current?.click()} className="btn bg-[rgb(var(--color-button-secondary-bg))] text-sm py-1.5 px-3">{reportT('evaluation_changeLessonPlanImage')}</button>
                                    <button onClick={removeLessonPlanImage} className="btn bg-rose-50 text-rose-600 text-sm py-1.5 px-3">{reportT('evaluation_removeLessonPlanImage')}</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => cameraInputRef.current?.click()} className="btn bg-sky-100 text-sky-700 flex-grow text-sm py-1.5 px-3">
                                        <i className="fas fa-camera ltr:mr-2 rtl:ml-2"></i> {reportT('evaluation_takePhoto')}
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="btn bg-sky-100 text-sky-700 flex-grow text-sm py-1.5 px-3">
                                        <i className="fas fa-upload ltr:mr-2 rtl:ml-2"></i> {reportT('evaluation_uploadImage')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))]">
                    <div className="flex justify-between items-center border-b border-[rgb(var(--color-border))] pb-2 mb-4">
                        <h2 className="text-base font-bold text-[rgb(var(--color-text-base))]">{reportT('reportModal_criteria')}</h2>
                    </div>
                    <div className="space-y-3">
                        {criteria.map((c, index) => (
                            <div key={c.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        value={c.name} 
                                        onChange={(e) => handleCriterionChange(c.id, 'name', e.target.value)} 
                                        className="input-style flex-grow font-semibold text-sm py-1.5 px-3"
                                        placeholder={reportT('evaluation_criterionNamePlaceholder')}
                                        disabled={reportTemplate === 'network'}
                                    />
                                    {reportTemplate !== 'network' && (
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleMoveCriterionUp(index)} 
                                                className={`p-1.5 rounded-md transition-colors ${index === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-sky-500 hover:bg-sky-100 hover:text-sky-700'}`} 
                                                title={reportLanguage === 'fr' ? 'Monter' : 'تحريك لأعلى'}
                                                disabled={index === 0}
                                            >
                                                <i className="fas fa-arrow-up text-sm"></i>
                                            </button>
                                            <button 
                                                onClick={() => handleMoveCriterionDown(index)} 
                                                className={`p-1.5 rounded-md transition-colors ${index === criteria.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-sky-500 hover:bg-sky-100 hover:text-sky-700'}`} 
                                                title={reportLanguage === 'fr' ? 'Descendre' : 'تحريك لأسفل'}
                                                disabled={index === criteria.length - 1}
                                            >
                                                <i className="fas fa-arrow-down text-sm"></i>
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={() => handleRemoveCriterion(c.id)} className="text-rose-500 hover:text-rose-700 p-1.5" title={t('delete')} disabled={reportTemplate === 'network'}>
                                      <i className="fas fa-trash text-sm"></i>
                                    </button>
                                </div>
                                
                                {reportTemplate === 'network' && c.indicators && (
                                    <div className="mb-3 space-y-2 pl-3 rtl:pl-0 rtl:pr-3 border-l-2 rtl:border-l-0 rtl:border-r-2 border-sky-200 dark:border-sky-800">
                                        {c.indicators.map((indicator, indIndex) => (
                                            <div key={indIndex} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                                                <span className="text-xs text-slate-700 dark:text-slate-300 flex-grow">{indicator.name}</span>
                                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                                                    {['0', '1', '2', '3'].map((level) => (
                                                        <button
                                                            key={level}
                                                            onClick={() => handleIndicatorChange(c.id, indIndex, level)}
                                                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-sm font-bold transition-colors ${
                                                                indicator.level === level
                                                                    ? 'bg-sky-600 text-white border-sky-600'
                                                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                            title={reportT(`network_level_${level}`)}
                                                        >
                                                            {level}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="relative">
                                    <textarea
                                        value={c.comment}
                                        onChange={e => handleCriterionChange(c.id, 'comment', e.target.value)}
                                        rows={6}
                                        className="input-style w-full text-sm py-2 px-3"
                                        placeholder={reportT('evaluation_commentsPlaceholder').replace('{0}', c.name || reportT('unnamedField'))}
                                    ></textarea>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button onClick={handleAddCriterion} className="btn bg-slate-100 text-slate-700 hover:bg-slate-200 mt-4 w-full" disabled={reportTemplate === 'network'}>
                        <i className="fas fa-plus ltr:mr-2 rtl:ml-2"></i>{reportT('evaluation_addCriterion')}
                    </button>
                </div>

                {isInspection && (
                    <div ref={scoreInputRef} className={`bg-[rgb(var(--color-card))] p-4 rounded-xl border transition-colors ${validationError ? 'border-rose-500' : 'border-[rgb(var(--color-border))]'}`}>
                        <h2 className="text-base font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-2 mb-4">{reportT('evaluation_scoreLabel')}</h2>
                        <input
                            type="number"
                            value={typeof score === 'number' && Number.isNaN(score) ? '' : (score ?? '')}
                            onChange={e => handleScoreChange(e.target.value)}
                            className={`input-style w-full text-center text-base font-bold ${validationError ? 'border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500' : ''}`}
                            min="0"
                            max="20"
                            step="0.25"
                            aria-invalid={!!validationError}
                            aria-describedby="score-error"
                        />
                        {validationError && <p id="score-error" className="text-rose-600 text-sm mt-2 text-center">{validationError}</p>}
                    </div>
                )}
                
                {reportTemplate === 'network' && (
                    <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))]">
                        <h2 className="text-base font-bold text-[rgb(var(--color-text-base))] border-b border-[rgb(var(--color-border))] pb-2 mb-4">{reportT('overallAssessment')}</h2>
                        <div className="relative">
                            <textarea
                                value={overallAssessment}
                                onChange={e => { setOverallAssessment(e.target.value); setHasUnsavedChanges(true); }}
                                rows={4}
                                className="input-style w-full pr-10 rtl:pl-10 rtl:pr-3 text-sm"
                                placeholder={reportT('overallAssessmentPlaceholder')}
                            ></textarea>
                        </div>
                    </div>
                )}

                <div className="bg-[rgb(var(--color-card))] p-4 rounded-xl border border-[rgb(var(--color-border))] flex flex-col gap-2">
                    <button onClick={handleGenerateComments} disabled={isGenerating || isProofreading} className="btn btn-primary bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 w-full">
                        {isGenerating ? (
                            <><i className="fas fa-spinner fa-spin ltr:mr-2 rtl:ml-2"></i> {reportT('evaluation_generatingAI')}</>
                        ) : (
                            <><i className="fas fa-magic ltr:mr-2 rtl:ml-2"></i> {isInspection ? (reportLanguage === 'fr' ? "Génération et Révision (AI)" : "توليد الملاحظات والتدقيق اللغوي (AI)") : reportT('evaluation_generateAIBtn')}</>
                        )}
                    </button>
                    
                    {!isInspection && (
                        <button 
                            onClick={handleProofread} 
                            disabled={isGenerating || isProofreading} 
                            className="btn bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-300 w-full flex items-center justify-center gap-2 transition-all shadow-sm"
                            title={reportLanguage === 'fr' ? "Correction linguistique par IA" : "تدقيق لغوي بالذكاء الاصطناعي"}
                        >
                            {isProofreading ? (
                                <><i className="fas fa-spinner fa-spin"></i> {reportLanguage === 'fr' ? "Correction..." : "جاري التدقيق..."}</>
                            ) : (
                                <><i className="fas fa-spell-check"></i> {reportLanguage === 'fr' ? "Révision Linguistique (AI)" : "تدقيق لغوي (AI)"}</>
                            )}
                        </button>
                    )}
                    
                    {error && <p className="text-rose-600 text-sm mt-4 font-semibold bg-rose-50 p-2 rounded border border-rose-200">{error}</p>}
                </div>
            </div>
            
            <div className="sticky top-6">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-[rgb(var(--color-text-base))]">{t('reportCustomization_title')}</h2>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                            <button 
                                onClick={() => setZoomLevel(prev => Math.max(10, prev - 5))}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                title={t('zoomOut')}
                            >
                                <i className="fas fa-minus text-xs"></i>
                            </button>
                            <span className="text-[10px] font-bold w-10 text-center text-slate-600 dark:text-slate-400">{zoomLevel}%</span>
                            <button 
                                onClick={() => setZoomLevel(prev => Math.min(200, prev + 5))}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                title={t('zoomIn')}
                            >
                                <i className="fas fa-plus text-xs"></i>
                            </button>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <button 
                                onClick={() => setZoomLevel(isInspection ? 75 : 30)}
                                className="px-2 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-sky-600"
                            >
                                {t('reset')}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('reportCustomization_fontFamily')}</label>
                                <select 
                                    value={reportFontFamily} 
                                    onChange={(e) => { setReportFontFamily(e.target.value); setHasUnsavedChanges(true); }}
                                    className="input-style p-1 text-xs rounded-md h-8"
                                >
                                    {(reportLanguage === 'ar' ? ARABIC_FONTS : FRENCH_FONTS).map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('reportCustomization_fontSize')}</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="range" 
                                        min="8" max="24" 
                                        value={reportFontSize} 
                                        onChange={(e) => { setReportFontSize(parseInt(e.target.value)); setHasUnsavedChanges(true); }}
                                        className="flex-grow accent-sky-600"
                                    />
                                    <span className="text-xs font-bold w-6">{reportFontSize}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('reportCustomization_logoScale')}</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="range" 
                                        min="20" max="200" 
                                        value={reportLogoScale} 
                                        onChange={(e) => { setReportLogoScale(parseInt(e.target.value)); setHasUnsavedChanges(true); }}
                                        className="flex-grow accent-sky-600"
                                    />
                                    <span className="text-xs font-bold w-10">{reportLogoScale}%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('reportCustomization_margins')}</label>
                                <div className="grid grid-cols-3 gap-1">
                                    <div className="flex flex-col items-center">
                                        <input type="number" step="0.1" min="0" max="5" value={reportMarginTop} onChange={(e) => { setReportMarginTop(parseFloat(e.target.value)); setHasUnsavedChanges(true); }} className="w-full text-[10px] p-1 border rounded text-center" title={t('reportCustomization_marginTop')} />
                                        <span className="text-[8px] mt-0.5 text-slate-400 uppercase">{t('reportCustomization_marginTop')}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input type="number" step="0.1" min="0" max="5" value={reportMarginBottom} onChange={(e) => { setReportMarginBottom(parseFloat(e.target.value)); setHasUnsavedChanges(true); }} className="w-full text-[10px] p-1 border rounded text-center" title={t('reportCustomization_marginBottom')} />
                                        <span className="text-[8px] mt-0.5 text-slate-400 uppercase">{t('reportCustomization_marginBottom')}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <input type="number" step="0.1" min="0" max="5" value={reportMarginSide} onChange={(e) => { setReportMarginSide(parseFloat(e.target.value)); setHasUnsavedChanges(true); }} className="w-full text-[10px] p-1 border rounded text-center" title={t('reportCustomization_marginSide')} />
                                        <span className="text-[8px] mt-0.5 text-slate-400 uppercase">{t('reportCustomization_marginSide')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div
                    className="report-preview-container-forced-style max-h-[80vh] overflow-auto p-4 rounded-lg shadow-inner bg-slate-50 border border-slate-200"
                    dir={dir}
                 >
                    <div 
                        style={{ 
                            zoom: zoomLevel / 100,
                            width: '100%',
                            margin: '0 auto',
                            backgroundColor: 'white',
                            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                            padding: '1cm'
                        }}
                        dangerouslySetInnerHTML={{ __html: reportBodyHtml }}
                    />
                </div>
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-[rgb(var(--color-border))] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-2">
                {hasUnsavedChanges && (
                    <p className="text-xs text-rose-500 font-bold animate-pulse text-center sm:text-right">
                        <i className="fas fa-exclamation-circle ml-1"></i>
                        يرجى حفظ التقرير لتفعيل أزرار الطباعة والتصدير
                    </p>
                )}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button onClick={handleShare} disabled={hasUnsavedChanges} title={t('share')} className={exportBtnClass('bg-teal-600')}>
                        <i className="fas fa-share-alt"></i>
                    </button>
                    <button onClick={handlePrint} disabled={hasUnsavedChanges} title={t('print')} className={exportBtnClass('bg-sky-700')}>
                        <i className="fas fa-print"></i>
                    </button>
                    <button onClick={handleExportPdf} disabled={hasUnsavedChanges} title={t('exportPdf')} className={exportBtnClass('bg-red-600')}>
                        <i className="fas fa-file-pdf"></i>
                    </button>
                    <button onClick={handleExportExcel} disabled={hasUnsavedChanges} title={t('exportExcel')} className={exportBtnClass('bg-emerald-600')}>
                        <i className="fas fa-file-excel"></i>
                    </button>
                    <button onClick={handleExportWord} disabled={hasUnsavedChanges} title={t('exportWord')} className={exportBtnClass('bg-blue-600')}>
                        <i className="fas fa-file-word"></i>
                    </button>
                    <button onClick={handleExportHtml} disabled={hasUnsavedChanges} title={t('exportHtml')} className={exportBtnClass('bg-gray-600')}>
                        <i className="fas fa-code"></i>
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onCancel} className="btn bg-slate-600 text-white hover:bg-slate-700 px-6 h-10">
                    <span>{t('cancel')}</span>
                </button>
                <button onClick={handleSaveReport} className="btn bg-emerald-600 text-white hover:bg-emerald-700 px-6 h-10 shadow-lg transform active:scale-95 transition-transform">
                    <i className="fas fa-save ltr:mr-2 rtl:ml-2"></i>
                    <span>{t('save')}</span>
                </button>
            </div>
        </div>
    </div>
  );
};
