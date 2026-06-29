/**
 * POST /api/ai/chat
 *
 * The single entrypoint for the AI swarm. The chat widget (or any
 * client) POSTs { message, sessionId, ticketId, history, locale }
 * and gets back { reply, skill, citations, provider, model, ms }.
 *
 * Flow:
 *   1) Restore session context from Supabase (ctx blob)
 *   2) Classify intent (router.js) → skill
 *   3) Run the skill module (skills/*.js)
 *   4) Persist the run in ai_runs (audit + cost tracking)
 *   5) Update session context in Supabase
 *   6) Return the reply to the client
 *
 * Pure OSS providers (env: AI_PROVIDER):
 *   - huggingface  → Mistral / Phi-3 / Llama via free HF Inference API
 *   - together     → Together AI free tier (Llama-3.2-3B-Instruct:free)
 *   - ollama       → self-hosted via AI_BASE_URL=http://localhost:11434
 *   - openai-compatible → any local endpoint
 */
const { supabase } = require('../_lib/supabase');
const { classify } = require('./_lib/router');
const { PROVIDER, MODEL } = require('./_lib/providers');

// Lazy-load skills (each is a tiny module)
const skills = {
    tracking: require('./skills/tracking'),
    rates:    require('./skills/rates'),
    faq:      require('./skills/faq'),
    intake:   require('./skills/intake'),
    escalate: require('./skills/escalate'),
    chat:     require('./skills/chat')
};

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Bridge-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    const message   = String(body.message || '').trim().slice(0, 2000);
    const sessionId = String(body.sessionId || 'anon-' + Date.now()).slice(0, 200);
    const ticketId  = body.ticketId || null;
    const locale    = body.locale || 'en';
    const history   = Array.isArray(body.history) ? body.history.slice(-10) : [];

    if (!message) return res.status(400).json({ error: 'message required' });

    const t0 = Date.now();

    try {
        // 1) Load session context
        let ctx = await loadContext(sessionId, ticketId);

        // 2) Classify → skill
        let skillName = classify(message, ctx);
        if (!skills[skillName]) skillName = 'chat';

        const log = (meta) => {
            // Fire-and-forget log; never blocks the response
            supabase.from('ai_runs').insert({
                session_id: ctx.sessionId || null,
                ticket_id:  ctx.ticketId  || null,
                visitor_id: sessionId,
                skill: skillName,
                provider: PROVIDER,
                model: MODEL,
                metadata: meta
            }).then(() => {}).catch(() => {});
        };

        log({ stage: 'classified', skill: skillName, msgLen: message.length });

        // 3) Run skill
        const skill = skills[skillName];
        const result = await skill.run({ message, ctx, log, history, locale });

        // 4) Apply context patch
        if (result.ctxPatch) {
            ctx = { ...ctx, ...result.ctxPatch };
            await saveContext(ctx);
        }

        // 5) If skill says escalate, mark in DB
        if (result.escalate && ctx.ticketId) {
            await supabase.from('support_tickets').update({
                status: 'escalated', priority: 'high', updated_at: new Date().toISOString()
            }).eq('id', ctx.ticketId);
        }

        // 6) Respond
        const ms = Date.now() - t0;
        return res.status(200).json({
            ok: true,
            reply: result.reply,
            skill: skillName,
            citations: result.citations || [],
            action: result.action || null,
            ctx: { ticketId: ctx.ticketId || null, activeSkill: ctx.activeSkill || skillName },
            provider: result.provider || PROVIDER,
            model: result.model || MODEL,
            ms
        });
    } catch (e) {
        console.error('[ai/chat]', e);
        return res.status(500).json({ ok: false, error: e.message, reply: 'Something went wrong. Please try again.' });
    }
};

// ---- context storage (lightweight, lives in support_tickets.metadata) ----
async function loadContext(sessionId, ticketId) {
    const ctx = { sessionId };
    try {
        // Find ticket for this visitor
        let q = supabase.from('support_tickets').select('id, metadata');
        if (ticketId) q = q.eq('id', ticketId);
        else          q = q.eq('user_id', sessionId).eq('channel', 'web').order('updated_at', { ascending: false }).limit(1);
        const { data } = await q.maybeSingle();
        if (data) {
            ctx.ticketId = data.id;
            ctx.ai = data.metadata?.ai || {};
        }
    } catch (e) {}
    return ctx;
}

async function saveContext(ctx) {
    if (!ctx.ticketId) return;
    try {
        await supabase.from('support_tickets').update({
            metadata: { ai: { activeSkill: ctx.activeSkill, intake: ctx.intake, trackingId: ctx.trackingId } },
            updated_at: new Date().toISOString()
        }).eq('id', ctx.ticketId);
    } catch (e) {}
}