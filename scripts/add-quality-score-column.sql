-- Add quality_score column to processed_data table
ALTER TABLE processed_data 
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Add index for faster filtering by quality score
CREATE INDEX IF NOT EXISTS idx_processed_data_quality_score 
ON processed_data(quality_score);

-- Update existing records to have a quality score (you can run this after the column is added)
-- This is just a placeholder - the actual scores will be calculated by the application
UPDATE processed_data 
SET quality_score = 50 
WHERE quality_score = 0 OR quality_score IS NULL;
