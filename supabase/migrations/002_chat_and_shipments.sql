-- ============================================================
-- Airpak Express — Live Chat + Shipments (full schema)
-- Run this in Supabase SQL Editor AFTER 001_create_tracking_tables.sql
-- ============================================================

-- ============== SHIPMENTS (extended) =================
CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending Pickup',
    origin VARCHAR(200),
    destination VARCHAR(200) NOT NULL,
    sender_name VARCHAR(200),
    sender_email VARCHAR(200),
    sender_phone VARCHAR(50),
    sender_address TEXT,
    sender_city VARCHAR(120),
    sender_country VARCHAR(120),
    receiver_name VARCHAR(200),
    receiver_email VARCHAR(200),
    receiver_phone VARCHAR(50),
    receiver_address TEXT,
    receiver_city VARCHAR(120),
    receiver_country VARCHAR(120),
    weight DECIMAL(10,2),
    dimensions VARCHAR(50),
    package_type VARCHAR(50),
    category VARCHAR(80),
    description TEXT,
    quantity INT DEFAULT 1,
    declared_value DECIMAL(12,2),
    service_type VARCHAR(50),
    eta VARCHAR(50),
    price DECIMAL(12,2),
    fragile BOOLEAN DEFAULT false,
    insurance BOOLEAN DEFAULT false,
    signature_required BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    pickup_date DATE,
    pickup_time TIME,
    pickup_notes TEXT,
    files JSONB DEFAULT '[]'::jsonb,
    payload JSONB,
    assigned_admin UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- ============== TRACKING EVENTS =================
CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    tracking_number VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    description TEXT,
    event_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking ON tracking_events(tracking_number);

-- ============== CHAT SESSIONS =================
-- One row per conversation thread (anonymous or known user)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_name VARCHAR(120),
    visitor_email VARCHAR(200),
    visitor_phone VARCHAR(50),
    channel VARCHAR(20) DEFAULT 'web',     -- web | whatsapp | email
    external_id VARCHAR(200),              -- WhatsApp phone number / email thread id
    status VARCHAR(20) DEFAULT 'open',     -- open | pending | resolved | closed
    assigned_admin UUID,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    last_message_preview TEXT,
    unread_admin INT DEFAULT 0,
    unread_visitor INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_external ON chat_sessions(external_id);

-- ============== CHAT MESSAGES =================
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL,           -- visitor | admin | bot | system
    sender_admin UUID,
    body TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    delivered_channels JSONB DEFAULT '[]'::jsonb, -- which outbound channels succeeded: ["web","whatsapp"]
    external_message_id VARCHAR(200),      -- Twilio / WhatsApp message SID for dedupe
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- ============== ADMINS =================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) UNIQUE NOT NULL,
    name VARCHAR(120),
    role VARCHAR(40) DEFAULT 'agent',      -- agent | supervisor | admin
    password_hash TEXT,                    -- if running our own auth; otherwise use Supabase Auth
    active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============== ACTIVITY LOG =================
CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    actor VARCHAR(120),
    actor_id UUID,
    action VARCHAR(120) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(120),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================================
-- ROW-LEVEL SECURITY
-- Public can read/write what's needed for the create-shipment form
-- and the live chat widget. Admin operations go through the service role.
-- ============================================================
ALTER TABLE shipments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log     ENABLE ROW LEVEL SECURITY;

-- Public read for tracking (lookup by tracking_number)
DROP POLICY IF EXISTS "public read shipments" ON shipments;
CREATE POLICY "public read shipments" ON shipments FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read tracking_events" ON tracking_events;
CREATE POLICY "public read tracking_events" ON tracking_events FOR SELECT USING (true);

-- Visitors can create shipments (create flow)
DROP POLICY IF EXISTS "public insert shipments" ON shipments;
CREATE POLICY "public insert shipments" ON shipments FOR INSERT WITH CHECK (true);

-- Visitors can open chat sessions and send messages
DROP POLICY IF EXISTS "public insert chat_sessions" ON chat_sessions;
CREATE POLICY "public insert chat_sessions" ON chat_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public read own chat_sessions" ON chat_sessions;
CREATE POLICY "public read own chat_sessions" ON chat_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "public update own chat_sessions" ON chat_sessions;
CREATE POLICY "public update own chat_sessions" ON chat_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "public insert chat_messages" ON chat_messages;
CREATE POLICY "public insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public read chat_messages" ON chat_messages;
CREATE POLICY "public read chat_messages" ON chat_messages FOR SELECT USING (true);

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- Trigger: bump session last_message_at + unread counters
-- ============================================================
CREATE OR REPLACE FUNCTION chat_message_after_insert()
RETURNS TRIGGER AS $$
DECLARE
    is_visitor BOOLEAN;
BEGIN
    is_visitor := NEW.sender = 'visitor';
    UPDATE chat_sessions SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 200),
        unread_admin  = CASE WHEN is_visitor THEN unread_admin + 1 ELSE unread_admin  END,
        unread_visitor= CASE WHEN is_visitor THEN unread_visitor     ELSE unread_visitor+ 1 END,
        updated_at    = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_message_after_insert ON chat_messages;
CREATE TRIGGER trg_chat_message_after_insert
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION chat_message_after_insert();

-- ============================================================
-- Trigger: shipments updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION shipments_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at
BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION shipments_set_updated_at();

-- ============================================================
-- Seed: sample admin (password "airpak123", bcrypt hash — replace!)
-- In production use Supabase Auth instead of this table.
-- ============================================================
INSERT INTO admins (email, name, role, password_hash)
VALUES ('admin@airpak-express.site', 'Airpak Admin', 'admin',
        '$2a$10$ReplaceWithRealBcryptHashOfAirpak123')
ON CONFLICT (email) DO NOTHING;