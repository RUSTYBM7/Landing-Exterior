/**
 * Skill: faq
 * RAG over the ai_kb table. Generates a short, citation-rich answer
 * using retrieved chunks. Falls back to the chat skill if no good match.
 */
const { supabase } = require('../../_lib/supabase');
const { chat, embed, PROVIDER, MODEL } = require('../_lib/providers');

const SYSTEM = `You are "Aria", AirPak Express's customer support assistant.
Answer concisely (under 120 words). Use the provided CONTEXT when relevant.
If the CONTEXT is insufficient, say you don't know and offer to escalate.
Never invent tracking numbers, prices, or policies. Format with simple markdown.`;

async function run({ message, ctx, log }) {
    log({ stage: 'embed_start' });
    const vectors = await embed([message]);
    const queryVec = vectors[0];
    log({ stage: 'embed_done', dim: queryVec?.length });

    // pgvector search
    const { data: hits, error } = await supabase.rpc('ai_kb_search', {
        query_embedding: queryVec,
        match_count: 4,
        match_threshold: 0.4,
        filter_locale: ctx.locale || 'en'
    });

    if (error) {
        log({ stage: 'rpc_error', err: error.message });
        return { handled: true, reply: "I'm having trouble accessing the knowledge base right now. Please try again or contact our team directly.", escalate: true };
    }

    if (!hits || hits.length === 0) {
        log({ stage: 'no_hits' });
        return {
            handled: true,
            reply: "I don't have a confident answer for that. Would you like me to **connect you with a human agent**? Just say \"human\" anytime.",
            escalate: false
        };
    }

    const contextBlock = hits.map((h, i) =>
        `[${i + 1}] (${h.source}) ${h.title}\n${h.content}`
    ).join('\n\n');

    const prompt = `CONTEXT FROM AIRPAK KNOWLEDGE BASE:\n${contextBlock}\n\nVISITOR QUESTION: ${message}\n\nProvide a helpful, concise answer based on the context. If the context covers it, cite with [n].`;

    const result = await chat([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 280 });

    log({ stage: 'llm', ok: result.ok, latency: result.latency });

    if (!result.ok) {
        // Even if LLM fails, surface the top KB hit verbatim — better than nothing.
        const top = hits[0];
        return {
            handled: true,
            reply: `Here's what I found in our help center:\n\n**${top.title}**\n${top.content}`,
            citations: hits.map(h => h.id)
        };
    }

    return {
        handled: true,
        reply: result.text,
        citations: hits.map(h => h.id),
        provider: result.provider,
        model: result.model
    };
}

module.exports = { run };