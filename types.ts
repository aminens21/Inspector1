
export interface Inspector {
  fullName: string;
  fullNameFr?: string; // Keep: Full Name in French
  framework: string;
  regionalAcademy: string;
  regionalDirectorate: string;
  subject: string;
  financialId?: string; 
  password?: string;
  regionalDirectorTitle?: string;
}

export interface ScheduleItem {
  day: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  subject?: string;
  className?: string; // Added class name
  rawData?: any; // Added for debugging
}

export interface License {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason?: string; // Added reason property
}

export type PromotionPace = 'rapid' | 'medium' | 'slow';

export interface Teacher {
  id: number | string;
  image?: string;
  fullName:string;
  fullNameFr?: string; // Keep: Full Name in French
  framework: string;
  employeeId: number;
  institution: string;
  institutionFr?: string; // Keep: Institution in French
  subject: string;
  grade: number | string;
  rank: number;
  genre: 'male' | 'female';
  lastInspectionScore: number | null;
  lastInspectionDate: string | null;
  lastInspector: string | null;
  schedule?: ScheduleItem[];
  licenses?: License[];
  recruitmentDate?: string;
  tenureDate?: string;
  gradeDate?: string;
  rankDate?: string;
  promotionPace?: PromotionPace;
  sector?: 'public' | 'private';
  assignedClasses?: string[];
}

export interface LessonObservation {
    activityCategory: string;
    activity: string;
    level: string;
    class: string;
    studentCount: string;
    tools: string;
    lessonGoal: string;
    lessonPlanImage?: string;
}

export interface Indicator {
    name: string;
    level: string;
}

export interface EvaluationCriterion {
    id: string;
    name: string;
    comment: string;
    achievementLevel?: string; // New: مستوى الانجاز
    indicators?: Indicator[]; // For network template
}

export interface Report {
    criteria: EvaluationCriterion[];
    score?: number;
    overallAssessment?: string;
}

export enum ReportType {
    VISIT = 'visit',
    INSPECTION = 'inspection',
}

export interface SavedReport extends Report {
    id?: number | string;
    teacherId: number | string;
    teacherName: string;
    date: string;
    reportType: ReportType;
    observation?: LessonObservation;
    previousInspectionScore?: number | null;
    previousInspectionDate?: string | null;
    previousInspector?: string | null;
    language?: 'ar' | 'fr'; // Added language field
    delivered?: boolean; // New: track if report was delivered
    reportTemplate?: 'standard' | 'network'; // New: Template type
    overallAssessment?: string; // New: Overall Assessment
    reportFontFamily?: string;
    reportFontSize?: number;
    reportLogoScale?: number;
    reportMarginTop?: number;
    reportMarginBottom?: number;
    reportMarginSide?: number;
}

export interface TeacherStatus {
    status: 'approved' | 'rejected';
    reason?: string;
}

export interface OtherReport {
  id: number | string;
  documentNumber?: string; // New field for Document Number
  date: string;
  subject: string;
  references: string[];
  content: string;
  concernedDepartment: string;
  invitedTeacherIds?: (string | number)[]; // Added field for invited teachers
  invitedTeacherStatuses?: Record<string, TeacherStatus>; // New for validation reports
  subType?: 'report' | 'correspondence'; // New: Distinguish between report and correspondence
  activityType?: string; // New: Specific activity type (e.g., Seminar, Experimental Lesson)
  activityCategory?: string; // New: Category for 'Other Activities'
  templateId?: string; // To track which template was used
  generalRejectionReason?: string; // Shared reason for all rejected teachers in validation reports
  validationDisplayMode?: 'teachers' | 'institutions'; // New: display mode for validation report annex
  includeTeachersList?: boolean; // New: Option to show/hide the teachers list in the report
  delivered?: boolean; // New: track if report was delivered
  language?: 'ar' | 'fr'; // Added language field
  reportFontFamily?: string;
  reportFontSize?: number;
  reportLogoScale?: number;
  reportMarginTop?: number;
  reportMarginBottom?: number;
  reportMarginSide?: number;
}

export interface SportActivities {
  [category: string]: string[];
}

export interface TransmissionSlipItem {
  reportId: string | number;
  reportType: 'visit' | 'inspection' | 'other' | 'activity_summary';
  reportSubject: string;
  copyCount: number;
  notes: string;
}

export interface TransmissionSlip {
  id: number | string;
  slipNumber: string;
  date: string;
  concernedDepartment: string;
  items: TransmissionSlipItem[];
  delivered?: boolean;
  language?: 'ar' | 'fr'; // Added language field
  reportFontFamily?: string;
  reportFontSize?: number;
  reportLogoScale?: number;
  reportMarginTop?: number;
  reportMarginBottom?: number;
  reportMarginSide?: number;
}

export interface Memo {
  id: string | number;
  title?: string;
  activityType: string;
  activityCategory?: string;
  content: string;
}

export type EventImportance = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  importance?: EventImportance;
  location?: string;
  completed?: boolean;
}

export interface BackupData {
    inspector: Inspector;
    teachers: Teacher[];
    reports: SavedReport[];
    otherReports: OtherReport[];
    transmissionSlips: TransmissionSlip[];
    evaluationCriteria: EvaluationCriterion[];
    academies: string[];
    directorates: string[];
    sportActivities: SportActivities;
    levels: string[];
    departments: string[];
    subjects: string[];
    ministryLogo: string;
    ministryLogoFr?: string; // New: Ministry Logo in French
    ministryLogoHeight?: number; // New field
    ministryLogoHeightFr?: number; // New: Ministry Logo Height in French
    institutionLocations?: Record<string, {lat: number, lng: number}>;
    geminiApiKey?: string; // Added field for Gemini API Key
    memos?: Memo[]; // Added field for Memos
    events?: CalendarEvent[]; // Added field for Calendar Events
}
