export interface ProjectAxisActivity {
  id: string;
  activityType: string;
  subject: string;
  executionPeriod: string;
  targetGroup: string;
  notes: string;
}

export interface ProjectAxis {
  id: string;
  title: string;
  activities: ProjectAxisActivity[];
}

export interface ProjectData {
  schoolYear: string;
  name: string;
  academy: string;
  directorate: string;
  employeeNumber: string;
  framework: string;
  subject: string;
  appointmentDate: string;
  employmentDate: string;
  axes: ProjectAxis[];
}
