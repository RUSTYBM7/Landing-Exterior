/**
 * GET /api/chat/poll?ticketId=...&after=ISO
 * Returns any messages newer than `after` for the given ticket.
 * Used by the widget to render admin replies in real time.
 */
const { supabase } = require('../_lib/supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    const { ticketId, after } = req.query || {};
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    try {
        let q = supabase
            .from('messages')
            .select('id, sender_type, content, created_at')
            .eq('ticket_id', ticketId)
            .neq('sender_type', 'user')
            .order('created_at', { ascending: true })
            .limit(50);
        if (after) q = q.gt('created_at', after);

        const { data, error } = await q;
        if (error) throw error;
        return res.status(200).json({ ok: true, messages: data || [] });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};