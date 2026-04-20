
import React, { useState, useEffect, useRef } from 'react';
import { Teacher, PromotionPace } from '../types';
import { Modal } from './ui/Modal';
import { useTranslations } from '../hooks/useTranslations';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id'> | Teacher) => void;
  initialData: Omit<Teacher, 'id'> | Teacher | null;
  inspectorSubject: string;
  subjects: string[];
}

const initialTeacherState: Omit<Teacher, 'id'> = {
  fullName: '',
  fullNameFr: '',
  framework: '',
  employeeId: '' as any,
  institution: '',
  subject: '',
  grade: '',
  rank: 0,
  genre: 'male',
  lastInspectionScore: null,
  lastInspectionDate: null,
  lastInspector: null,
  recruitmentDate: '',
  tenureDate: '',
  gradeDate: '',
  rankDate: '',
  promotionPace: 'rapid', // Default to rapid
  image: '',
  sector: 'public', // Default sector
  schedule: [],
};

export const AddTeacherModal: React.FC<TeacherModalProps> = ({ isOpen, onClose, onSave, initialData, inspectorSubject, subjects }) => {
  const { t } = useTranslations();
  const [teacher, setTeacher] = useState<Omit<Teacher, 'id'> | Teacher>(initialData || initialTeacherState);
  const isEditMode = !!(initialData && 'id' in initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const existingSchedule = initialData.schedule || [];
        const classesFromSchedule = Array.from(new Set(existingSchedule.map(s => s.className).filter(Boolean))) as string[];
        const initialAssignedClasses = initialData.assignedClasses && initialData.assignedClasses.length > 0 
          ? initialData.assignedClasses 
          : classesFromSchedule;

        setTeacher({ 
          ...initialData, 
          grade: initialData.grade ? String(initialData.grade) : '', // Safe conversion
          lastInspectionDate: initialData.lastInspectionDate ? new Date(initialData.lastInspectionDate).toISOString().split('T')[0] : null,
          promotionPace: initialData.promotionPace || 'rapid', // Default to rapid if not set
          sector: initialData.sector || 'public', // Default to public
          assignedClasses: initialAssignedClasses
        });
      } else {
        setTeacher({ ...initialTeacherState, subject: inspectorSubject });
      }
    }
  }, [isOpen, initialData, inspectorSubject]);

  const handleSave = () => {
    const { fullName, fullNameFr, framework, employeeId, institution, subject, grade, rank, genre } = teacher;
    if (!fullName || !framework || !employeeId || !institution || !subject || !grade || rank === null || rank < 0 || !genre) {
      alert(t('addTeacherModal_fillAllFields'));
      return;
    }

    const teacherToSave = {
        ...teacher,
        employeeId: Number(teacher.employeeId),
        grade: !isNaN(Number(teacher.grade)) ? Number(teacher.grade) : teacher.grade,
        rank: Number(teacher.rank),
        lastInspectionScore: teacher.lastInspectionScore ? Number(teacher.lastInspectionScore) : null,
        schedule: teacher.schedule || [],
    };
    onSave(teacherToSave);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setTeacher(prev => ({ 
          ...prev, 
          [name]: value
      }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacher(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
      setTeacher(prev => ({ ...prev, image: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [editingSlot, setEditingSlot] = useState<{ day: string, hour: string } | null>(null);
  const [tempClassName, setTempClassName] = useState('');
  const [newClassInput, setNewClassInput] = useState('');

  const handleAddAssignedClass = () => {
      if (!newClassInput.trim()) return;
      if ((teacher.assignedClasses || []).includes(newClassInput.trim())) {
          setNewClassInput('');
          return;
      }
      setTeacher(prev => ({
          ...prev,
          assignedClasses: [...(prev.assignedClasses || []), newClassInput.trim()]
      }));
      setNewClassInput('');
  };

  const handleRemoveAssignedClass = (className: string) => {
      setTeacher(prev => ({
          ...prev,
          assignedClasses: (prev.assignedClasses || []).filter(c => c !== className)
      }));
  };

  const gridDays = [
      t('day_monday'),
      t('day_tuesday'),
      t('day_wednesday'),
      t('day_thursday'),
      t('day_friday'),
      t('day_saturday')
  ];

  const gridHours = [
      { label: '08-09', start: '08:00', end: '09:00' },
      { label: '09-10', start: '09:00', end: '10:00' },
      { label: '10-11', start: '10:00', end: '11:00' },
      { label: '11-12', start: '11:00', end: '12:00' },
      { label: '14-15', start: '14:00', end: '15:00' },
      { label: '15-16', start: '15:00', end: '16:00' },
      { label: '16-17', start: '16:00', end: '17:00' },
      { label: '17-18', start: '17:00', end: '18:00' }
  ];

  const getSlotItem = (day: string, startTime: string) => {
      return (teacher.schedule || []).find(s => s.day === day && s.startTime === startTime);
  };

  const handleCellClick = (day: string, hour: any) => {
      const existing = getSlotItem(day, hour.start);
      setEditingSlot({ day, hour: hour.start });
      setTempClassName(existing?.className || '');
  };

  const handleSaveSlot = () => {
      if (!editingSlot) return;
      
      const { day, hour } = editingSlot;
      const hourData = gridHours.find(h => h.start === hour);
      if (!hourData) return;

      setTeacher(prev => {
          const schedule = [...(prev.schedule || [])];
          const index = schedule.findIndex(s => s.day === day && s.startTime === hour);
          const assignedClasses = [...(prev.assignedClasses || [])];
          
          if (tempClassName.trim()) {
              const trimmedName = tempClassName.trim();
              const newItem = {
                  day,
                  startTime: hour,
                  endTime: hourData.end,
                  className: trimmedName
              };
              
              if (index > -1) {
                  schedule[index] = newItem;
              } else {
                  schedule.push(newItem);
              }

              // Automatically add to assigned classes if not present
              if (!assignedClasses.includes(trimmedName)) {
                  assignedClasses.push(trimmedName);
              }
          } else {
              if (index > -1) {
                  schedule.splice(index, 1);
              }
          }
          
          return { ...prev, schedule, assignedClasses };
      });
      setEditingSlot(null);
  };

  const handleClearSlot = () => {
      if (!editingSlot) return;
      const { day, hour } = editingSlot;
      setTeacher(prev => ({
          ...prev,
          schedule: (prev.schedule || []).filter(s => !(s.day === day && s.startTime === hour))
      }));
      setEditingSlot(null);
  };

  const title = isEditMode ? t('addTeacherModal_editTitle') : t('addTeacherModal_addTitle');
  const saveButtonText = isEditMode ? t('addTeacherModal_saveChanges') : t('addTeacherModal_saveTeacher');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="3xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
        
        {/* Image Upload Section */}
        <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-24 w-24 rounded-full bg-[rgb(var(--color-background))] border-2 border-dashed border-[rgb(var(--color-border))] flex items-center justify-center overflow-hidden relative group">
                {teacher.image ? (
                    <img src={teacher.image} alt="Teacher" className="h-full w-full object-cover" />
                ) : (
                    <i className="fas fa-user-plus text-3xl text-[rgb(var(--color-text-muted))] opacity-50"></i>
                )}
                <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <i className="fas fa-camera text-white"></i>
                </div>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange} 
            />
            {teacher.image && (
                <button 
                    onClick={handleRemoveImage}
                    className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                >
                    <i className="fas fa-trash-alt"></i> {t('deleteImage') || 'حذف الصورة'}
                </button>
            )}
        </div>

        {/* Section: Personal & Professional Info */}
        <div>
          <h3 className="text-lg font-semibold text-sky-600 border-b border-sky-200 pb-2 mb-4">{t('teacherDetail_infoCardTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_fullName')}*</label>
                  <input type="text" name="fullName" value={teacher.fullName} onChange={handleChange} className="input-style" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_fullNameFr')}</label>
                  <input type="text" name="fullNameFr" value={teacher.fullNameFr || ''} onChange={handleChange} className="input-style" placeholder="Nom complet en français..." />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_employeeId')}*</label>
                  <input type="number" name="employeeId" value={teacher.employeeId} onChange={handleChange} className="input-style" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_genre')}*</label>
                  <select name="genre" value={teacher.genre} onChange={handleChange} className="input-style">
                      <option value="male">{t('genre_male')}</option>
                      <option value="female">{t('genre_female')}</option>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_framework')}*</label>
                  <select name="framework" value={teacher.framework} onChange={handleChange} className="input-style">
                      <option value="" disabled>-- {t('addTeacherModal_selectFramework')} --</option>
                      <option value="أستاذ التعليم الإبتدائي">{t('framework_primary')}</option>
                      <option value="أستاذ التعليم الثانوي الإعدادي">{t('framework_middle')}</option>
                      <option value="أستاذ التعليم الثانوي التأهيلي">{t('framework_high')}</option>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_subject')}*</label>
                  <select name="subject" value={teacher.subject} onChange={handleChange} className="input-style">
                      <option value="" disabled>-- {t('addTeacherModal_selectSubject')} --</option>
                      {subjects.map(s => <option key={s} value={s}>{t(s) || s}</option>)}
                  </select>
              </div>
               <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_grade')}*</label>
                  <select name="grade" value={teacher.grade} onChange={handleChange} className="input-style">
                      <option value="" disabled>-- {t('addTeacherModal_selectGrade')} --</option>
                      <option value="الثانية">الثانية (السلم 10)</option>
                      <option value="الأولى">الأولى (السلم 11)</option>
                      <option value="الممتازة">الممتازة (خارج السلم)</option>
                  </select>
              </div>
               <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_rank')}*</label>
                  <input type="number" name="rank" value={teacher.rank} onChange={handleChange} className="input-style" />
              </div>
              
              {/* --- PROMOTION PACE SELECTOR --- */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <label className="block text-sm font-black text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-2">
                      <i className="fas fa-running"></i>
                      نسق الترقية في الرتبة*
                  </label>
                  <select name="promotionPace" value={teacher.promotionPace} onChange={handleChange} className="input-style border-emerald-500/50 font-bold focus:ring-emerald-500">
                      <option value="rapid">النسق السريع (Fast)</option>
                      <option value="medium">النسق المتوسط (Medium)</option>
                      <option value="slow">النسق البطيء (Slow)</option>
                  </select>
              </div>

              {/* --- SECTOR SELECTOR --- */}
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('sector_label')}*</label>
                  <select name="sector" value={teacher.sector || 'public'} onChange={handleChange} className="input-style">
                      <option value="public">{t('sector_public')}</option>
                      <option value="private">{t('sector_private')}</option>
                  </select>
              </div>

              <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_institution')}*</label>
                  <input type="text" name="institution" value={teacher.institution} onChange={handleChange} className="input-style" />
              </div>
              <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_institutionFr') || 'المؤسسة (بالفرنسية)'}</label>
                  <input type="text" name="institutionFr" value={teacher.institutionFr || ''} onChange={handleChange} className="input-style" placeholder="Nom de l'école..." />
              </div>
          </div>
        </div>

        {/* Section: Dates */}
        <div>
           <h3 className="text-lg font-semibold text-emerald-600 border-b border-emerald-200 pb-2 mb-4">التواريخ الإدارية</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_rankDate')}*</label>
                  <input type="date" name="rankDate" value={teacher.rankDate || ''} onChange={handleChange} className="input-style border-emerald-500/50" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_gradeDate')}</label>
                  <input type="date" name="gradeDate" value={teacher.gradeDate || ''} onChange={handleChange} className="input-style" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_recruitmentDate')}</label>
                  <input type="date" name="recruitmentDate" value={teacher.recruitmentDate || ''} onChange={handleChange} className="input-style" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_tenureDate')}</label>
                  <input type="date" name="tenureDate" value={teacher.tenureDate || ''} onChange={handleChange} className="input-style" />
              </div>
           </div>
        </div>

        {/* Section: Last Inspection Info */}
        <div>
           <h3 className="text-lg font-semibold text-sky-600 border-b border-sky-200 pb-2 mb-4">{t('addTeacherModal_lastInspectionTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_lastScore')}</label>
                    <input type="number" name="lastInspectionScore" value={teacher.lastInspectionScore ?? ''} onChange={handleChange} className="input-style" min="0" max="20" step="0.25" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_lastDate')}</label>
                    <input type="date" name="lastInspectionDate" value={teacher.lastInspectionDate ?? ''} onChange={handleChange} className="input-style" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-1">{t('teacher_lastInspector')}</label>
                    <input type="text" name="lastInspector" value={teacher.lastInspector ?? ''} onChange={handleChange} className="input-style" />
                </div>
           </div>
        </div>

        {/* Section: Assigned Classes (Crucial for Timetable) */}
        <div className="bg-indigo-50/50 dark:bg-indigo-900/5 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
            <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-4">
                <i className="fas fa-layer-group"></i>
                {t('assignedClassesTitle') || 'الأقسام المسندة (مهم للجدول)'}
            </h3>
            
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={handleAddAssignedClass}
                    className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                >
                    <i className="fas fa-plus"></i>
                </button>
                <input 
                    type="text" 
                    placeholder="أضف قسماً (مثال: 1م1، 2باك2)"
                    value={newClassInput}
                    onChange={(e) => setNewClassInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAssignedClass()}
                    className="input-style flex-1 h-12 text-center font-bold border-indigo-200 focus:ring-indigo-500"
                />
            </div>

            {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) ? (
                <p className="text-center text-xs text-indigo-400 italic py-2">{t('noClassesAdded') || 'لم تتم إضافة أي أقسام بعد.'}</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {teacher.assignedClasses.map(c => (
                        <div key={c} className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm group">
                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{c}</span>
                            <button 
                                onClick={() => handleRemoveAssignedClass(c)}
                                className="text-rose-400 hover:text-rose-600 transition-colors"
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Section: Schedule & Assignments (Grid View) */}
        <div className="bg-sky-50/50 dark:bg-sky-900/5 p-4 rounded-2xl border border-sky-100 dark:border-sky-800/50">
            <h3 className="text-lg font-bold text-sky-700 dark:text-sky-400 flex items-center gap-2 mb-4">
                <i className="fas fa-calendar-alt"></i>
                {t('editTimetable') || 'تعديل الجدول'}
            </h3>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header: Hours */}
                    <div className="grid grid-cols-[100px_repeat(8,1fr)] gap-1 mb-2">
                        <div className="bg-white dark:bg-slate-800 p-2 text-center text-[10px] font-bold text-sky-600 rounded-lg border border-sky-100 dark:border-sky-800">الأيام</div>
                        {gridHours.map(h => (
                            <div key={h.label} className="bg-white dark:bg-slate-800 p-2 text-center text-[10px] font-bold text-sky-600 rounded-lg border border-sky-100 dark:border-sky-800" dir="ltr">
                                {h.label}
                            </div>
                        ))}
                    </div>

                    {/* Rows: Days */}
                    {gridDays.map(day => (
                        <div key={day} className="grid grid-cols-[100px_repeat(8,1fr)] gap-1 mb-1">
                            <div className="bg-white dark:bg-slate-800 p-2 flex items-center justify-center text-xs font-bold text-[rgb(var(--color-text-base))] rounded-lg border border-sky-100 dark:border-sky-800">
                                {day}
                            </div>
                            {gridHours.map(h => {
                                const item = getSlotItem(day, h.start);
                                const isASS = item?.className?.toUpperCase().includes('ASS');
                                return (
                                    <div 
                                        key={h.start} 
                                        onClick={() => handleCellClick(day, h)}
                                        className={`h-12 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center p-1 relative group ${
                                            item 
                                            ? (isASS ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm' : 'bg-sky-600 border-sky-500 text-white shadow-sm') 
                                            : 'bg-white dark:bg-slate-800 border-sky-100 dark:border-sky-800 hover:border-sky-300'
                                        }`}
                                    >
                                        {item ? (
                                            <>
                                                <div className="absolute top-1 left-1">
                                                    <i className="fas fa-check-square text-[10px]"></i>
                                                </div>
                                                <div className="absolute top-1 right-1">
                                                    <i className="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span className="text-[10px] font-bold text-center leading-tight">
                                                    {item.className}
                                                </span>
                                            </>
                                        ) : (
                                            <div className="w-4 h-4 rounded border border-sky-200 dark:border-sky-700 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <i className="fas fa-plus text-[8px] text-sky-400"></i>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile View (Card Based) */}
            <div className="md:hidden space-y-4">
                {gridDays.map(day => (
                    <div key={day} className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-800 overflow-hidden shadow-sm">
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 border-b border-sky-100 dark:border-sky-800 flex justify-between items-center">
                            <h4 className="font-bold text-sky-900 dark:text-sky-100 flex items-center gap-2">
                                {day}
                            </h4>
                            <i className="far fa-calendar-alt text-indigo-500"></i>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-4 gap-2">
                                {gridHours.map(h => {
                                    const item = getSlotItem(day, h.start);
                                    const isASS = item?.className?.toUpperCase().includes('ASS');
                                    return (
                                        <div 
                                            key={h.start}
                                            onClick={() => handleCellClick(day, h)}
                                            className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 relative transition-all ${
                                                item 
                                                ? (isASS ? 'bg-emerald-500 border-emerald-400 text-white shadow-md' : 'bg-sky-600 border-sky-500 text-white shadow-md') 
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                            }`}
                                        >
                                            <span className={`text-[9px] font-bold mb-1 ${item ? 'text-white' : 'text-slate-400'}`} dir="ltr">
                                                {h.label.split(' - ').reverse().join('-')}
                                            </span>
                                            {item ? (
                                                <div className="flex flex-col items-center">
                                                    <i className="fas fa-check text-[10px] mb-0.5"></i>
                                                    <span className="text-[8px] font-black truncate w-full text-center px-0.5">{item.className}</span>
                                                    <div className="absolute bottom-1 left-1">
                                                        <i className="fas fa-check-square text-[10px]"></i>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Slot Selection Modal */}
        {editingSlot && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-[rgb(var(--color-border))]">
                        <h4 className="text-xl font-bold text-[rgb(var(--color-text-base))]">اختر القسم</h4>
                        <button onClick={() => setEditingSlot(null)} className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-base))]">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-[rgb(var(--color-text-muted))]">
                                {editingSlot.day} - الساعة {editingSlot.hour}
                            </p>
                        </div>

                        {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) ? (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 text-center">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    لم تقم بتحديد الأقسام المسندة إليك في الملف الشخصي بعد.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {teacher.assignedClasses.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => {
                                            setTempClassName(c);
                                            // Optional: auto-save on click if you want, but keeping it consistent with manual save
                                        }}
                                        className={`py-3 rounded-xl border-2 font-bold transition-all ${
                                            tempClassName === c 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-[rgb(var(--color-text-muted))] mb-2">كتابة يدوية (اختياري)</label>
                            <input 
                                type="text" 
                                placeholder="مثال: 3م1"
                                value={tempClassName}
                                onChange={(e) => setTempClassName(e.target.value)}
                                className="input-style text-center text-lg font-bold py-4"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveSlot()}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={handleClearSlot}
                                className="h-14 w-14 flex items-center justify-center rounded-2xl border border-[rgb(var(--color-border))] text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                                <i className="fas fa-eraser text-xl"></i>
                            </button>
                            <button 
                                onClick={handleSaveSlot}
                                className="flex-1 bg-sky-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/30"
                            >
                                <i className="fas fa-save"></i>
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
      <div className="flex justify-end pt-6 space-x-2 rtl:space-x-reverse border-t border-[rgb(var(--color-border))] mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-[rgb(var(--color-button-secondary-bg))] text-[rgb(var(--color-text-base))] rounded-md hover:bg-[rgb(var(--color-button-secondary-hover-bg))] transition-colors">{t('cancel')}</button>
          <button onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">{saveButtonText}</button>
        </div>
    </Modal>
  );
};
