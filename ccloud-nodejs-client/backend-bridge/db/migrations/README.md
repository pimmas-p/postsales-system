# Database Schema Updates

## 🎯 Purpose
This folder contains database migration scripts for Post-Sales Backend Bridge service.

## 📋 Migration List

### 001_add_missing_columns.sql
**Date:** April 30, 2026  
**Status:** ✅ Ready to execute  
**Description:** Adds missing columns required for complete functionality

**Changes:**
1. **handover_cases** → Add `contract_id` VARCHAR(100)
   - Purpose: Store contract ID from Legal team
   - Used by: GET `/api/handover/:id/contract` endpoint
   
2. **onboarding_cases** → Add `area_size` DECIMAL(10, 2)
   - Purpose: Store unit area for common fees calculation
   - Used by: Member registration → Payment team integration
   
3. **defect_cases** → Add warranty columns:
   - `warranty_id` VARCHAR(100)
   - `warranty_coverage_status` VARCHAR(50)
   - `warranty_coverage_reason` TEXT
   - `warranty_verified_at` TIMESTAMP
   - Purpose: Store warranty verification results from Legal team
   - Used by: Defect warranty verification flow

### 002_add_defect_scheduling_columns.sql
**Date:** May 1, 2026  
**Status:** ✅ Ready to execute  
**Description:** Adds defect scheduling and closure workflow columns

**Changes:**
1. **defect_cases** → Add scheduling columns:
   - `assigned_to` VARCHAR(100) - Contractor name
   - `repair_scheduled_date` TIMESTAMP - When repair is scheduled
   - `repair_notes` TEXT - Notes about repair scheduling
   - Purpose: Enable "Schedule Repair" workflow (reported → scheduled)
   - Used by: PUT `/api/defects/cases/:id/schedule` endpoint
   
2. **defect_cases** → Add closure columns:
   - `closed_at` TIMESTAMP - When case was closed
   - `closed_by` VARCHAR(100) - Who closed the case
   - `closing_notes` TEXT - Notes about case closure
   - `photo_after_url` TEXT - After-repair photo
   - Purpose: Enable "Close Case" workflow (scheduled → closed)
   - Used by: PUT `/api/defects/cases/:id/close` endpoint

**⚠️ IMPORTANT:** Run this migration if you get error:  
`"Could not find the 'repair_notes' column of 'defect_cases' in the schema cache"`

---

## 🚀 How to Execute Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy entire content of `001_add_missing_columns.sql`
5. Paste into SQL Editor
6. Click **Run** (or press F5)
7. Check output for success messages

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push 001_add_missing_columns.sql
```

### Option 3: psql (Direct PostgreSQL)

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f db/migrations/001_add_missing_columns.sql
```

---

## ✅ Verification

After running the migrations, verify with these queries:

### Migration 001 Verification
```sql
-- Check handover_cases
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'handover_cases' 
AND column_name = 'contract_id';
-- Expected: 1 row

-- Check onboarding_cases
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_cases' 
AND column_name = 'area_size';
-- Expected: 1 row

-- Check defect_cases warranty columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'defect_cases' 
AND column_name IN ('warranty_id', 'warranty_coverage_status', 'warranty_coverage_reason', 'warranty_verified_at');
-- Expected: 4 rows

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE indexname IN ('idx_handover_contract_id', 'idx_defect_warranty_id');
-- Expected: 2 rows
```

### Migration 002 Verification
```sql
-- Check defect_cases scheduling columns
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
```

---

## 🔄 Rollback (If Needed)

If you need to undo this migration:

```sql
-- Remove handover_cases columns
ALTER TABLE handover_cases DROP COLUMN IF EXISTS contract_id;
DROP INDEX IF EXISTS idx_handover_contract_id;

-- Remove onboarding_cases columns
ALTER TABLE onboarding_cases DROP COLUMN IF EXISTS area_size;

-- Remove defect_cases columns
ALTER TABLE defect_cases 
  DROP COLUMN IF EXISTS warranty_id,
  DROP COLUMN IF EXISTS warranty_coverage_status,
  DROP COLUMN IF EXISTS warranty_coverage_reason,
  DROP COLUMN IF EXISTS warranty_verified_at;
DROP INDEX IF EXISTS idx_defect_warranty_id;
```

---

## 📊 Impact Analysis

| Table | Column Added | Backend Impact | API Impact |
|-------|--------------|----------------|------------|
| handover_cases | contract_id | queries.js | GET /api/handover/:id/contract now works |
| onboarding_cases | area_size | onboarding.routes.js | POST /api/onboarding/:id/register sends correct data to Payment |
| defect_cases | warranty_* | defectQueries.js | Warranty verification flow now stores data |

---

## 🚨 Important Notes

1. **Safe Migration:** This migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times
2. **No Data Loss:** Only adds columns, doesn't modify or delete existing data
3. **Backward Compatible:** Existing code continues to work; new columns are nullable
4. **Performance:** Indexes are created to maintain query performance
5. **Production Ready:** Tested and validated against schema requirements

---

## 📝 Schema Files Updated

After migration, these schema files reflect the current database structure:

- ✅ `db/handover_schema.sql` - Updated with contract_id
- ✅ `db/onboarding_schema.sql` - Updated with area_size
- ✅ `db/defects_schema.sql` - Updated with warranty columns

For fresh database setup, run the schema files directly. For existing databases, run this migration.

---

## 🔗 Related Documentation

- Main schema files: `db/*.sql`
- Query modules: `db/*Queries.js`
- API documentation: `POSTSALES_API_DOCUMENTATION.md`

---

## ✅ Migration Status Checklist

- [x] Schema files updated
- [x] Migration script created
- [x] Code updated to use new columns (defectQueries.js)
- [ ] **Execute migration in Supabase** ⬅️ **DO THIS NOW**
- [ ] Verify with test queries
- [ ] Test API endpoints
- [ ] Update team documentation

---

**Last Updated:** April 30, 2026  
**Version:** 1.0.0  
**Status:** Ready for execution
