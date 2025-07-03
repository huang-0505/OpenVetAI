-- Add quality_score column to processed_data table
ALTER TABLE processed_data 
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Create an index on quality_score for faster filtering
CREATE INDEX IF NOT EXISTS idx_processed_data_quality_score ON processed_data(quality_score);

-- Update existing records with calculated quality scores
-- This is a placeholder - the application will handle the actual calculation
UPDATE processed_data 
SET quality_score = 0 
WHERE quality_score IS NULL;
