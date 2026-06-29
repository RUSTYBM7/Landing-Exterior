-- ============================================================
-- AirPak Express — AI Swarm (knowledge base + audit log)
-- Run AFTER 001/002/003 in this repo and AFTER chat_schema.sql
-- in airpak-portal. Adds a pgvector-backed RAG knowledge base.
-- ============================================================

-- pgvector is required. Supabase has it on the free tier.
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- KNOWLEDGE BASE (RAG corpus)
-- Each row is one chunk of knowledge (FAQ, service, prohibited
-- item, etc.). Embeddings are 384-dim to match the default
-- sentence-transformers/all-MiniLM-L6-v2 model.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_kb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source       TEXT,                  -- 'faq' | 'service' | 'policy' | 'custom'
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    tags         TEXT[] DEFAULT '{}',
    locale       TEXT DEFAULT 'en',
    -- 384 dims to match all-MiniLM-L6-v2; switch to 1024 for bge-large etc.
    embedding    vector(384),
    -- optional metadata for ranking / filtering
    metadata     JSONB DEFAULT '{}'::jsonb,
    active       BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_kb_active ON ai_kb(active);
CREATE INDEX IF NOT EXISTS idx_ai_kb_source ON ai_kb(source);
CREATE INDEX IF NOT EXISTS idx_ai_kb_locale ON ai_kb(locale);
-- ivfflat is fine for small/medium corpora (<100k chunks)
CREATE INDEX IF NOT EXISTS idx_ai_kb_embedding
    ON ai_kb USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- AI RUN LOG (audit + cost tracking)
-- One row per /api/ai/chat call. Stores which skill ran, the
-- provider, tokens, latency, errors. Lets the admin tune.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_runs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID,
    ticket_id  UUID,
    visitor_id TEXT,
    skill      TEXT,                    -- 'router' | 'tracking' | 'rates' | 'faq' | 'intake' | 'escalate'
    provider   TEXT,                    -- 'huggingface' | 'together' | 'ollama' | 'webllm' | 'fallback'
    model      TEXT,
    prompt     TEXT,
    response   TEXT,
    tokens_in  INT,
    tokens_out INT,
    latency_ms INT,
    error      TEXT,
    metadata   JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_session ON ai_runs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_skill   ON ai_runs(skill, created_at DESC);

-- ============================================================
-- SIMILARITY SEARCH FUNCTION
-- Returns the top-K most similar chunks for a query embedding.
-- Used by /api/ai/skills/faq.js and the intake skill.
-- ============================================================
CREATE OR REPLACE FUNCTION ai_kb_search(
    query_embedding vector(384),
    match_count    INT     DEFAULT 5,
    match_threshold FLOAT  DEFAULT 0.55,
    filter_source  TEXT    DEFAULT NULL,
    filter_locale  TEXT    DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    source TEXT,
    tags TEXT[],
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.title,
        k.content,
        k.source,
        k.tags,
        k.metadata,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM ai_kb k
    WHERE k.active = true
      AND k.locale = filter_locale
      AND (filter_source IS NULL OR k.source = filter_source)
      AND 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY k.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- RLS — KB is admin-only writes, anyone can read for search
-- ============================================================
ALTER TABLE ai_kb   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read ai_kb" ON ai_kb;
CREATE POLICY "public read ai_kb" ON ai_kb FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "public insert ai_runs" ON ai_runs;
CREATE POLICY "public insert ai_runs" ON ai_runs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public read ai_runs" ON ai_runs;
CREATE POLICY "public read ai_runs" ON ai_runs FOR SELECT USING (true);

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- SEED: starter knowledge base (English).
-- Embeddings are intentionally NULL — /api/ai/ingest fills them.
-- ============================================================
INSERT INTO ai_kb (source, title, content, tags, locale) VALUES
  ('faq', 'How do I track my Airpak Express shipment?',
   'You can track any Airpak Express shipment in three ways: (1) visit airpak-express.site/tracking and enter your tracking number, (2) use the Track Shipment link in the top menu of any page, or (3) tap the chat bubble at the bottom right and ask the assistant. Tracking numbers start with "AP" or "TRK" followed by 9-12 digits.',
   ARRAY['tracking','shipment','faq'], 'en'),

  ('faq', 'What shipping services does Airpak Express offer?',
   'Airpak Express offers five shipping services: Economy (5-7 business days, lowest cost), Standard (3-5 days), Express (1-2 days, most popular), Overnight (next business day), and International Priority (3-7 days for cross-border shipments). Service availability depends on origin and destination countries.',
   ARRAY['services','rates','faq'], 'en'),

  ('faq', 'How is shipping cost calculated?',
   'Shipping cost depends on four factors: (1) destination zone (domestic vs international), (2) actual weight or dimensional weight — whichever is greater, (3) selected service level, and (4) any declared value for insurance. Dimensional weight = (L × W × H in cm) / 5000. Use the chat assistant to get an instant estimate.',
   ARRAY['rates','cost','pricing','faq'], 'en'),

  ('faq', 'What items are prohibited from shipping?',
   'Airpak Express cannot ship: explosives and fireworks, flammable liquids and gases, toxic or infectious substances, radioactive material, weapons and ammunition, narcotics and controlled substances, live animals, currency and bearer instruments, perishables requiring refrigeration (unless pre-arranged), and counterfeit goods. Lithium batteries require special handling and prior approval.',
   ARRAY['prohibited','restricted','policy','faq'], 'en'),

  ('faq', 'How long does customs clearance take for international shipments?',
   'Standard customs clearance takes 24-72 hours. Delays may occur if (a) the recipient cannot be reached for duty payment, (b) additional documentation is requested, or (c) the destination country is conducting random inspections. Tracking events will show "Customs Clearance" status with location details.',
   ARRAY['customs','international','clearance','faq'], 'en'),

  ('faq', 'Can I change the delivery address after shipping?',
   'Address changes are possible before the package is dispatched from the origin facility. Once in transit, address changes incur a rerouting fee (typically $15-35 depending on destination) and may delay delivery by 1-2 days. Contact support immediately with your tracking number to request a change.',
   ARRAY['address','reroute','faq'], 'en'),

  ('faq', 'What is Airpak Express'' refund and return policy?',
   'If a shipment is lost or damaged in transit, Airpak Express will refund the shipping cost and the declared value (up to insured amount). Claims must be filed within 30 days of the expected delivery date with photo evidence of damage. Insurance is optional and priced at 1% of declared value, minimum $2.',
   ARRAY['refund','return','insurance','claims','faq'], 'en'),

  ('service', 'Worldwide Express & Domestic Express',
   'Door-to-door express delivery to 220+ countries. Same-day pickup available in Singapore, Malaysia, and Hong Kong. Includes real-time tracking, signature on delivery, and basic insurance up to $100. Transit time: 1-3 business days international, next-day domestic in supported cities.',
   ARRAY['service','express','international'], 'en'),

  ('service', 'Warehousing & Fulfillment',
   'Climate-controlled warehouses in Singapore (60,000 sqft), Hong Kong (45,000 sqft), and Kuala Lumpur (30,000 sqft). Services include pick-and-pack, kitting, returns processing, B2B/B2C fulfillment, and integration with Shopify, Amazon, Lazada, and Shopee. Real-time inventory API available.',
   ARRAY['service','warehousing','fulfillment','3pl'], 'en'),

  ('service', 'Worldwide Freight Forwarding',
   'FCL (Full Container Load) and LCL (Less than Container Load) ocean freight, plus air freight for time-sensitive cargo. Custom clearance, cargo insurance, and door-to-door delivery included. Major trade lanes: Asia-North America, Asia-Europe, Intra-Asia, Asia-Middle East.',
   ARRAY['service','freight','ocean','air'], 'en'),

  ('service', 'International Logistics Solutions',
   'Cross-border eCommerce logistics: DDP (Delivered Duty Paid), DDU (Delivered Duty Unpaid), and DAP (Delivered at Place) options. Integrations with marketplaces and shopping carts. Returns consolidation for European and US sellers shipping from Asia.',
   ARRAY['service','ecommerce','cross-border','ddp'], 'en'),

  ('policy', 'Privacy and Data Handling',
   'Airpak Express collects only the data needed to ship your parcel: sender and receiver names, addresses, phone numbers, email, and optional declared value. Data is encrypted in transit (TLS 1.3) and at rest (AES-256). We do not sell or share data with third parties except as required to complete delivery (e.g., customs).',
   ARRAY['privacy','gdpr','policy'], 'en'),

  ('faq', 'How do I contact Airpak Express customer support?',
   'Three ways: (1) tap the chat bubble at the bottom right of any page for instant help, (2) email support@airpak-express.site, or (3) call +65 6743 9200 (Singapore HQ) Mon-Fri 9am-6pm SGT. For WhatsApp, you can message our business number after signing up at shipnow.airpak-express.site.',
   ARRAY['support','contact','help'], 'en'),

  ('faq', 'What payment methods do you accept?',
   'Airpak Express accepts: Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay, bank transfer (for accounts in SGD/USD/EUR), and Airpak Wallet (prepaid). Corporate accounts can request NET-30 invoicing after a credit check.',
   ARRAY['payment','billing','faq'], 'en'),

  ('faq', 'Do you offer Cash on Delivery (COD)?',
   'Yes, COD is available for domestic shipments within Singapore, Malaysia, Philippines, Indonesia, Thailand, and Vietnam. COD fee is 3% of declared value (minimum $2). The collected amount is remitted to the shipper within 5-7 business days.',
   ARRAY['cod','payment','faq'], 'en')
ON CONFLICT DO NOTHING;

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION ai_kb_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_kb_updated_at ON ai_kb;
CREATE TRIGGER trg_ai_kb_updated_at
BEFORE UPDATE ON ai_kb
FOR EACH ROW EXECUTE FUNCTION ai_kb_set_updated_at();