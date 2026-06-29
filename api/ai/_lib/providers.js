/**
 * OSS AI provider abstraction. Pluggable: Hugging Face Inference
 * (default, free tier), Together AI (free OSS models), Ollama
 * (self-hosted), or any OpenAI-compatible endpoint.
 *
 * All listed providers serve open-weight models:
 *   - HF:   mistralai/Mistral-7B-Instruct-v0.3   (Apache-2.0)
 *           microsoft/Phi-3.5-mini-instruct      (MIT)
 *           meta-llama/Llama-3.2-3B-Instruct     (Llama license)
 *   - Together: meta-llama/Llama-3.2-3B-Instruct:free
 *   - Ollama: any local model (phi3, llama3.2, mistral, qwen2.5)
 *
 * Env vars (all optional — sensible defaults):
 *   AI_PROVIDER=huggingface  (huggingface|together|ollama|openai-compatible)
 *   AI_MODEL=mistralai/Mistral-7B-Instruct-v0.3
 *   AI_API_KEY=...           (HF: optional for free tier; required for higher limits)
 *   AI_BASE_URL=...          (override base URL, e.g. for self-hosted Ollama)
 *   AI_TIMEOUT_MS=18000      (Vercel serverless max ~10s hobby / 60s pro)
 */

const PROVIDER = (process.env.AI_PROVIDER || 'huggingface').toLowerCase();
const MODEL    = process.env.AI_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const API_KEY  = process.env.AI_API_KEY || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '';
const BASE_URL = process.env.AI_BASE_URL || '';
const TIMEOUT  = parseInt(process.env.AI_TIMEOUT_MS || '18000', 10);

/**
 * Chat completion. Returns { text, provider, model, tokens, latency }.
 * Auto-converts message array to provider-native format.
 */
async function chat(messages, opts = {}) {
    const start = Date.now();
    const model = opts.model || MODEL;
    const temperature = opts.temperature ?? 0.4;
    const maxTokens   = opts.maxTokens   ?? 350;

    let url, headers, body;
    switch (PROVIDER) {
        case 'huggingface':
            url = `https://api-inference.huggingface.co/models/${model}`;
            headers = { 'Content-Type': 'application/json' };
            if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
            // HF Inference API uses {inputs: ..., parameters: ...}
            body = {
                inputs: buildPrompt(messages),
                parameters: {
                    max_new_tokens: maxTokens,
                    temperature,
                    return_full_text: false,
                    stop: ['</s>', 'User:']
                }
            };
            break;

        case 'together':
            url = 'https://api.together.xyz/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            };
            body = {
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false
            };
            break;

        case 'ollama':
            url = (BASE_URL || 'http://localhost:11434') + '/api/chat';
            headers = { 'Content-Type': 'application/json' };
            body = { model, messages, stream: false, options: { temperature, num_predict: maxTokens } };
            break;

        case 'openai-compatible':
        default:
            url = (BASE_URL || 'https://api.openai.com/v1/chat/completions') + '/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            };
            body = { model, messages, temperature, max_tokens: maxTokens };
            break;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

    try {
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) {
            const errTxt = await r.text().catch(() => '');
            return errorResult(start, `HTTP ${r.status}: ${errTxt.slice(0, 200)}`);
        }
        const data = await r.json();
        const text = extractText(PROVIDER, data);
        return {
            ok: true,
            text,
            provider: PROVIDER,
            model,
            tokens: data.usage?.total_tokens || estimateTokens(messages) + estimateTokens([{ content: text }]),
            latency: Date.now() - start
        };
    } catch (e) {
        clearTimeout(timer);
        return errorResult(start, e.name === 'AbortError' ? 'timeout' : e.message);
    }
}

function errorResult(start, msg) {
    return { ok: false, error: msg, provider: PROVIDER, model: MODEL, latency: Date.now() - start };
}

function buildPrompt(messages) {
    // Convert [{role, content}] → Mistral/Phi format
    const sys = messages.find(m => m.role === 'system')?.content || '';
    const turns = messages.filter(m => m.role !== 'system').map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');
    return `${sys}\n${turns}\nAssistant:`;
}

function extractText(provider, data) {
    try {
        if (provider === 'huggingface') {
            if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text.trim();
            return data.generated_text || '';
        }
        if (provider === 'together' || provider === 'openai-compatible') {
            return data.choices?.[0]?.message?.content?.trim() || '';
        }
        if (provider === 'ollama') {
            return data.message?.content?.trim() || '';
        }
        return '';
    } catch (e) { return ''; }
}

function estimateTokens(messages) {
    return messages.reduce((n, m) => n + Math.ceil((m.content || '').length / 4), 0);
}

/**
 * Embedding generation. Default: HF sentence-transformers/all-MiniLM-L6-v2
 * (Apache-2.0, 384 dims). No key needed for HF free tier but rate-limited.
 */
async function embed(texts) {
    const input = Array.isArray(texts) ? texts : [texts];
    const model = process.env.AI_EMBED_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

    // Try HF Inference API first (works for sentence-transformers models)
    if (PROVIDER === 'huggingface' || !PROVIDER) {
        try {
            const r = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}) },
                body: JSON.stringify({ inputs: input, options: { wait_for_model: true } })
            });
            if (r.ok) {
                const vectors = await r.json();
                // Some models return nested array (per-token); we take mean-pool to get one vec per input
                return vectors.map(v => Array.isArray(v[0]) ? meanPool(v) : v);
            }
        } catch (e) {}
    }

    // Fallback: hash-based deterministic pseudo-embedding (works offline, NOT semantic)
    return input.map(t => hashEmbed(t, 384));
}

function meanPool(tokenVectors) {
    const dim = tokenVectors[0].length;
    const out = new Array(dim).fill(0);
    for (const v of tokenVectors) for (let i = 0; i < dim; i++) out[i] += v[i];
    return out.map(x => x / tokenVectors.length);
}

function hashEmbed(text, dim) {
    // Deterministic 384-dim vector. Used only when no embedding API is reachable.
    // Cosine similarity still works for keyword overlap because we weight word stems.
    const v = new Array(dim).fill(0);
    const tokens = String(text || '').toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (const t of tokens) {
        let h = 5381;
        for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0;
        v[h % dim] += 1;
        // Stem-ish: also hash the first 4 chars
        if (t.length > 4) {
            const stem = t.slice(0, 4);
            let hs = 5381;
            for (let i = 0; i < stem.length; i++) hs = (hs * 33 + stem.charCodeAt(i)) >>> 0;
            v[hs % dim] += 0.5;
        }
    }
    const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
    return v.map(x => x / norm);
}

module.exports = { chat, embed, PROVIDER, MODEL };