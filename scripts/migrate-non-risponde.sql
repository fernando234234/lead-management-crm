-- Migration script: Convert NON_RISPONDE to RICHIAMARE
-- Run this SQL in Supabase SQL Editor before deploying

-- Step 1: Update all leads with NON_RISPONDE to RICHIAMARE
UPDATE "Lead"
SET "callOutcome" = 'RICHIAMARE'
WHERE "callOutcome" = 'NON_RISPONDE';

-- Step 2: Update any activity metadata that references NON_RISPONDE
UPDATE "LeadActivity"
SET metadata = jsonb_set(metadata, '{callOutcome}', '"RICHIAMARE"')
WHERE metadata->>'callOutcome' = 'NON_RISPONDE';

-- Verify the changes
SELECT 'Leads with NON_RISPONDE after migration:' as check_type, COUNT(*) as count
FROM "Lead"
WHERE "callOutcome" = 'NON_RISPONDE';

SELECT 'Leads with RICHIAMARE after migration:' as check_type, COUNT(*) as count
FROM "Lead"
WHERE "callOutcome" = 'RICHIAMARE';

-- After running this script successfully, you can safely remove NON_RISPONDE from the enum:
-- ALTER TYPE "CallOutcome" RENAME VALUE 'NON_RISPONDE' TO 'NON_RISPONDE_DEPRECATED';
-- Note: PostgreSQL doesn't support DROP VALUE from enum, so we rename it instead
