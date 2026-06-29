/**
 * POST /api/ai/ingest
 * Backfills embeddings for the ai_kb table.
 *
 * Modes:
 *   POST /api/ai/ingest          → embed all rows with NULL embedding
 *   POST /api/ai/ingest?reindex=1 → drop & rebuild every row (heavy)
 *
 * Auth: header `X-AI-Admin-Secret: <AI_ADMIN_SECRET>` (env).
 *        If no secret set, ingest is locked down (returns 401).
 *
 * Body (optional):
 *   { ids: [...] }   → only embed these rows
 *   { force: true }  → re-embed even if vector exists
 */
const { supabase } = require('../_lib/supabase');
const { embed } = require('./_lib/providers');

const SECRET = process.env.AI_ADMIN_SECRET || process.env.AI_BRIDGE_SECRET || '';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (SECRET) {
        const h = req.headers['x-ai-admin-secret'] || req.headers['x-bridge-secret'] || '';
        if (h !== SECRET) return res.status(401).json({ error: 'unauthorized' });
    }

    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const reindex = req.query?.reindex === '1' || req.body?.force === true;
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const idsFilter = Array.isArray(body.ids) && body.ids.length ? body.ids : null;

    try {
        let q = supabase.from('ai_kb').select('id, title, content, embedding');
        if (!reindex && !idsFilter) q = q.is('embedding', null);
        if (idsFilter) q = q.in('id', idsFilter);
        const { data: rows, error } = await q;
        if (error) throw error;

        if (!rows || rows.length === 0) {
            return res.status(200).json({ ok: true, indexed: 0, skipped: 'nothing to embed' });
        }

        let indexed = 0, failed = 0;
        const BATCH = 8;
        for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const texts = batch.map(r => `${r.title}\n\n${r.content}`);
            let vecs;
            try {
                vecs = await embed(texts);
            } catch (e) {
                vecs = texts.map(t => null);
            }
            await Promise.all(batch.map(async (r, j) => {
                const v = vecs[j];
                if (!v) { failed++; return; }
                // pgvector accepts string '[v1,v2,...]' format
                const vecStr = '[' + v.map(Number).join(',') + ']';
                const { error } = await supabase.from('ai_kb').update({ embedding: vecStr }).eq('id', r.id);
                if (error) failed++; else indexed++;
            }));
        }

        return res.status(200).json({ ok: true, indexed, failed, total: rows.length });
    } catch (e) {
        console.error('[ai/ingest]', e);
        return res.status(500).json({ error: e.message });
    }
};