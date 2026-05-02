-- Migration 003: Add payment tracking columns to onboarding_cases
-- Created: 2026-05-02
-- Purpose: Support Step 4 - Payment verification gatekeeper for profile activation

-- Add payment_status column to track common fees payment
ALTER TABLE onboarding_cases 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
-- Values: pending, paid, failed

-- Add payment_verified_at timestamp
ALTER TABLE onboarding_cases 
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;

-- Add payment_amount for reference
ALTER TABLE onboarding_cases 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);

-- Add payment_reference_id from Payment Team
ALTER TABLE onboarding_cases 
ADD COLUMN IF NOT EXISTS payment_reference_id VARCHAR(100);

-- Add index for payment_status
CREATE INDEX IF NOT EXISTS idx_onboarding_payment_status ON onboarding_cases(payment_status);

-- Update existing records to have payment_status = 'pending'
UPDATE onboarding_cases 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;

-- Comment for documentation
COMMENT ON COLUMN onboarding_cases.payment_status IS 'Common fees payment status from Payment Team event: pending, paid, failed';
COMMENT ON COLUMN onboarding_cases.payment_verified_at IS 'Timestamp when payment.invoice.commonfees.completed event received';
COMMENT ON COLUMN onboarding_cases.payment_amount IS 'Common fees amount paid (from Payment Team event)';
COMMENT ON COLUMN onboarding_cases.payment_reference_id IS 'Payment reference ID from Payment Team';
