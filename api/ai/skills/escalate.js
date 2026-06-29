/**
 * Skill: escalate
 * Hands the conversation to a human admin. Marks the support ticket
 * as escalated and inserts a system message so AdminChat shows it
 * at the top of the queue.
 */
const { supabase } = require('../../_lib/supabase');

async function run({ message, ctx, log }) {
    let ticketId = ctx.ticketId;

    // If we don't have a ticket yet (the visitor escalated before chatting),
    // create one so admin has context.
    if (!ticketId && ctx.sessionId) {
        const { data } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('user_id', ctx.sessionId)
            .eq('channel', 'web')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        ticketId = data?.id;
    }

    if (ticketId) {
        await supabase.from('support_tickets').update({
            status: 'escalated',
            priority: 'high',
            updated_at: new Date().toISOString()
        }).eq('id', ticketId);

        await supabase.from('messages').insert({
            ticket_id: ticketId,
            sender_id: 'system',
            sender_type: 'admin',
            content: `[System] Visitor requested human agent. Last message: "${String(message).slice(0, 200)}"`,
            read_by: []
        });
    }

    return {
        handled: true,
        reply:
            "Got it — I've flagged this for a human agent. An Airpak Express team member will jump in shortly.\n\n" +
            "Average response time right now is **under 3 minutes** during business hours (Mon-Fri 9am-6pm SGT).",
        escalate: true,
        ctxPatch: { activeSkill: 'escalate' }
    };
}

module.exports = { run };