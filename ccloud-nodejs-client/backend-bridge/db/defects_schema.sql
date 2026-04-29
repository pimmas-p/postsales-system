-- ============================================
-- Snagging & Defect Service - Database Schema
-- ============================================

-- Table: defect_cases
-- Tracks defects reported and their resolution
CREATE TABLE IF NOT EXISTS defect_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  defect_number VARCHAR(50) UNIQUE NOT NULL, -- DEF-2026-0001 (auto-generated)
  unit_id VARCHAR(100) NOT NULL,
  
  -- Defect Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- electrical, plumbing, cosmetic, structural, hvac, door_window, other
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  
  -- Photos (Base64 or file URLs)
  photo_before_url TEXT,
  photo_after_url TEXT,
  
  -- Assignment
  assigned_to VARCHAR(100), -- Contractor ID or name
  assigned_at TIMESTAMP,
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'reported', -- reported, assigned, in_progress, resolved, verified, closed
  
  -- Resolution
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(100),
  resolution_notes TEXT,
  
  -- Verification
  verified_at TIMESTAMP,
  verified_by VARCHAR(100),
  
  -- Reporter
  reported_by VARCHAR(100) NOT NULL,
  reported_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: defect_events
-- Audit trail for defect lifecycle events
CREATE TABLE IF NOT EXISTS defect_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID REFERENCES defect_cases(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL, -- defect.reported, defect.assigned, defect.resolved, defect.verified
  event_source VARCHAR(100) NOT NULL, -- postsales, contractor, system
  
  payload JSONB NOT NULL, -- Event data
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_defect_unit_id ON defect_cases(unit_id);
CREATE INDEX IF NOT EXISTS idx_defect_status ON defect_cases(status);
CREATE INDEX IF NOT EXISTS idx_defect_priority ON defect_cases(priority);
CREATE INDEX IF NOT EXISTS idx_defect_category ON defect_cases(category);
CREATE INDEX IF NOT EXISTS idx_defect_created_at ON defect_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_defect_events_defect_id ON defect_events(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_events_type ON defect_events(event_type);

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_defect_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_defect_cases_updated_at
  BEFORE UPDATE ON defect_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_defect_cases_updated_at();

-- Sequence for Defect Number Generation
-- Format: DEF-YYYY-#### (e.g., DEF-2026-0001)
CREATE SEQUENCE IF NOT EXISTS defect_number_seq START 1;

-- Function: Generate Defect Number
CREATE OR REPLACE FUNCTION generate_defect_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part VARCHAR(4);
  defect_num VARCHAR(50);
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  seq_part := LPAD(nextval('defect_number_seq')::TEXT, 4, '0');
  defect_num := 'DEF-' || year_part || '-' || seq_part;
  RETURN defect_num;
END;
$$ LANGUAGE plpgsql;

-- Sample Data (Optional - for testing)
-- INSERT INTO defect_cases (defect_number, unit_id, title, description, category, priority, reported_by, status) 
-- VALUES (
--   generate_defect_number(),
--   'UNIT-TEST-001', 
--   'Leaking faucet in bathroom',
--   'Water dripping from bathroom sink faucet',
--   'plumbing',
--   'medium',
--   'staff-001',
--   'reported'
-- );
