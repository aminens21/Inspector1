
import React, { useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { PageHeader } from './ui/PageHeader';
import { GoogleGenAI, Type } from "@google/genai";
import { loadInitialData } from '../services/localStorageManager';

interface EducationalResearchPageProps {
  onGoHome: () => void;
}

export const EducationalResearchPage: React.FC<EducationalResearchPageProps> = ({ onGoHome }) => {
  const { t } = useTranslations();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMethodology, setIsGeneratingMethodology] = useState(false);
  const [isGeneratingInstruments, setIsGeneratingInstruments] = useState(false);
  const [isGeneratingFullFormulation, setIsGeneratingFullFormulation] = useState(false);
  const [researchGuide, setResearchGuide] = useState<{
      problem: string;
      hypothesis: string;
      methodology: string;
      plan: string;
  } | null>(null);
  const [instrumentsDetails, setInstrumentsDetails] = useState<string | null>(null);
  const [fullFormulation, setFullFormulation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateGuide = async () => {
      if (!topic.trim()) return;
      
      const localData = loadInitialData();
      const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === '') {
          setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
          return;
      }

      setIsGenerating(true);
      setError(null);
      setInstrumentsDetails(null); // Reset instruments details on new topic
      setFullFormulation(null); // Reset full formulation on new topic

      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = `
            بصفتك خبيراً في البحث التربوي، ساعدني في هيكلة بحث تربوي حول الموضوع التالي: "${topic}".
            المرجو تقديم مقترح مفصل يتضمن:
            1. صياغة إشكالية البحث بشكل دقيق (Problem Statement).
            2. صياغة فرضيات البحث الممكنة (Hypotheses).
            3. المنهجية والأدوات المقترحة (Methodology & Tools) التي تناسب هذا الموضوع.
            4. تصميم مقترح للبحث (Outline/Plan) يشمل الفصول والمباحث الأساسية.
            
            أجب باللغة العربية الفصحى الأكاديمية.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          problem: { type: Type.STRING, description: "صياغة الإشكالية" },
                          hypothesis: { type: Type.STRING, description: "الفرضيات المقترحة" },
                          methodology: { type: Type.STRING, description: "المنهجية والأدوات" },
                          plan: { type: Type.STRING, description: "تصميم البحث" }
                      },
                      required: ["problem", "hypothesis", "methodology", "plan"]
                  }
              }
          });

          const json = JSON.parse(response.text || '{}');
          setResearchGuide(json);

      } catch (e: any) {
          setError(e.message || "حدث خطأ أثناء التوليد");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGenerateMethodologyOnly = async () => {
      if (!topic.trim() || !researchGuide) return;
      
      const localData = loadInitialData();
      const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === '') {
          setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
          return;
      }

      setIsGeneratingMethodology(true);
      setError(null);

      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = `
            بصفتك خبيراً في البحث التربوي، ركز فقط على جانب "المنهجية والأدوات" لموضوع البحث: "${topic}".
            
            المرجو تقديم تفصيل دقيق يشمل:
            1. المنهج المتبع (وصفي، تجريبي، إلخ) مع التبرير.
            2. مجتمع البحث والعينة المقترحة.
            3. أدوات البحث المناسبة (استمارة، مقابلة، ملاحظة، روائز...) وكيفية بنائها.
            4. الأساليب الإحصائية المقترحة لمعالجة البيانات.

            أعطني إجابة مركزة ومفصلة لهذا القسم فقط باللغة العربية الفصحى.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          methodology: { type: Type.STRING, description: "التفصيل الكامل للمنهجية والأدوات" },
                      },
                      required: ["methodology"]
                  }
              }
          });

          const json = JSON.parse(response.text || '{}');
          if (json.methodology) {
              setResearchGuide(prev => prev ? ({ ...prev, methodology: json.methodology }) : null);
          }

      } catch (e: any) {
          setError(e.message || "حدث خطأ أثناء توليد المنهجية");
      } finally {
          setIsGeneratingMethodology(false);
      }
  };

  const handleGenerateInstrumentsDetails = async () => {
      if (!topic.trim()) return;
      
      const localData = loadInitialData();
      const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === '') {
          setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
          return;
      }

      setIsGeneratingInstruments(true);
      setError(null);

      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = `
            بصفتك خبيراً في البحث التربوي، أريد مقترحاً تطبيقياً وعملياً لنماذج أدوات البحث وشبكات القياس المناسبة للموضوع: "${topic}".
            
            المرجو تقديم ما يلي بدقة وبتنسيق واضح:
            
            1. **الاستبيان (Questionnaire):** (إذا كان مناسباً)
               - تحديد المحاور الكبرى للاستمارة.
               - اقتراح 5 أسئلة مغلقة (Likert Scale) و 2 أسئلة مفتوحة كنماذج.

            2. **شبكة الملاحظة (Observation Grid):** (إذا كان مناسباً)
               - تحديد الأبعاد (Dimensions).
               - سرد المؤشرات السلوكية القابلة للملاحظة (Observable Indicators).

            3. **المقابلة (Interview):** (إذا كان مناسباً)
               - أسئلة المقابلة الموجهة للفاعلين (أساتذة، تلاميذ، إداريين...).

            4. **الاختبارات البدنية/المهارية (Tests):** (إذا كان البحث تجريبياً)
               - اقتراح الاختبارات القبلية والبعدية المناسبة للمتغيرات.

            تعليمات صارمة للصياغة:
            - **لا تكتب أي مقدمة إطلاقاً** (مثل "بصفتي خبيرا..." أو "إليك المقترح...").
            - **لا تكتب خاتمة**.
            - ابدأ مباشرة بالعناوين والمحتوى التقني (مثلاً: "1. نموذج الاستبيان المقترح...").
            - استخدم اللغة العربية الفصحى.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              // No JSON schema needed for rich text layout, Markdown is better here
          });

          setInstrumentsDetails(response.text || "لم يتم استخراج تفاصيل.");

      } catch (e: any) {
          setError(e.message || "حدث خطأ أثناء توليد تفاصيل الأدوات");
      } finally {
          setIsGeneratingInstruments(false);
      }
  };

  const handleGenerateFullFormulation = async () => {
      if (!topic.trim() || !researchGuide) return;
      
      const localData = loadInitialData();
      const apiKey = localData.geminiApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === '') {
          setError(t('errorApiKeyMissingBuild') || 'مفتاح API الخاص بالذكاء الاصطناعي غير متوفر. يرجى إعداده في إعدادات البيئة.');
          return;
      }

      setIsGeneratingFullFormulation(true);
      setError(null);

      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = `
            بصفتك خبيراً أكاديمياً في البحث التربوي، أريد منك كتابة "صياغة كلية وتفصيلية" للبحث بناءً على المعطيات التالية:
            
            الموضوع: ${topic}
            الإشكالية: ${researchGuide.problem}
            الفرضيات: ${researchGuide.hypothesis}
            المنهجية: ${researchGuide.methodology}
            الأدوات: ${instrumentsDetails || 'لم يتم تحديدها بالتفصيل بعد'}
            التصميم المقترح (الخطة): ${researchGuide.plan}
            
            المطلوب:
            كتابة محتوى البحث بشكل مفصل (Drafting the full research content) مع الالتزام بالمعايير الأكاديمية. 
            يجب أن يشمل ذلك:
            - مقدمة موسعة وشاملة.
            - تفصيل في الجانب النظري (أهم المفاهيم والمتغيرات).
            - تفصيل في الجانب التطبيقي بناءً على المنهجية والأدوات المقترحة.
            - مقترحات وتوصيات تربوية عملية.
            
            تعليمات الصياغة:
            - استخدم لغة عربية أكاديمية رصينة ودقيقة.
            - التزم بالتنسيق الواضح (عناوين، فقرات، نقاط).
            - لا تكتب أي مقدمات أو خاتمات خارج سياق متن البحث (مثل "بصفتي خبيرا..." أو "إليك البحث...").
            - ابدأ مباشرة بعنوان البحث ثم المقدمة.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
          });

          setFullFormulation(response.text || "لم يتم توليد الصياغة.");

      } catch (e: any) {
          setError(e.message || "حدث خطأ أثناء توليد الصياغة الكلية");
      } finally {
          setIsGeneratingFullFormulation(false);
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        title={
            <div className="flex items-center gap-4">
                <button onClick={onGoHome} title={t('home')} className="btn bg-slate-600 text-white hover:bg-slate-700">
                    <i className="fas fa-home"></i>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-indigo-600">{t('research_pageTitle')}</h1>
            </div>
        }
      />

      <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border border-[rgb(var(--color-border))] mb-6 shadow-sm">
          <label className="block text-lg font-bold text-[rgb(var(--color-text-base))] mb-2">{t('research_labelTopic')}</label>
          <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                placeholder={t('research_placeholderTopic')} 
                className="input-style flex-grow text-lg"
              />
              <button 
                onClick={handleGenerateGuide} 
                disabled={isGenerating || !topic}
                className="btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 md:w-auto w-full px-6"
              >
                  {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                  {isGenerating ? t('research_generating') : t('research_generateButton')}
              </button>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-2 flex items-center gap-1">
              <i className="fas fa-info-circle"></i> {t('research_helpText')}
          </p>
          {error && <p className="text-rose-500 mt-2 font-bold">{error}</p>}
      </div>

      {researchGuide && (
          <div className="space-y-6 animate-fadeIn">
              <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border-r-4 border-indigo-500 shadow-sm border border-[rgb(var(--color-border))]">
                  <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2"><i className="fas fa-question-circle"></i> {t('research_section_problem')}</h3>
                  <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">{researchGuide.problem}</div>
              </div>

              <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border-r-4 border-emerald-500 shadow-sm border border-[rgb(var(--color-border))]">
                  <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2"><i className="fas fa-lightbulb"></i> {t('research_section_hypothesis')}</h3>
                  <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">{researchGuide.hypothesis}</div>
              </div>

              <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border-r-4 border-amber-500 shadow-sm border border-[rgb(var(--color-border))]">
                  <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                      <h3 className="text-xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2"><i className="fas fa-tools"></i> {t('research_section_methodology')}</h3>
                      <div className="flex gap-2">
                        <button 
                            onClick={handleGenerateMethodologyOnly} 
                            disabled={isGeneratingMethodology}
                            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-amber-200"
                            title={t('research_title_refineMethodology')}
                        >
                            {isGeneratingMethodology ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                            <span>{t('research_btn_refineMethodology')}</span>
                        </button>
                        <button 
                            onClick={handleGenerateInstrumentsDetails} 
                            disabled={isGeneratingInstruments}
                            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-indigo-200 shadow-sm font-bold"
                            title={t('research_title_instruments')}
                        >
                            {isGeneratingInstruments ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-tasks"></i>}
                            <span>{t('research_btn_instruments')}</span>
                        </button>
                      </div>
                  </div>
                  <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">{researchGuide.methodology}</div>
              </div>

              {instrumentsDetails && (
                  <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border-r-4 border-rose-500 shadow-lg border border-[rgb(var(--color-border))] animate-fadeIn">
                      <h3 className="text-xl font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                          <i className="fas fa-clipboard-list"></i> {t('research_section_instruments')}
                      </h3>
                      <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                          {instrumentsDetails}
                      </div>
                  </div>
              )}

              <div className="bg-[rgb(var(--color-card))] p-6 rounded-xl border-r-4 border-sky-500 shadow-sm border border-[rgb(var(--color-border))]">
                  <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                      <h3 className="text-xl font-bold text-sky-700 dark:text-sky-400 flex items-center gap-2"><i className="fas fa-list-ol"></i> {t('research_section_plan')}</h3>
                      <button 
                          onClick={handleGenerateFullFormulation} 
                          disabled={isGeneratingFullFormulation}
                          className="text-xs bg-sky-100 hover:bg-sky-200 text-sky-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-sky-200 shadow-sm font-bold"
                          title={t('research_title_fullFormulation')}
                      >
                          {isGeneratingFullFormulation ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-pen-nib"></i>}
                          <span>{t('research_btn_fullFormulation')}</span>
                      </button>
                  </div>
                  <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap">{researchGuide.plan}</div>
              </div>

              {fullFormulation && (
                  <div className="bg-[rgb(var(--color-card))] p-8 rounded-xl border-t-8 border-indigo-600 shadow-2xl border border-[rgb(var(--color-border))] animate-fadeIn mt-8">
                      <div className="flex justify-between items-center mb-6 border-b border-[rgb(var(--color-border))] pb-4">
                          <h3 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-3">
                              <i className="fas fa-file-alt"></i> {t('research_section_fullFormulation')}
                          </h3>
                          <button 
                              onClick={() => {
                                  const blob = new Blob([fullFormulation], { type: 'text/plain;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `${t('research_filename_prefix')}${topic}.txt`;
                                  link.click();
                              }}
                              className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2"
                          >
                              <i className="fas fa-download"></i> {t('research_downloadText')}
                          </button>
                      </div>
                      <div className="text-[rgb(var(--color-text-base))] leading-relaxed whitespace-pre-wrap text-lg bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                          {fullFormulation}
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
