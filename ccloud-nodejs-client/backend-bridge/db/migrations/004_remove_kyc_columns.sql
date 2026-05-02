-- Migration 004: Remove KYC columns from handover_cases
-- Date: May 2, 2026
-- Description: Handover Service now uses only 2 conditions (Contract + Payment) instead of 3 (KYC + Contract + Payment)
-- Managing Team (Team 4) KYC verification is no longer required for handover readiness

-- Drop KYC-related columns
ALTER TABLE handover_cases DROP COLUMN IF EXISTS kyc_status;
ALTER TABLE handover_cases DROP COLUMN IF EXISTS kyc_received_at;

-- Update table comment to reflect 2-condition flow
COMMENT ON TABLE handover_cases IS 'Tracks unit handover readiness (2 conditions: Contract + Payment)';

-- Note: Existing event logs with managing.kyc.completed will remain for historical audit purposes
-- The calculateOverallStatus function has been updated to use only contract_status and payment_status

-- Verification query after migration:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'handover_cases' ORDER BY ordinal_position;
