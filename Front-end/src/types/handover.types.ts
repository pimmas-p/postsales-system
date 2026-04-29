export interface HandoverCase {
  id: string;
  unit_id: string;
  customer_id: string;
  
  // Event statuses
  kyc_status: EventStatus;
  kyc_received_at: string | null;
  
  contract_status: EventStatus;
  contract_received_at: string | null;
  
  payment_status: EventStatus;
  payment_received_at: string | null;
  payment_amount: number | null;
  
  // Overall status
  overall_status: OverallStatus;
  
  // Handover completion
  handover_date: string | null;
  handover_by: string | null;
  handover_notes: string | null;
  completed_at: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export type EventStatus = 'pending' | 'approved' | 'drafted' | 'completed' | 'rejected' | 'failed' | null;

export type OverallStatus = 'pending' | 'ready' | 'completed' | 'blocked';

export interface HandoverEvent {
  id: string;
  case_id: string;
  event_type: string;
  event_source: string;
  payload: Record<string, any>;
  received_at: string;
}

export interface HandoverCaseWithEvents extends HandoverCase {
  events: HandoverEvent[];
}

export interface HandoverStats {
  total: number;
  pending: number;
  ready: number;
  completed: number;
  blocked: number;
}

export interface CompleteHandoverRequest {
  handoverDate: string;
  handoverBy: string;
  notes?: string;
}
