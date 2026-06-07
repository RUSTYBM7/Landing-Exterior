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
CREATE POLICY "Allow public read access to shipments" ON shipments
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to tracking events" ON tracking_events
    FOR SELECT USING (true);

-- Create policy for authenticated users to manage shipments
CREATE POLICY "Authenticated users can insert shipments" ON shipments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments" ON shipments
    FOR UPDATE USING (true);

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
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO shipments (tracking_number, status, origin, destination, sender_name, receiver_name, service_type)
VALUES
    ('AP123456789', 'In Transit', 'Singapore', 'Kuala Lumpur', 'ABC Company', 'John Doe', 'Express'),
    ('AP987654321', 'Delivered', 'Singapore', 'Penang', 'XYZ Trading', 'Jane Smith', 'Standard'),
    ('AP456789123', 'Pending', 'Singapore', 'Johor Bahru', 'Test Corp', 'Mike Johnson', 'Economy')
ON CONFLICT (tracking_number) DO NOTHING;

-- Insert sample tracking events
DO $$
DECLARE
    shipment1_id BIGINT;
    shipment2_id BIGINT;
    shipment3_id BIGINT;
BEGIN
    SELECT id INTO shipment1_id FROM shipments WHERE tracking_number = 'AP123456789';
    SELECT id INTO shipment2_id FROM shipments WHERE tracking_number = 'AP987654321';
    SELECT id INTO shipment3_id FROM shipments WHERE tracking_number = 'AP456789123';

    -- Shipment 1 events
    IF shipment1_id IS NOT NULL THEN
        INSERT INTO tracking_events (shipment_id, title, location, event_date) VALUES
            (shipment1_id, 'Shipment Picked Up', 'Singapore Warehouse', NOW() - INTERVAL '3 days'),
            (shipment1_id, 'In Transit to Destination', 'Singapore Sorting Center', NOW() - INTERVAL '2 days'),
            (shipment1_id, 'Customs Clearance', 'Border Crossing', NOW() - INTERVAL '1 day'),
            (shipment1_id, 'Out for Delivery', 'Kuala Lumpur Distribution Center', NOW());
    END IF;

    -- Shipment 2 events
    IF shipment2_id IS NOT NULL THEN
        INSERT INTO tracking_events (shipment_id, title, location, event_date) VALUES
            (shipment2_id, 'Shipment Picked Up', 'Singapore Warehouse', NOW() - INTERVAL '5 days'),
            (shipment2_id, 'In Transit to Destination', 'Singapore Sorting Center', NOW() - INTERVAL '4 days'),
            (shipment2_id, 'Customs Clearance', 'Border Crossing', NOW() - INTERVAL '3 days'),
            (shipment2_id, 'Out for Delivery', 'Penang Distribution Center', NOW() - INTERVAL '2 days'),
            (shipment2_id, 'Delivered', 'Penang', NOW() - INTERVAL '1 day');
    END IF;

    -- Shipment 3 events
    IF shipment3_id IS NOT NULL THEN
        INSERT INTO tracking_events (shipment_id, title, location, event_date) VALUES
            (shipment3_id, 'Shipment Created', 'Singapore', NOW() - INTERVAL '1 hour');
    END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;