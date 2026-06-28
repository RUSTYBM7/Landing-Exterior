/**
 * POST /api/whatsapp/webhook
 *
 * Inbound from WhatsApp Business BSP (Twilio or 360dialog/Meta Cloud).
 * - Verifies shared secret via header (set WHATSAPP_BRIDGE_SECRET in Vercel).
 * - Looks up an open ticket by external_id (the customer's phone).
 *   If none, creates a new ticket with channel='whatsapp'.
 * - Inserts the inbound message as sender_type='user' so the portal
 *   AdminChat shows it in the same queue as web chats.
 * - Bumps unread_admin so the portal sees the badge.
 *
 * GET /api/whatsapp/webhook  — Meta/Twilio verification handshake.
 */
const { supabase } = require('../_lib/supabase');
const { parseInbound, PROVIDER } = require('../_lib/bsp');

const SECRET = process.env.WHATSAPP_BRIDGE_SECRET || '';

function unauthorized(res) { return res.status(401).json({ error: 'unauthorized' }); }

function verifySecret(req) {
    if (!SECRET) return true; // dev mode
    const h = req.headers['x-bridge-secret'] || req.headers['x-twilio-signature'] || '';
    return h === SECRET;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Verification handshake (Meta + 360dialog)
    if (req.method === 'GET') {
        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || SECRET || 'airpak-verify';
        const mode      = req.query['hub.mode'];
        const token     = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(200).json({ ok: true, provider: PROVIDER });
    }

    if (req.method !== 'POST') return res.status(405).end();
    if (!verifySecret(req)) return unauthorized(res);
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    // Twilio sends x-www-form-urlencoded; others send JSON
    let payload = req.body;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { /* keep raw */ }
    }
    const inbound = parseInbound(PROVIDER, payload || {});
    if (!inbound.from || !inbound.body) {
        return res.status(200).json({ ok: true, ignored: true });
    }

    try {
        // Find existing ticket by external_id (E.164 phone)
        let ticket = null;
        const { data: existing } = await supabase
            .from('support_tickets')
            .select('id, status')
            .eq('channel', 'whatsapp')
            .eq('external_id', inbound.from)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        ticket = existing;

        // Create new ticket if first contact
        if (!ticket) {
            const title = 'WA ' + (inbound.name || inbound.from) + ' — ' + inbound.body.slice(0, 60);
            const { data, error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: 'wa:' + inbound.from,
                    title,
                    status: 'ai_handling',
                    priority: 'medium',
                    ai_handled: true,
                    channel: 'whatsapp',
                    external_id: inbound.from,
                    external_name: inbound.name || '',
                    delivered_to: { whatsapp: true },
                    metadata: { source: 'whatsapp', provider: PROVIDER }
                })
                .select('id')
                .single();
            if (error) throw error;
            ticket = data;
        }

        // Insert inbound message
        const { error: msgErr } = await supabase.from('messages').insert({
            ticket_id: ticket.id,
            sender_id: 'wa:' + inbound.from,
            sender_type: 'user',
            content: inbound.body,
            external_msg_id: inbound.providerId || null,
            delivered_to: { whatsapp: true },
            read_by: []
        });
        if (msgErr) throw msgErr;

        // Bump ticket
        await supabase.from('support_tickets').update({
            updated_at: new Date().toISOString(),
            last_visitor_msg: new Date().toISOString()
        }).eq('id', ticket.id);

        return res.status(200).json({ ok: true, ticketId: ticket.id });
    } catch (e) {
        console.error('[whatsapp/webhook]', e);
        return res.status(500).json({ error: e.message });
    }
};