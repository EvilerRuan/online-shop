-- Create retail_addresses table
CREATE TABLE IF NOT EXISTS retail_addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  detail TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_retail_addresses_user_id ON retail_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_retail_addresses_is_default ON retail_addresses(is_default);

-- Enable RLS
ALTER TABLE retail_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view and modify their own addresses
CREATE POLICY "Users can view own addresses"
  ON retail_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
  ON retail_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON retail_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON retail_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (bypass RLS)
CREATE POLICY "Service role full access"
  ON retail_addresses FOR ALL
  USING (true)
  WITH CHECK (true);
