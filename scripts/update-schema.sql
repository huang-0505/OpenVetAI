-- Add missing columns to processed_data table
ALTER TABLE processed_data 
ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Update existing records to have default values
UPDATE processed_data 
SET uploaded_by = 'unknown', user_id = 'unknown' 
WHERE uploaded_by IS NULL OR user_id IS NULL;
