# AirPak Express — Live Chat + WhatsApp Bridge

This directory hosts the **real-time chat bridge** that connects the public
landing page chat widget (`/js/chat-widget.js`) and any incoming
**WhatsApp Business messages** to your admin portal at
[airpak-portal](https://github.com/RUSTYBM7/airpak-portal).

```
┌────────────────────┐         ┌──────────────────────────────┐
│  Visitor (web)     │ ──────▶ │ /api/chat/send               │
│  Chat widget       │         │  → support_tickets (web)     │
└────────────────────┘         │  → messages                  │
                               └──────────────────────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │  Supabase (Postgres + RLS)    │
                               │  support_tickets             │
                               │  messages                    │
                               └──────────────────────────────┘
                                              │
                          ┌───────────────────┴────────────────────┐
                          ▼                                        ▼
              ┌─────────────────────┐               ┌──────────────────────────┐
              │  Admin Portal       │               │  /api/whatsapp/send      │
              │  AdminChat.tsx      │  insert msg   │   → Twilio / 360dialog   │
              │  realtime subs.     │ ─────────────▶│   → customer WhatsApp    │
              └─────────────────────┘  TRIGGER      └──────────────────────────┘
                          ▲
                          │
              ┌─────────────────────┐
              │  /api/whatsapp/     │
              │   webhook (inbound) │
              │  ← BSP callback     │
              └─────────────────────┘
                          │
                          ▼
              Customer texts +1 (805) 395-6873
              → message lands as channel='whatsapp'
                ticket → admin sees in portal queue
```

## Endpoints

| Method | Path                  | Purpose                                         |
| ------ | --------------------- | ----------------------------------------------- |
| POST   | `/api/chat/send`      | Visitor sends a message from the web widget     |
| GET    | `/api/chat/poll`      | Widget long-polls for new admin replies         |
| POST   | `/api/whatsapp/webhook` | BSP callback for incoming WhatsApp messages   |
| GET    | `/api/whatsapp/webhook` | Meta/360dialog verification handshake         |
| POST   | `/api/whatsapp/send`  | Internal — Supabase trigger forwards to BSP     |
| GET    | `/api/whatsapp/health` | Status check (no secrets leaked)              |

## Files

```
api/
├── _lib/
│   ├── supabase.js     # server-side Supabase (service role)
│   └── bsp.js          # WhatsApp BSP adapter (twilio / 360dialog / meta)
├── chat/
│   ├── send.js         # widget → backend
│   └── poll.js         # backend → widget
└── whatsapp/
    ├── webhook.js      # inbound
    ├── send.js         # outbound (called by Supabase trigger)
    └── health.js
```

## End-user experience

- The widget **looks identical** — same dark UI, same tabs, same bubbles.
- Canned "AI" responses are replaced with **real admin replies**.
- When an admin replies via WhatsApp from the portal, the visitor sees
  the reply appear in the widget in real time.
- **No WhatsApp branding is ever shown** to the visitor. The number
  `+1 (805) 395-6873` stays admin-only.

## Configuration

See `.env.example` for the full list. The required keys are:

```
SUPABASE_SERVICE_ROLE_KEY=...
WHATSAPP_PROVIDER=twilio | 360dialog | meta
WHATSAPP_FROM=+18053956873
WHATSAPP_TOKEN=...
WHATSAPP_BRIDGE_SECRET=...
```

## Setting up the BSP webhook

1. Pick a provider. **Twilio** is the simplest.
2. In the BSP dashboard, set the inbound webhook URL to
   `https://<your-domain>.vercel.app/api/whatsapp/webhook`.
3. Set the same `WHATSAPP_BRIDGE_SECRET` value here and in the BSP.
4. Run the SQL migration in
   [`supabase/migrations/003_whatsapp_bridge.sql`](../supabase/migrations/003_whatsapp_bridge.sql).
5. Configure the trigger Postgres settings:

   ```sql
   ALTER DATABASE postgres SET app.bp_bridge_url    TO 'https://<your-domain>.vercel.app/api/whatsapp/send';
   ALTER DATABASE postgres SET app.bp_bridge_secret TO '<WHATSAPP_BRIDGE_SECRET>';
   ```

## Testing

```bash
# Health
curl https://<your-domain>.vercel.app/api/whatsapp/health

# Send a fake visitor message
curl -X POST https://<your-domain>.vercel.app/api/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test-1","message":"hello","visitorName":"Tester"}'

# Simulate WhatsApp inbound
curl -X POST https://<your-domain>.vercel.app/api/whatsapp/webhook \
  -H 'Content-Type: application/json' \
  -H 'X-Bridge-Secret: <your-secret>' \
  -d '{"From":"whatsapp:+15551234567","Body":"Hi from phone","ProfileName":"Alice","MessageSid":"SM123"}'
```

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. **Never** expose it to the browser.
- The widget only knows the public anon key — it goes through
  `/api/chat/*` and never touches service-role endpoints directly.
- The `WHATSAPP_BRIDGE_SECRET` should match what's configured in the
  Supabase `app.bp_bridge_secret` GUC and in the BSP webhook setup.