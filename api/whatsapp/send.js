/**
 * POST /api/whatsapp/send
 * Called by the Supabase Postgres trigger whenever an admin sends a
 * message on a ticket where channel='whatsapp'. Forwards the text to
 * the customer's WhatsApp via the configured BSP and stamps the
 * delivery receipt on the message row.
 *
 * Body: { ticket_id, message_id, to, content, sender_type }
 * Auth: header `X-Bridge-Secret: <WHATSAPP_BRIDGE_SECRET>`
 */
const { supabase } = require('../_lib/supabase');
const { sendWhatsApp } = require('../_lib/bsp');

const SECRET = process.env.WHATSAPP_BRIDGE_SECRET || '';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    if (SECRET) {
        const h = req.headers['x-bridge-secret'] || '';
        if (h !== SECRET) return res.status(401).json({ error: 'unauthorized' });
    }
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const { ticket_id, message_id, to, content } = body || {};
    if (!to || !content) return res.status(400).json({ error: 'to and content required' });

    try {
        const result = await sendWhatsApp(to, content);

        // Stamp delivery on the message so admin UI can show sent/failed
        if (message_id) {
            await supabase.from('messages').update({
                delivered_to: {
                    whatsapp: !!result.ok,
                    whatsapp_msg_id: result.providerId || null,
                    whatsapp_error: result.error || null,
                    whatsapp_at: new Date().toISOString()
                }
            }).eq('id', message_id);
        }

        // Bump ticket
        if (ticket_id) {
            await supabase.from('support_tickets').update({
                last_admin_msg: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', ticket_id);
        }

        return res.status(200).json({ ok: result.ok, providerId: result.providerId, error: result.error });
    } catch (e) {
        console.error('[whatsapp/send]', e);
        return res.status(500).json({ error: e.message });
    }
};