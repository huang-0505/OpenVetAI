-- Create the processed_data table
CREATE TABLE IF NOT EXISTS processed_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  original_content TEXT,
  processed_content TEXT,
  extracted_data JSONB,
  labels TEXT[],
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on name for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_processed_data_name ON processed_data(name);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_processed_data_status ON processed_data(status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_processed_data_updated_at 
    BEFORE UPDATE ON processed_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
