-- Add quality_score column to processed_data table
ALTER TABLE processed_data 
ADD COLUMN quality_score INTEGER DEFAULT 0;

-- Add index for faster filtering by quality score
CREATE INDEX idx_processed_data_quality_score ON processed_data(quality_score);

-- Update existing records to calculate quality scores
-- This would need to be done programmatically since we need the content analysis
