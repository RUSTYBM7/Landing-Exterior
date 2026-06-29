/**
 * Skill: chat (default fallback)
 * Generic LLM chat with RAG-lite: pulls 1-2 KB hits, lets the model
 * respond freely. Used when no other skill claims the message.
 */
const { chat, PROVIDER, MODEL } = require('../_lib/providers');
const { supabase } = require('../../_lib/supabase');
const { embed } = require('../_lib/providers');

const SYSTEM = `You are "Aria", AirPak Express's friendly AI support assistant.
Keep replies short (under 90 words), warm, and on-topic for shipping/logistics.
If asked something outside shipping, gently redirect. Never invent prices or tracking numbers.`;

async function run({ message, ctx, log }) {
    // Soft RAG: top-2 KB chunks for context
    let contextBlock = '';
    try {
        const vectors = await embed([message]);
        const { data: hits } = await supabase.rpc('ai_kb_search', {
            query_embedding: vectors[0], match_count: 2, match_threshold: 0.45,
            filter_locale: ctx.locale || 'en'
        });
        if (hits && hits.length) {
            contextBlock = '\n\nHELP CENTER SNIPPETS (use only if relevant):\n' +
                hits.map((h, i) => `[${i + 1}] ${h.title}: ${h.content}`).join('\n');
        }
    } catch (e) { /* ignore */ }

    const result = await chat([
        { role: 'system', content: SYSTEM + contextBlock },
        ...(ctx.history || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
    ], { temperature: 0.6, maxTokens: 220 });

    log({ stage: 'llm', ok: result.ok, latency: result.latency });

    if (!result.ok) {
        return {
            handled: true,
            reply: "I'm a bit overloaded right now. Could you rephrase, or say **human** to talk to a real person?"
        };
    }
    return {
        handled: true,
        reply: result.text,
        provider: result.provider,
        model: result.model
    };
}

module.exports = { run };