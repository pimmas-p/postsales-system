export interface DefectCase {
  id: string;
  defect_number: string;
  unit_id: string;
  
  // Defect Details
  title: string;
  description: string | null;
  category: DefectCategory;
  priority: DefectPriority;
  
  // Photos
  photo_before_url: string | null;
  photo_after_url: string | null;
  
  // Assignment & Scheduling
  assigned_to: string | null;
  repair_scheduled_date: string | null;
  repair_notes: string | null;
  
  // Status
  status: DefectStatus;
  
  // Closure
  closed_at: string | null;
  closed_by: string | null;
  closing_notes: string | null;
  
  // Reporter
  reported_by: string;
  reported_at: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export type DefectCategory = 
  | 'electrical' 
  | 'plumbing' 
  | 'cosmetic' 
  | 'structural' 
  | 'hvac' 
  | 'door_window' 
  | 'other';

export type DefectPriority = 'low' | 'medium' | 'high' | 'critical';

export type DefectStatus = 
  | 'reported' 
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface DefectEvent {
  id: string;
  defect_id: string;
  event_type: string;
  event_source: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface DefectCaseWithEvents extends DefectCase {
  events: DefectEvent[];
}

export interface DefectStats {
  total: number;
  reported: number;
  in_progress: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReportDefectRequest {
  unitId: string;
  title: string;
  description?: string;
  category: DefectCategory;
  priority: DefectPriority;
  photoBeforeUrl?: string; // Base64 or URL
  reportedBy: string;
}

export interface ScheduleRepairRequest {
  scheduledDate: string;
  technicianName?: string;
  estimatedDuration?: string;
  repairNotes?: string;
}

export interface CompleteRepairRequest {
  completedBy: string;
  completionNotes?: string;
  photoAfterUrl?: string; // Base64 or URL
}

export interface CloseDefectRequest {
  closedBy: string;
  closingNotes?: string;
  photoAfterUrl?: string; // Base64 or URL
}

// Helper constants
export const DEFECT_CATEGORIES: Record<DefectCategory, string> = {
  electrical: 'Electrical (ไฟฟ้า)',
  plumbing: 'Plumbing (ประปา)',
  cosmetic: 'Cosmetic (สีผนัง/พื้น)',
  structural: 'Structural (โครงสร้าง)',
  hvac: 'HVAC (แอร์/ระบายอากาศ)',
  door_window: 'Door/Window (ประตู/หน้าต่าง)',
  other: 'Other (อื่นๆ)'
};

export const DEFECT_PRIORITIES: Record<DefectPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

export const DEFECT_STATUSES: Record<DefectStatus, string> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
};
