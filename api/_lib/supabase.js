/**
 * Server-side Supabase client. Uses SERVICE_ROLE_KEY to bypass RLS.
 * NEVER expose this key to the browser.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://zygoqqsgzhgpvlpttfbk.supabase.co';

const SUPABASE_SERVICE_ROLE =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_ROLE) {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY missing — admin operations will fail');
}

const supabase = SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

module.exports = { supabase, SUPABASE_URL };