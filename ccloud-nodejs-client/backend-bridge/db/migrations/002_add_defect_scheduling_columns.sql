-- ============================================
-- Migration: Add Defect Scheduling Columns
-- Date: May 1, 2026
-- Description: Add missing columns for defect scheduling and closure workflow
-- ============================================

-- ============================================
-- Add scheduling and closure columns to defect_cases
-- ============================================
-- These columns are required for the 3-step defect workflow:
-- reported → scheduled → closed

DO $$ 
BEGIN
    -- assigned_to: Contractor name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN assigned_to VARCHAR(100);
        
        RAISE NOTICE 'Added assigned_to column to defect_cases';
    ELSE
        RAISE NOTICE 'Column assigned_to already exists in defect_cases';
    END IF;
    
    -- repair_scheduled_date: When repair is scheduled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'repair_scheduled_date'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN repair_scheduled_date TIMESTAMP;
        
        RAISE NOTICE 'Added repair_scheduled_date column to defect_cases';
    ELSE
        RAISE NOTICE 'Column repair_scheduled_date already exists in defect_cases';
    END IF;
    
    -- repair_notes: Notes about repair scheduling
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'repair_notes'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN repair_notes TEXT;
        
        RAISE NOTICE 'Added repair_notes column to defect_cases';
    ELSE
        RAISE NOTICE 'Column repair_notes already exists in defect_cases';
    END IF;
    
    -- closed_at: When case was closed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'closed_at'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN closed_at TIMESTAMP;
        
        RAISE NOTICE 'Added closed_at column to defect_cases';
    ELSE
        RAISE NOTICE 'Column closed_at already exists in defect_cases';
    END IF;
    
    -- closed_by: Who closed the case
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'closed_by'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN closed_by VARCHAR(100);
        
        RAISE NOTICE 'Added closed_by column to defect_cases';
    ELSE
        RAISE NOTICE 'Column closed_by already exists in defect_cases';
    END IF;
    
    -- closing_notes: Notes about case closure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'closing_notes'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN closing_notes TEXT;
        
        RAISE NOTICE 'Added closing_notes column to defect_cases';
    ELSE
        RAISE NOTICE 'Column closing_notes already exists in defect_cases';
    END IF;
    
    -- photo_after_url: After-repair photo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'defect_cases' 
        AND column_name = 'photo_after_url'
    ) THEN
        ALTER TABLE defect_cases 
        ADD COLUMN photo_after_url TEXT;
        
        RAISE NOTICE 'Added photo_after_url column to defect_cases';
    ELSE
        RAISE NOTICE 'Column photo_after_url already exists in defect_cases';
    END IF;
    
END $$;

-- ============================================
-- Verification Query
-- ============================================
-- Run this after migration to confirm all columns exist:
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'defect_cases' 
AND column_name IN (
    'assigned_to', 
    'repair_scheduled_date', 
    'repair_notes',
    'closed_at',
    'closed_by',
    'closing_notes',
    'photo_after_url'
)
ORDER BY column_name;
-- Expected: 7 rows
*/
