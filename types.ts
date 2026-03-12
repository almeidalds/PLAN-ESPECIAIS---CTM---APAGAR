export enum AppStep {
  IMPORT = 'IMPORT',
  MAPPING = 'MAPPING',
  VALIDATION = 'VALIDATION',
  DISTRICTS = 'DISTRICTS',
  DISTRIBUTION = 'DISTRIBUTION',
  CONFIGURE = 'CONFIGURE',
  REVIEW = 'REVIEW'
}

export enum BatchStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  EXPORTED = 'EXPORTED',
  REVIEW = 'REVIEW'
}

export interface RawDataRow {
  [key: string]: any;
}

export type ColumnMapping = any;

export interface TemplateBlock {
    id: string;
    type: string;
    content?: string;
    [key: string]: any;
}

export interface ImportedRow {
  row_index: number;
  missionary_name?: string;
  missionary_email?: string;
  district_code?: string;
  district_number?: string | number; 
  district_letter?: string; 
  training_start_date?: string;
  training_end_date?: string; 
  plan_version?: number | string;
  program_code?: string;
  training_type?: string; 
  country_home_unit?: string; 
  language?: string;          
  group?: string;             
  [key: string]: any;
}

export interface Override {
  id: string;
  missionary_email: string;
  field: any;
  original_value: any;
  new_value: any;
  reason: string;
  timestamp: string;
}

export interface AIAnalysisResult {
  suggestedMapping?: Record<string, string>; // 🔥 O "?" resolve o erro do Gemini!
  confidenceScore?: number;                  // 🔥 O "?" resolve o erro do Gemini!
  warnings?: string[];                       // 🔥 O "?" resolve o erro do Gemini!
  summary?: string; 
  actionItems?: string[]; 
}

export interface ValidationReport {
  totalCount: number;
  errorCount: number;
  warningCount: number;
  blockerCount: number;
  issues: ValidationError[];
}

export interface ValidationError {
  row_index: number;
  missionary_name: string;
  field: string;
  message: string;
  severity: 'warning' | 'error' | 'blocker';
  suggestion?: string;
}

export interface NotificationState {
  show: boolean;
  message: string;
  type: 'error' | 'success' | 'info';
}

export interface Missionary {
  id: string;
  name: string;
  email: string;
  startDate: string;
  endDate?: string; 
  weekIndex: number;
  originalRowIndex: number;
  country?: string;   
  language?: string;  
  [key: string]: any;
}

export interface District {
  id: string;
  code: string;
  number?: string | number; 
  letter?: string; 
  missionaries: Missionary[];
  planVersion: number;
  programCode?: string;
  training_type?: string;
  group?: string;     
  language?: string;  
  [key: string]: any;
}

export interface ScheduleEvent {
  date: string;
  time: string;
  activity: string;
  type: string;
  durationMinutes: number;
  location?: string;
  isStaggered?: boolean;
  targetMissionaries?: string[];
  [key: string]: any;
}

export interface DistrictSchedule {
  districtId: string;
  districtCode: string;
  missionaryCount: number;
  events: ScheduleEvent[];
}

export interface CapacitySlot {
  time: string;
  type: string;
  count: number;
  status: string;
}

export interface GlobalSettings {
  emailTemplate?: string;
  capacities: {
    cafeteria: number;
    gym: number;
    temple: number;
    [key: string]: number;
  };
  [key: string]: any;
}