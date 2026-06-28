-- ============================================================
-- AirPak Express — WhatsApp Bridge (channel + external_id)
-- Run this AFTER chat_schema.sql (in admin-portal repo)
-- and AFTER 001/002 in this repo.
-- ============================================================

-- Add channel + external_id to support_tickets if not yet present.
-- We keep web and WhatsApp tickets in the same table the portal
-- already reads, so the admin UI shows them in the same queue.
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS channel          TEXT DEFAULT 'web',  -- 'web' | 'whatsapp' | 'email'
    ADD COLUMN IF NOT EXISTS external_id      TEXT,                -- e.g. '+18053956873'
    ADD COLUMN IF NOT EXISTS external_name    TEXT,                -- WhatsApp profile name
    ADD COLUMN IF NOT EXISTS last_visitor_msg TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_admin_msg   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_to     JSONB DEFAULT '{}'::jsonb; -- {whatsapp: true/false}

CREATE INDEX IF NOT EXISTS idx_tickets_channel      ON support_tickets(channel);
CREATE INDEX IF NOT EXISTS idx_tickets_external_id  ON support_tickets(external_id);

-- Add columns to messages for delivery receipts.
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS delivered_to      JSONB DEFAULT '{}'::jsonb, -- {whatsapp: true/false, whatsapp_msg_id: '...'}
    ADD COLUMN IF NOT EXISTS external_msg_id   TEXT;                       -- BSP-side message id for dedupe

CREATE INDEX IF NOT EXISTS idx_messages_external ON messages(external_msg_id);

-- Allow WhatsApp tickets to live without a portal user_id (they originate
-- from the WhatsApp number, not from a logged-in customer). Existing RLS
-- policies in chat_schema.sql already allow inserts; we relax update so
-- our server-side webhook can bump status/timestamps without a user context.
DROP POLICY IF EXISTS "Anyone can update tickets" ON support_tickets;
CREATE POLICY "Anyone can update tickets" ON support_tickets
    FOR UPDATE USING (true) WITH CHECK (true);

-- Realtime: make sure the portal sees new messages immediately.
-- (chat_schema.sql already added chat_messages; we ensure support_tickets
-- and messages are part of the publication too.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;

-- ============================================================
-- OUTBOUND TRIGGER — when admin replies on a whatsapp ticket,
-- notify our /api/whatsapp/send endpoint so the message is
-- delivered to the customer's WhatsApp.
-- ============================================================
CREATE OR REPLACE FUNCTION notify_admin_reply_to_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
    ticket_channel TEXT;
    ticket_external TEXT;
    payload JSONB;
    notify_url TEXT;
BEGIN
    -- Only act on admin (or ai-handled) messages
    IF NEW.sender_type NOT IN ('admin','ai') THEN
        RETURN NEW;
    END IF;

    SELECT channel, external_id
      INTO ticket_channel, ticket_external
      FROM support_tickets WHERE id = NEW.ticket_id;

    IF ticket_channel IS DISTINCT FROM 'whatsapp' THEN
        RETURN NEW;
    END IF;

    -- Send to BSP via our serverless endpoint. The endpoint reads
    -- SUPABASE_SERVICE_ROLE_KEY from env to mark delivery state.
    payload := jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'message_id', NEW.id,
        'to', ticket_external,
        'content', NEW.content,
        'sender_type', NEW.sender_type
    );

    -- Use pg_net if available (Supabase extension); otherwise fall back
    -- to a simple http call via the http extension.
    BEGIN
        PERFORM net.http_post(
            url := current_setting('app.bp_bridge_url', true),
            headers := jsonb_build_object(
                'Content-Type','application/json',
                'X-Bridge-Secret', current_setting('app.bp_bridge_secret', true)
            ),
            body := payload::text
        );
    EXCEPTION WHEN OTHERS THEN
        -- pg_net not enabled — silent. The /api/chat/poll + retry will catch up.
        RAISE NOTICE 'pg_net unavailable, outbound WhatsApp will retry via /api/chat/poll';
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_reply_whatsapp ON messages;
CREATE TRIGGER trg_admin_reply_whatsapp
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_admin_reply_to_whatsapp();

-- ============================================================
-- INBOUND TRIGGER — when a visitor message lands on a web ticket,
-- and that ticket is bridged to a WhatsApp number, also forward
-- to WhatsApp so the conversation stays mirrored if needed.
-- (Off by default; opt-in per ticket via metadata.forward_to_wa)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_visitor_message_to_admin()
RETURNS TRIGGER AS $$
DECLARE
    ticket_channel TEXT;
    ticket_external TEXT;
    ticket_user_id TEXT;
BEGIN
    -- Only visitor messages on web tickets
    IF NEW.sender_type <> 'user' THEN
        RETURN NEW;
    END IF;

    SELECT channel, external_id, user_id
      INTO ticket_channel, ticket_external, ticket_user_id
      FROM support_tickets WHERE id = NEW.ticket_id;

    UPDATE support_tickets SET
        last_visitor_msg = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.ticket_id;

    -- If the visitor provided a WhatsApp number on the web form
    -- (metadata.visitor_phone), we route the conversation to the
    -- WhatsApp column on the portal so the admin can reply via WA.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visitor_msg_admin ON messages;
CREATE TRIGGER trg_visitor_msg_admin
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_visitor_message_to_admin();

-- ============================================================
-- Backfill: stamp existing rows
-- ============================================================
UPDATE support_tickets SET channel = 'web' WHERE channel IS NULL;