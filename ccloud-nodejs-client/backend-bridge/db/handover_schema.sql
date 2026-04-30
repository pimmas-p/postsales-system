-- ============================================
-- Handover Readiness Service - Database Schema
-- ============================================

-- Table: handover_cases
-- Tracks unit handover readiness (aggregates KYC, Contract, Payment statuses)
CREATE TABLE IF NOT EXISTS handover_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unit & Customer Info
  unit_id VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  
  -- Status from External Teams (via Kafka events)
  kyc_status VARCHAR(50), -- NULL (pending), 'approved', 'rejected'
  contract_status VARCHAR(50), -- NULL (pending), 'drafted', 'rejected'
  contract_id VARCHAR(100), -- Contract ID from Legal team
  payment_status VARCHAR(50), -- NULL (pending), 'completed', 'failed'
  payment_amount DECIMAL(15, 2), -- Second payment amount
  
  -- Calculated Overall Status (Event Aggregation Pattern)
  overall_status VARCHAR(50) DEFAULT 'pending', -- pending, ready, completed, blocked
  
  -- Handover Completion (Staff completes when ready)
  handover_date DATE,
  handover_by VARCHAR(100),
  handover_notes TEXT,
  completed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: handover_events
-- Audit trail for all events affecting handover readiness
CREATE TABLE IF NOT EXISTS handover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES handover_cases(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL, -- kyc.completed, legal.contract.drafted, payment.secondpayment.completed
  event_source VARCHAR(100) NOT NULL, -- kyc, legal, payment, postsales
  
  payload JSONB NOT NULL, -- Full event data
  
  received_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_handover_unit_id ON handover_cases(unit_id);
CREATE INDEX IF NOT EXISTS idx_handover_customer_id ON handover_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_handover_contract_id ON handover_cases(contract_id);
CREATE INDEX IF NOT EXISTS idx_handover_overall_status ON handover_cases(overall_status);
CREATE INDEX IF NOT EXISTS idx_handover_created_at ON handover_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_handover_events_case_id ON handover_events(case_id);
CREATE INDEX IF NOT EXISTS idx_handover_events_type ON handover_events(event_type);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_handover_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_handover_cases_updated_at
  BEFORE UPDATE ON handover_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_handover_cases_updated_at();
