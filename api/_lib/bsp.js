/**
 * BSP abstraction. We support Twilio and 360dialog out of the box;
 * Meta Cloud API works the same as 360dialog. Add a new adapter by
 * extending the `adapters` map.
 *
 * Required env vars:
 *   WHATSAPP_PROVIDER   = 'twilio' | '360dialog' | 'meta'  (default: twilio)
 *   WHATSAPP_FROM       = E.164 number e.g. '+18053956873'
 *   WHATSAPP_TOKEN      = provider auth token
 *   WHATSAPP_ACCOUNT_ID = (Twilio) Account SID
 *   WHATSAPP_API_KEY    = (360dialog / Meta) API key
 */
const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'twilio').toLowerCase();
const FROM = process.env.WHATSAPP_FROM || '+18053956873';
const TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_API_KEY || '';
const ACCOUNT_SID = process.env.WHATSAPP_ACCOUNT_ID || '';

/**
 * Send a WhatsApp message.
 * @param {string} to   E.164 phone number of recipient
 * @param {string} body Message text
 * @returns {Promise<{ ok: boolean, providerId?: string, error?: string }>}
 */
async function sendWhatsApp(to, body) {
    if (!to || !body) return { ok: false, error: 'to and body required' };

    const cleanTo = to.replace(/[^\d+]/g, '');
    const text = String(body).slice(0, 4096);

    try {
        if (PROVIDER === 'twilio') {
            if (!TOKEN || !ACCOUNT_SID) return { ok: false, error: 'Twilio creds missing' };
            const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
            const params = new URLSearchParams();
            params.set('From', `whatsapp:${FROM}`);
            params.set('To',   `whatsapp:${cleanTo}`);
            params.set('Body', text);
            const r = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${TOKEN}`).toString('base64'),
                    'Content-Type':  'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });
            const data = await r.json();
            if (!r.ok) return { ok: false, error: data.message || `Twilio ${r.status}` };
            return { ok: true, providerId: data.sid, raw: data };

        } else if (PROVIDER === '360dialog' || PROVIDER === 'meta') {
            const base = PROVIDER === 'meta'
                ? `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`
                : 'https://waba.360dialog.io/v1/messages';
            const r = await fetch(base, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + TOKEN,
                    'Content-Type':  'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanTo,
                    type: 'text',
                    text: { body: text, preview_url: false }
                })
            });
            const data = await r.json();
            if (!r.ok) return { ok: false, error: data.error?.message || `${PROVIDER} ${r.status}` };
            return { ok: true, providerId: data.messages?.[0]?.id || data.id, raw: data };
        }
        return { ok: false, error: `Unknown provider: ${PROVIDER}` };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Parse inbound webhook payload into a normalized shape.
 * Returns { from, body, name, providerId, raw }.
 */
function parseInbound(provider, payload) {
    if (provider === 'twilio') {
        // Twilio sends form-encoded body to webhook; payload is the parsed object
        return {
            from:        (payload.From || '').replace(/^whatsapp:/, ''),
            body:        payload.Body || '',
            name:        payload.ProfileName || '',
            providerId:  payload.MessageSid || ''
        };
    }
    if (provider === '360dialog' || provider === 'meta') {
        const entry = payload?.entry?.[0]?.changes?.[0]?.value;
        const msg = entry?.messages?.[0];
        const contact = entry?.contacts?.[0];
        return {
            from:       msg?.from || '',
            body:       msg?.text?.body || '',
            name:       contact?.profile?.name || '',
            providerId: msg?.id || ''
        };
    }
    return { from: '', body: '', name: '', providerId: '' };
}

module.exports = { sendWhatsApp, parseInbound, PROVIDER };