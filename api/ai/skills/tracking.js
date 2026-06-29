/**
 * Skill: tracking
 * Resolves a tracking number → shipment status + last events.
 * No LLM needed. Pure DB query. Fast.
 */
const { supabase } = require('../../_lib/supabase');

const ID_RX = /\b(?:AP|TRK|APE)[-]?\d{6,}\b/i;

async function run({ message, ctx, log }) {
    const id = extractTrackingId(message) || ctx.trackingId;

    if (!id) {
        return {
            handled: true,
            reply: "Sure, I can help you track a shipment. Please share your tracking number — it usually starts with **AP** or **TRK** followed by digits. You can also enter it directly in the [Track Shipment](/tracking) page.",
            ctxPatch: { awaiting: 'trackingId' }
        };
    }

    log({ stage: 'query', id });
    const { data, error } = await supabase
        .from('shipments')
        .select('tracking_number, status, origin, destination, service_type, eta, updated_at, weight, dimensions')
        .or(`tracking_number.eq.${id},tracking_number.ilike.%${id}%`)
        .maybeSingle();

    if (error) {
        log({ stage: 'error', err: error.message });
        return { handled: true, reply: "I hit a snag pulling that shipment. Please try again in a moment or use the [track page](/tracking)." };
    }

    if (!data) {
        return {
            handled: true,
            reply: `I couldn't find a shipment matching **${id}**. Double-check the number — it's case-insensitive. You can also paste the full string.`,
            ctxPatch: { lastFailedTracking: id }
        };
    }

    // Pull recent events
    const { data: events } = await supabase
        .from('tracking_events')
        .select('title, location, event_date')
        .or(`tracking_number.eq.${data.tracking_number},shipment_id.eq.${data.id}`)
        .order('event_date', { ascending: false })
        .limit(5);

    const eventList = (events || []).map(e =>
        `• **${e.title}** — ${e.location || ''} ${e.event_date ? '(' + new Date(e.event_date).toLocaleDateString() + ')' : ''}`
    ).join('\n');

    return {
        handled: true,
        reply:
            `Here's the latest for **${data.tracking_number}**:\n\n` +
            `📦 **Status:** ${data.status}\n` +
            `🛫 **From:** ${data.origin || '—'}\n` +
            `🛬 **To:** ${data.destination || '—'}\n` +
            `🚚 **Service:** ${data.service_type || '—'}\n` +
            `⏱️ **ETA:** ${data.eta || '—'}\n\n` +
            (eventList ? `**Recent activity:**\n${eventList}\n\n` : '') +
            `[Open full tracking page](/tracking?tracking=${encodeURIComponent(data.tracking_number)})`,
        ctxPatch: { trackingId: data.tracking_number, lastStatus: data.status }
    };
}

function extractTrackingId(text) {
    const m = String(text || '').toUpperCase().match(ID_RX);
    return m ? m[0] : null;
}

module.exports = { run, extractTrackingId };