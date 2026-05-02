export interface OnboardingCase {
  id: string;
  handover_case_id: string | null;
  unit_id: string;
  customer_id: string;
  
  // Member Registration
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  area_size: number | null; // Unit area in sqm for common fees calculation
  registration_status: RegistrationStatus;
  registered_at: string | null;
  
  // Document Collection
  id_document_url: string | null;
  contract_document_url: string | null;
  document_status: DocumentStatus;
  documents_uploaded_at: string | null;
  
  // Payment Status (Step 4 Gatekeeper)
  payment_status: PaymentStatus;
  payment_verified_at: string | null;
  payment_amount: number | null;
  payment_reference_id: string | null;
  
  // Overall Status
  overall_status: OnboardingOverallStatus;
  
  // Completion
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'pending' | 'completed' | 'failed';
export type DocumentStatus = 'pending' | 'uploaded' | 'verified';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OnboardingOverallStatus = 'pending' | 'in_progress' | 'completed';

export interface OnboardingEvent {
  id: string;
  case_id: string;
  event_type: string;
  event_source: string;
  payload: Record<string, any>;
  received_at: string;
}

export interface OnboardingCaseWithEvents extends OnboardingCase {
  events: OnboardingEvent[];
}

export interface OnboardingStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}
