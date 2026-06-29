/**
 * GET /api/ai/health
 * Provider status, model, KB size. Useful for the admin UI.
 */
const { supabase } = require('../_lib/supabase');
const { PROVIDER, MODEL } = require('./_lib/providers');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let kbCount = null;
    let recentRuns = null;
    if (supabase) {
        try {
            const { count } = await supabase.from('ai_kb').select('id', { count: 'exact', head: true }).eq('active', true);
            kbCount = count;
            const { data } = await supabase.from('ai_runs').select('id, skill, provider, model, latency_ms, created_at').order('created_at', { ascending: false }).limit(5);
            recentRuns = data || [];
        } catch (e) {}
    }
    res.status(200).json({
        ok: true,
        provider: PROVIDER,
        model: MODEL,
        kb_count: kbCount,
        recent_runs: recentRuns,
        ts: new Date().toISOString()
    });
};