-- Migration script to update DBVClass enum values before schema change
-- This script must be run BEFORE deploying the new schema

-- Step 1: Update all LIDER records to GUIA (highest regular class)
UPDATE "User" 
SET "dbvClass" = 'GUIA' 
WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO');

UPDATE "Requirement" 
SET "dbvClass" = 'GUIA' 
WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO');

UPDATE "UserProgress" up
SET "dbvClass" = 'GUIA'
FROM "Requirement" r
WHERE up."requirementId" = r.id 
AND r."dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO');

-- Verify the update
SELECT 'Users with old classes' as check_type, COUNT(*) as count
FROM "User" 
WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO')
UNION ALL
SELECT 'Requirements with old classes', COUNT(*)
FROM "Requirement" 
WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO');

-- Expected result: both counts should be 0
