-- ============================================
-- Migration: Add Missing Columns to Existing Tables
-- Date: April 30, 2026
-- Description: Add contract_id, area_size, and warranty columns
-- ============================================

-- ============================================
-- 1. Add contract_id to handover_cases
-- ============================================
-- This column stores the contract ID from Legal team
-- Used by GET /api/handover/:id/contract endpoint

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'handover_cases' 
        AND column_name = 'contract_id'
    ) THEN
        ALTER TABLE handover_cases 
        ADD COLUMN contract_id VARCHAR(100);
        
        CREATE INDEX IF NOT EXISTS idx_handover_contract_id 
        ON handover_cases(contract_id);
        
        RAISE NOTICE 'Added contract_id column to handover_cases';
    ELSE
        RAISE NOTICE 'Column contract_id already exists in handover_cases';
    END IF;
END $$;

-- ============================================
-- 2. Add area_size to onboarding_cases
-- ============================================
-- This column stores unit area in square meters
-- Used for common fees calculation sent to Payment team

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_cases' 
        AND column_name = 'area_size'
    ) THEN
        ALTER TABLE onboarding_cases 
        ADD COLUMN area_size DECIMAL(10, 2);
        
        RAISE NOTICE 'Added area_size column to onboarding_cases';
    ELSE
        RAISE NOTICE 'Column area_size already exists in onboarding_cases';
    END IF;
END $$;

-- ============================================
-- 3. Add warranty columns to defect_cases
-- ============================================
-- These columns store warranty verification results from Legal team
-- Used by warranty coverage verification flow

DO $$ 
BEGIN
    -- warranty_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'warranty_id'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN warranty_id VARCHAR(100);
        
        RAISE NOTICE 'Added warranty_id column to defect_cases';
    ELSE
        RAISE NOTICE 'Column warranty_id already exists in defect_cases';
    END IF;
    
    -- warranty_coverage_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'warranty_coverage_status'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN warranty_coverage_status VARCHAR(50);
        
        RAISE NOTICE 'Added warranty_coverage_status column to defect_cases';
    ELSE
        RAISE NOTICE 'Column warranty_coverage_status already exists in defect_cases';
    END IF;
    
    -- warranty_coverage_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'warranty_coverage_reason'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN warranty_coverage_reason TEXT;
        
        RAISE NOTICE 'Added warranty_coverage_reason column to defect_cases';
    ELSE
        RAISE NOTICE 'Column warranty_coverage_reason already exists in defect_cases';
    END IF;
    
    -- warranty_verified_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'warranty_verified_at'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN warranty_verified_at TIMESTAMP;
        
        RAISE NOTICE 'Added warranty_verified_at column to defect_cases';
    ELSE
        RAISE NOTICE 'Column warranty_verified_at already exists in defect_cases';
    END IF;
    
    -- Create index on warranty_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_defect_warranty_id'
    ) THEN
        CREATE INDEX idx_defect_warranty_id ON defect_cases(warranty_id);
        RAISE NOTICE 'Created index idx_defect_warranty_id';
    ELSE
        RAISE NOTICE 'Index idx_defect_warranty_id already exists';
    END IF;
END $$;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the migration was successful

-- Check handover_cases columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'handover_cases' 
AND column_name IN ('contract_id')
ORDER BY column_name;

-- Check onboarding_cases columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_cases' 
AND column_name IN ('area_size')
ORDER BY column_name;

-- Check defect_cases columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'defect_cases' 
AND column_name IN ('warranty_id', 'warranty_coverage_status', 'warranty_coverage_reason', 'warranty_verified_at')
ORDER BY column_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('handover_cases', 'defect_cases')
AND indexname IN ('idx_handover_contract_id', 'idx_defect_warranty_id')
ORDER BY tablename, indexname;
