# AirPak Express — AI Swarm (Open Source, BYOK-Optional)

A fully-open-source AI customer-support swarm. No vendor lock. No monthly bill unless you choose to pay for higher limits.

```
Visitor (chat widget)
    │
    ▼
/js/airpak-ai.js (browser)
    │
    │   ┌─────────────────────────────────────┐
    ├──▶│ WebLLM (in-browser, if WebGPU)     │   Phi-3.5-mini / Llama-3.2 / Mistral
    │   │   runs OSS model in the tab        │   MIT / Apache-2.0
    │   └─────────────────────────────────────┘
    │
    │   ┌─────────────────────────────────────┐
    └──▶│ /api/ai/chat  (Vercel serverless)  │
        │   → router.js classifies intent    │
        │   → skills/*.js handle             │
        │   → providers.js calls LLM         │
        └─────────────────────────────────────┘
              │
              ├──▶ Hugging Face Inference API (default; free)
              ├──▶ Together AI (free OSS models)
              ├──▶ Ollama (self-hosted)
              └──▶ Any OpenAI-compatible endpoint
                  (vLLM, LM Studio, llama.cpp server, etc.)
```

## Skills

Each skill is a single file in [`skills/`](./skills). All are independent and can be called directly:

| Skill        | What it does                                                                  |
| ------------ | ----------------------------------------------------------------------------- |
| `tracking`   | Pure DB lookup. Resolves AP/TRK tracking IDs. No LLM.                        |
| `rates`      | Pure compute. Estimates shipping cost from origin / destination / weight.     |
| `intake`     | Stateful wizard that collects shipment details and hands off to `/create-shipment`. |
| `faq`        | RAG: embeds the visitor's question, retrieves top-K KB chunks, asks the LLM to answer with citations. |
| `escalate`   | Marks the support ticket as escalated, posts a system note for human agents. |
| `chat`       | Default fallback. Soft RAG + free-form LLM reply.                             |

## Endpoints

| Method | Path                | Purpose                                          |
| ------ | ------------------- | ------------------------------------------------ |
| POST   | `/api/ai/chat`      | Main entrypoint. Visitor → AI → reply.           |
| GET    | `/api/ai/health`    | Provider status, model, KB count, recent runs.   |
| POST   | `/api/ai/ingest`    | Re-embed KB rows. Admin-only via secret header.  |

## Knowledge base

- Postgres table `ai_kb` with `vector(384)` embeddings (pgvector).
- Seeded with 15 starter chunks (FAQ, services, policy). Run migration `004_ai_swarm.sql` first.
- Admin UI at `/admin/ai-kb` to add / delete / reindex.
- Embeddings use `sentence-transformers/all-MiniLM-L6-v2` by default (Apache-2.0).

## Open-source providers (all free / self-hostable)

### Default: Hugging Face Inference API
- **No API key needed** for many models (rate-limited)
- Models used: `mistralai/Mistral-7B-Instruct-v0.3` (Apache-2.0), `microsoft/Phi-3.5-mini-instruct` (MIT), `meta-llama/Llama-3.2-3B-Instruct` (Llama community license)
- Free tier: ~few hundred requests/hour. Production: get a free HF token, set `AI_API_KEY`

### Together AI (alternative)
- Free tier: `meta-llama/Llama-3.2-3B-Instruct:free`
- Requires `AI_API_KEY` (free signup)

### Ollama (self-hosted, fully free)
```bash
# On any machine with 8GB RAM:
curl -fsSL https://ollama.com/install.sh | sh
ollama pull phi3.5
# Then on Vercel env:
AI_PROVIDER=ollama
AI_MODEL=phi3.5
AI_BASE_URL=http://YOUR-SERVER:11434
```

### vLLM / LM Studio / llama.cpp server
Set `AI_PROVIDER=openai-compatible` and `AI_BASE_URL=https://your-server/v1` (any OpenAI-compatible chat endpoint).

## Client-side: WebLLM (optional)

`/js/airpak-ai.js` can load `@mlc-ai/web-llm` (Apache-2.0) in the visitor's browser if WebGPU is available. It pre-loads `Phi-3.5-mini-instruct-q4f16_1-MLC` (~2.3GB) so replies are instant and free for repeat visitors.

If WebGPU is unavailable (most mobile, some Firefox builds), the script silently falls back to the server endpoint. No UX change.

## Configuration

All env vars in `.env.example`. Minimum required for the swarm to work:
```
AI_PROVIDER=huggingface          # works without any API key
AI_MODEL=mistralai/Mistral-7B-Instruct-v0.3
SUPABASE_URL=https://zygoqqsgzhgpvlpttfbk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...    # for /api/ai/ingest
AI_ADMIN_SECRET=...              # to gate /api/ai/ingest
```

## Scaling

| Traffic level                | Recommended setup                                   |
| ---------------------------- | --------------------------------------------------- |
| Hobby / < 1k chats/day       | Hugging Face free tier. No key needed.              |
| Small business / 10k/day     | Hugging Face paid tier or Together AI ($5 credit free). |
| Production / 100k+/day       | Self-host Ollama / vLLM on a GPU box, point `AI_BASE_URL` at it. |
| Cost-sensitive / privacy     | Self-hosted Ollama. Data never leaves your infra.   |

## Safety

- The router classifies intent **before** any LLM call — saves tokens and avoids sending PII.
- Tracking skill is pure DB query — never sends tracking numbers to the model.
- Intake skill stops after collecting a few basics and links to the secure `/create-shipment` form.
- Escalate skill hands off to a human, no auto-resolution for complaints.
- Every run is logged in `ai_runs` with skill, provider, latency, errors.
- The admin KB UI uses the anon key only; writes go through Supabase RLS — anyone with the URL can read public KB chunks (intentional, since the LLM uses them anyway). To restrict, tighten the RLS policy.