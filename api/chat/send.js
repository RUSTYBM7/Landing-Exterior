/**
 * POST /api/chat/send
 * Visitor sends a message from the live chat widget.
 * - finds-or-creates a support_tickets row (channel='web')
 * - inserts into messages
 * - returns the ticketId so future polls work
 * - returns any recent admin reply (so the widget can show immediate feedback)
 */
const { supabase } = require('../_lib/supabase');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    let body = req.body || {};
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const { sessionId, ticketId, visitorName, message, page, userAgent } = body;

    if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'message required' });
    }
    const text = String(message).trim().slice(0, 4000);

    try {
        let ticket = null;
        let tid = ticketId;

        // Reuse existing ticket
        if (tid) {
            const { data } = await supabase
                .from('support_tickets')
                .select('id, user_id, status')
                .eq('id', tid)
                .maybeSingle();
            ticket = data;
        }

        // Otherwise find by sessionId (sticky)
        if (!ticket && sessionId) {
            const { data } = await supabase
                .from('support_tickets')
                .select('id, user_id, status')
                .eq('user_id', sessionId)
                .eq('channel', 'web')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            ticket = data;
            if (ticket) tid = ticket.id;
        }

        // Create new ticket
        if (!ticket) {
            const title = (text || '').slice(0, 80) || 'New chat';
            const { data, error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: sessionId || ('anon-' + Date.now()),
                    title,
                    status: 'ai_handling',
                    priority: 'medium',
                    ai_handled: true,
                    channel: 'web',
                    metadata: { visitor_name: visitorName || '', page: page || '', ua: userAgent || '' }
                })
                .select('id')
                .single();
            if (error) throw error;
            ticket = data;
            tid = data.id;
        }

        // Insert the visitor message
        const { error: msgErr } = await supabase.from('messages').insert({
            ticket_id: tid,
            sender_id: sessionId || 'anon',
            sender_type: 'user',
            content: text,
            read_by: []
        });
        if (msgErr) throw msgErr;

        // Bump ticket
        await supabase.from('support_tickets').update({
            updated_at: new Date().toISOString(),
            last_visitor_msg: new Date().toISOString()
        }).eq('id', tid);

        // Pull any recent admin reply that came in (best-effort, last 30s)
        const since = new Date(Date.now() - 30000).toISOString();
        const { data: recent } = await supabase
            .from('messages')
            .select('id, sender_type, content, created_at')
            .eq('ticket_id', tid)
            .gte('created_at', since)
            .neq('sender_type', 'user')
            .order('created_at', { ascending: true })
            .limit(5);

        return res.status(200).json({
            ok: true,
            ticketId: tid,
            recent: recent || [],
            autoReply: null
        });
    } catch (e) {
        console.error('[chat/send]', e);
        return res.status(500).json({ error: e.message || 'send failed' });
    }
};