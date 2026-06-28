/**
 * GET /api/whatsapp/health — quick status check.
 */
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
        ok: true,
        provider: (process.env.WHATSAPP_PROVIDER || 'twilio').toLowerCase(),
        from: process.env.WHATSAPP_FROM || '+18053956873',
        secret_set: !!process.env.WHATSAPP_BRIDGE_SECRET,
        supabase_url: (process.env.SUPABASE_URL || 'https://zygoqqsgzhgpvlpttfbk.supabase.co').replace(/\/\/.*@/, '//'),
        supabase_service_role_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        ts: new Date().toISOString()
    });
};