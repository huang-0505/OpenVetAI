-- Create the processed_data table with all necessary columns
CREATE TABLE IF NOT EXISTS processed_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('veterinary-journal', 'clinical-study', 'case-report', 'research-paper', 'other')),
  source TEXT NOT NULL CHECK (source IN ('upload', 'url')),
  original_content TEXT,
  processed_content TEXT,
  extracted_data JSONB,
  labels TEXT[],
  status TEXT DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_data_name ON processed_data(name);
CREATE INDEX IF NOT EXISTS idx_processed_data_status ON processed_data(status);
CREATE INDEX IF NOT EXISTS idx_processed_data_type ON processed_data(type);
CREATE INDEX IF NOT EXISTS idx_processed_data_created_at ON processed_data(created_at DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_processed_data_updated_at ON processed_data;
CREATE TRIGGER update_processed_data_updated_at 
    BEFORE UPDATE ON processed_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO processed_data (name, type, source, original_content, processed_content, extracted_data, labels, status)
VALUES 
  (
    'Sample Veterinary Study',
    'clinical-study',
    'upload',
    'This is a sample veterinary study about canine health...',
    'Sample study content...',
    '{"title": "Sample Veterinary Study", "summary": "A comprehensive study on canine health", "keyPoints": ["Health assessment", "Treatment protocols", "Recovery rates"], "metadata": {"Document Type": "Clinical Study", "Word Count": "~500 words"}}',
    ARRAY['Clinical Diagnosis', 'Small Animal Medicine'],
    'ready'
  )
ON CONFLICT (id) DO NOTHING;
