/**
 * AirpakAI — browser-side orchestrator that talks to /api/ai/chat.
 *
 * Optional: if WebGPU is available, preloads @mlc-ai/web-llm (Apache-2.0,
 * runs Phi-3 / Llama-3 / Mistral directly in the browser) and uses it
 * for instant, zero-cost replies. Otherwise it falls back to the
 * serverless endpoint which uses Hugging Face Inference API (also free).
 *
 * Public API:
 *   AirpakAI.send(message, { sessionId, ticketId, history, locale })
 *     → { reply, skill, citations, ms, source: 'webllm' | 'server' }
 *
 *   AirpakAI.start()  — kick off WebLLM warm-up in the background
 *                       (loads model weights; harmless to skip).
 */
(function () {
    'use strict';

    const ENDPOINT = '/api/ai/chat';
    const STATE = {
        webllm: null,
        webllmReady: false,
        webllmLoading: false,
        sessionId: getOrCreateSession()
    };

    function getOrCreateSession() {
        try {
            let s = sessionStorage.getItem('airpak_ai_session');
            if (!s) {
                s = 'web-' + crypto.randomUUID();
                sessionStorage.setItem('airpak_ai_session', s);
            }
            return s;
        } catch (e) {
            return 'web-' + Math.random().toString(36).slice(2);
        }
    }

    async function send(message, opts = {}) {
        const payload = {
            message,
            sessionId: opts.sessionId || STATE.sessionId,
            ticketId: opts.ticketId || null,
            history: opts.history || [],
            locale: opts.locale || (navigator.language || 'en').slice(0, 2)
        };

        // 1) Try WebLLM if it's warm
        if (STATE.webllmReady && STATE.webllm) {
            try {
                const text = await STATE.webllm.chat(payload.history.concat([{ role: 'user', content: message }]), { temperature: 0.5 });
                return { reply: text, source: 'webllm', skill: 'chat', ms: 0 };
            } catch (e) { /* fall through */ }
        }

        // 2) Server-side orchestrator (HF / Together / Ollama)
        try {
            const r = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const data = await r.json();
            return {
                reply: data.reply || 'Sorry, I could not generate a response.',
                skill: data.skill,
                citations: data.citations || [],
                action: data.action || null,
                source: 'server',
                provider: data.provider,
                model: data.model,
                ms: data.ms || 0,
                ticketId: data.ctx?.ticketId || payload.ticketId
            };
        } catch (e) {
            return { reply: "I'm offline right now. Try again in a moment, or say **human** to talk to our team.", source: 'fallback', error: e.message };
        }
    }

    /**
     * Optional: warm up WebLLM in the background.
     * Skipped silently if WebGPU is not available.
     * Model: Phi-3.5-mini-instruct (MIT, ~2.3GB Q4) — smallest viable
     * open model that handles English support conversation well.
     */
    async function start() {
        if (STATE.webllmLoading || STATE.webllmReady) return;
        if (!('gpu' in navigator)) return; // no WebGPU
        STATE.webllmLoading = true;
        try {
            // Dynamic import keeps the main bundle light.
            const mod = await import(/* @vite-ignore */ 'https://esm.run/@mlc-ai/web-llm');
            const engine = await mod.CreateMLCEngine('Phi-3.5-mini-instruct-q4f16_1-MLC', {
                initProgressCallback: (p) => {
                    if (typeof window !== 'undefined' && window.airpakAIProgress) {
                        window.airpakAIProgress(p);
                    }
                }
            });
            STATE.webllm = engine;
            STATE.webllmReady = true;
            document.dispatchEvent(new CustomEvent('airpak-ai:ready', { detail: { source: 'webllm' } }));
        } catch (e) {
            console.warn('[AirpakAI] WebLLM unavailable, server fallback only:', e.message);
        } finally {
            STATE.webllmLoading = false;
        }
    }

    window.AirpakAI = { send, start, get sessionId() { return STATE.sessionId; } };

    // Kick off warm-up but don't block first paint
    if (document.readyState !== 'loading') start();
    else document.addEventListener('DOMContentLoaded', start);
})();