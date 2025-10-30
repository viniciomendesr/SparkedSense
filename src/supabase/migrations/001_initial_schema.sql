-- =====================================================
-- Sparked Sense Database Schema
-- Single Supabase Instance for Backend & Frontend
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- Devices/Sensors Table
-- =====================================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private', -- 'public', 'private', 'partial'
  mode TEXT NOT NULL DEFAULT 'real', -- 'real' or 'mock'
  status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'reconnecting'
  
  -- Device authentication
  mac_address TEXT,
  public_key TEXT,
  claim_token TEXT UNIQUE,
  
  -- Ownership
  owner_wallet TEXT,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Display
  thumbnail_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_owner_user ON devices(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_devices_owner_wallet ON devices(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_devices_claim_token ON devices(claim_token);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_visibility ON devices(visibility);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_mode ON devices(mode);

-- =====================================================
-- Sensor Readings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  
  -- Reading data
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  variable TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verification_hash TEXT,
  signature TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_sensor ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_timestamp ON sensor_readings(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_verification_hash ON sensor_readings(verification_hash);
CREATE INDEX IF NOT EXISTS idx_readings_verified ON sensor_readings(verified);

-- =====================================================
-- Datasets Table
-- =====================================================
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sensor_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  
  -- Dataset range
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  readings_count INTEGER DEFAULT 0,
  
  -- Blockchain anchoring
  status TEXT NOT NULL DEFAULT 'preparing', -- 'preparing', 'anchoring', 'anchored', 'failed'
  merkle_root TEXT,
  transaction_id TEXT,
  anchored_tx TEXT,
  blockchain_explorer_url TEXT,
  
  -- Visibility & Access
  is_public BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  anchored_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_datasets_sensor ON datasets(sensor_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_is_public ON datasets(is_public);
CREATE INDEX IF NOT EXISTS idx_datasets_merkle_root ON datasets(merkle_root);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets(created_at DESC);

-- =====================================================
-- Audit Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Action details
  action TEXT NOT NULL, -- 'dataset_view', 'dataset_verify', 'reading_verify', etc.
  entity_type TEXT NOT NULL, -- 'dataset', 'sensor', 'reading'
  entity_id UUID NOT NULL,
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_address TEXT,
  ip_address TEXT,
  
  -- Verification details (if applicable)
  verification_success BOOLEAN,
  verification_data JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for devices table
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: Users can read/update their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Devices: Users can CRUD their own devices
CREATE POLICY "Users can read own devices" ON devices
  FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create devices" ON devices
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own devices" ON devices
  FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own devices" ON devices
  FOR DELETE USING (owner_user_id = auth.uid());

-- Public devices: Anyone can read public devices
CREATE POLICY "Anyone can read public devices" ON devices
  FOR SELECT USING (visibility = 'public');

-- Sensor Readings: Users can read/write readings for their devices
CREATE POLICY "Users can read readings from own devices" ON sensor_readings
  FOR SELECT USING (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create readings for own devices" ON sensor_readings
  FOR INSERT WITH CHECK (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

-- Public readings: Anyone can read readings from public devices
CREATE POLICY "Anyone can read public sensor readings" ON sensor_readings
  FOR SELECT USING (
    sensor_id IN (
      SELECT id FROM devices WHERE visibility = 'public'
    )
  );

-- Datasets: Users can CRUD datasets for their devices
CREATE POLICY "Users can read datasets from own devices" ON datasets
  FOR SELECT USING (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create datasets for own devices" ON datasets
  FOR INSERT WITH CHECK (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update datasets for own devices" ON datasets
  FOR UPDATE USING (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete datasets for own devices" ON datasets
  FOR DELETE USING (
    sensor_id IN (
      SELECT id FROM devices WHERE owner_user_id = auth.uid()
    )
  );

-- Public datasets: Anyone can read public datasets
CREATE POLICY "Anyone can read public datasets" ON datasets
  FOR SELECT USING (
    is_public = true AND sensor_id IN (
      SELECT id FROM devices WHERE visibility = 'public'
    )
  );

-- Audit logs: Users can read their own audit logs
CREATE POLICY "Users can read own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Service role can bypass RLS for all operations
CREATE POLICY "Service role full access devices" ON devices
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access readings" ON sensor_readings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access datasets" ON datasets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Helper Views
-- =====================================================

-- View for public sensors with metrics
CREATE OR REPLACE VIEW public_sensors_with_metrics AS
SELECT 
  d.id,
  d.name,
  d.type,
  d.description,
  d.status,
  d.thumbnail_url,
  d.created_at,
  d.updated_at,
  COUNT(DISTINCT sr.id) AS total_readings_count,
  COUNT(DISTINCT CASE WHEN ds.is_public = true THEN ds.id END) AS public_datasets_count,
  COUNT(DISTINCT CASE WHEN ds.status = 'anchored' AND ds.is_public = true THEN ds.id END) AS verified_datasets_count,
  MAX(sr.timestamp) AS last_reading_timestamp
FROM devices d
LEFT JOIN sensor_readings sr ON d.id = sr.sensor_id
LEFT JOIN datasets ds ON d.id = ds.sensor_id
WHERE d.visibility = 'public'
GROUP BY d.id;

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Insert sample user (comment out in production)
-- INSERT INTO users (id, wallet_address, email, name)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'SampleWallet123...', 'user@example.com', 'Sample User')
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- Grants
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public_sensors_with_metrics TO anon, authenticated;
