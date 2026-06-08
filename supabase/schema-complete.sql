-- Airpak Express - Complete Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Custom users table (extends Supabase auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    telegram_id TEXT UNIQUE,
    telegram_username TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'support')),
    avatar_url TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT & MESSAGES
-- ============================================

-- Chat conversations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    visitor_session_id TEXT,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    source TEXT DEFAULT 'widget' CHECK (source IN ('widget', 'whatsapp', 'telegram', 'email', 'admin')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    last_admin_reply_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages in conversations
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'bot', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'audio', 'video', 'location', 'template')),
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster message retrieval
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_user ON public.conversations(user_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);

-- ============================================
-- WIDGET ANALYTICS
-- ============================================

-- Widget events tracking
CREATE TABLE public.widget_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    referrer TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_widget_events_session ON public.widget_events(session_id, created_at DESC);
CREATE INDEX idx_widget_events_type ON public.widget_events(event_type, created_at DESC);

-- ============================================
-- CONTACTS & LEADS
-- ============================================

-- Contact submissions
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    subject TEXT,
    message TEXT,
    source TEXT DEFAULT 'contact_form',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRACKING
-- ============================================

-- Shipment tracking
CREATE TABLE public.tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    origin TEXT,
    destination TEXT,
    status TEXT DEFAULT 'pending',
    estimated_delivery DATE,
    actual_delivery DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tracking events/history
CREATE TABLE public.tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id UUID REFERENCES public.tracking(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    event_time TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tracking_number ON public.tracking(tracking_number);
CREATE INDEX idx_tracking_user ON public.tracking(user_id);

-- ============================================
-- ADMIN TASKS & REMINDERS
-- ============================================

-- Admin tasks
CREATE TABLE public.admin_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reminders
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminders_remind_at ON public.reminders(remind_at, is_sent);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================

-- Email templates
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '[]',
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email queue
CREATE TABLE public.email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_queue_status ON public.email_queue(status, created_at);

-- ============================================
-- SETTINGS & CONFIGURATION
-- ============================================

-- System settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tracking_updated_at BEFORE UPDATE ON public.tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.admin_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update conversation last_message_at when new message arrives
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NOW(),
        unread_count = CASE WHEN NEW.sender_type = 'user' THEN unread_count + 1 ELSE unread_count END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER new_message_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = supabase_auth_id OR role = 'admin');
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = supabase_auth_id OR role = 'admin');

-- Conversations policies
CREATE POLICY "Anyone can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR role = 'admin');
CREATE POLICY "Admins can view all conversations" ON public.conversations
    FOR SELECT USING (role = 'admin' OR assigned_to IN (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()));

-- Messages policies
CREATE POLICY "Anyone can send messages" ON public.messages
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own conversation messages" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE user_id IN (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid())
            OR assigned_to IN (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE supabase_auth_id = auth.uid() AND role = 'admin')
    );

-- Contacts policies
CREATE POLICY "Anyone can submit contacts" ON public.contacts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage contacts" ON public.contacts
    FOR ALL USING (role = 'admin');

-- Tracking policies
CREATE POLICY "Anyone can search tracking" ON public.tracking
    FOR SELECT USING (true);
CREATE POLICY "Users can view own tracking" ON public.tracking
    FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE supabase_auth_id = auth.uid()) OR role = 'admin');

-- Widget events policies
CREATE POLICY "Anyone can track widget events" ON public.widget_events
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view widget events" ON public.widget_events
    FOR SELECT USING (role = 'admin');

-- Admin tasks policies
CREATE POLICY "Admins can manage tasks" ON public.admin_tasks
    FOR ALL USING (role = 'admin');

-- Reminders policies
CREATE POLICY "Admins can manage reminders" ON public.reminders
    FOR ALL USING (role = 'admin');

-- Email templates policies
CREATE POLICY "Admins can manage templates" ON public.email_templates
    FOR ALL USING (role = 'admin');
CREATE POLICY "Users can view active templates" ON public.email_templates
    FOR SELECT USING (is_active = true);

-- Settings policies
CREATE POLICY "Admins can manage settings" ON public.settings
    FOR ALL USING (role = 'admin');
CREATE POLICY "Anyone can view settings" ON public.settings
    FOR SELECT USING (true);

-- ============================================
-- INSERT DEFAULT SETTINGS
-- ============================================

INSERT INTO public.settings (key, value, description) VALUES
('business', '{"name": "Airpak Express", "email": "support@airpak-express.com", "phone": "+65 1234 5678", "address": "Singapore"}', 'Business information'),
('widget', '{"enabled": true, "welcome_message": "Welcome to Airpak Express! How can we help you?", "working_hours": "24/7", "response_time": "Instant"}', 'Widget configuration'),
('telegram', '{"enabled": false, "bot_token": "", "admin_ids": []}', 'Telegram configuration'),
('whatsapp', '{"enabled": false, "phone_number": "", "api_key": ""}', 'WhatsApp configuration');

-- ============================================
-- INSERT DEFAULT EMAIL TEMPLATES
-- ============================================

INSERT INTO public.email_templates (name, subject, body_html, category) VALUES
('welcome', 'Welcome to Airpak Express!', '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}},</mj-text><mj-text>Thank you for contacting Airpak Express. We''ll get back to you shortly.</mj-text></mj-column></mj-section></mj-body></mjml>', 'welcome'),
('auto_reply', 'We received your message', '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}},</mj-text><mj-text>Thank you for reaching out. Our team will respond within 24 hours.</mj-text></mj-column></mj-section></mj-body></mjml>', 'auto_reply'),
('support_response', 'Re: Your inquiry', '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}},</mj-text><mj-text>{{message}}</mj-text></mj-column></mj-section></mj-body></mjml>', 'support');