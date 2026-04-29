-- ============================================
-- Owner Onboarding Service - Database Schema
-- ============================================

-- Table: onboarding_cases
-- Tracks owner onboarding process after handover completion
CREATE TABLE IF NOT EXISTS onboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  handover_case_id UUID REFERENCES handover_cases(id) ON DELETE SET NULL,
  unit_id VARCHAR(100) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  
  -- Member Registration
  email VARCHAR(255),
  phone VARCHAR(50),
  password_hash VARCHAR(255), -- Store hashed password (not plain text)
  registration_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  registered_at TIMESTAMP,
  
  -- Document Collection
  id_document_url TEXT, -- Base64 or file URL for ID card
  contract_document_url TEXT, -- Base64 or file URL for contract copy
  document_status VARCHAR(50) DEFAULT 'pending', -- pending, uploaded, verified
  documents_uploaded_at TIMESTAMP,
  
  -- Overall Status
  overall_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  
  -- Completion
  completed_by VARCHAR(100),
  completed_at TIMESTAMP,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: onboarding_events
-- Audit trail for onboarding events
CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL, -- onboarding.started, onboarding.memberregistered, onboarding.completed
  event_source VARCHAR(100) NOT NULL, -- postsales, system
  
  payload JSONB NOT NULL, -- Event data
  
  received_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_onboarding_unit_id ON onboarding_cases(unit_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_customer_id ON onboarding_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_overall_status ON onboarding_cases(overall_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_created_at ON onboarding_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_case_id ON onboarding_events(case_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_type ON onboarding_events(event_type);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_cases_updated_at
  BEFORE UPDATE ON onboarding_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_cases_updated_at();

-- Sample Data (Optional - for testing)
-- INSERT INTO onboarding_cases (unit_id, customer_id, email, phone, overall_status) 
-- VALUES ('UNIT-TEST-001', 'CUST-TEST-001', 'test@example.com', '081-234-5678', 'pending');
