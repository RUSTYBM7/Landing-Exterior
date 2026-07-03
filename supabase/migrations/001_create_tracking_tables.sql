-- Airpak Express Tracking System Database Schema
-- Run this in your Supabase SQL Editor to set up the tracking database

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    origin VARCHAR(100) DEFAULT 'Singapore',
    destination VARCHAR(100) NOT NULL,
    sender_name VARCHAR(100),
    sender_address TEXT,
    receiver_name VARCHAR(100),
    receiver_address TEXT,
    weight DECIMAL(10,2),
    dimensions VARCHAR(50),
    service_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tracking events table
CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    event_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id ON tracking_events(shipment_id);

-- Enable Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for tracking)
DROP POLICY IF EXISTS "Allow public read access to shipments" ON shipments;
CREATE POLICY "Allow public read access to shipments" ON shipments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to tracking events" ON tracking_events;
CREATE POLICY "Allow public read access to tracking events" ON tracking_events
    FOR SELECT USING (true);

-- Create policy for authenticated users to manage shipments
DROP POLICY IF EXISTS "Authenticated users can insert shipments" ON shipments;
CREATE POLICY "Authenticated users can insert shipments" ON shipments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update shipments" ON shipments;
CREATE POLICY "Authenticated users can update shipments" ON shipments
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert tracking events" ON tracking_events;
CREATE POLICY "Authenticated users can insert tracking events" ON tracking_events
    FOR INSERT WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- (sample data omitted; schema is pre-existing on remote)
