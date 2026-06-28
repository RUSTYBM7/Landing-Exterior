/**
 * AirpakBridge — client side of the real-time WhatsApp bridge.
 *
 * - Anonymous visitors get a stable sessionId stored in localStorage.
 * - send(text)  POSTs to /api/chat/send which:
 *      1) finds-or-creates a support_tickets row (channel='web'),
 *      2) inserts the user message into messages,
 *      3) returns the latest admin/bot reply (if any).
 * - poll()      long-polls /api/chat/poll for any newer admin messages
 *      and injects them into the existing chat-messages-tab.
 *
 * Nothing here changes the widget's look. It only swaps the canned
 * AI responses for real backend traffic. WhatsApp stays invisible
 * to the visitor — the admin in the portal sees channel='whatsapp'.
 */
(function () {
    'use strict';
    const STORAGE_KEY = 'airpak_chat_session';
    const POLL_MS = 4000;

    function getSession() {
        try {
            let s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!s) {
                s = {
                    sessionId: 'web-' + crypto.randomUUID(),
                    visitorName: '',
                    createdAt: Date.now()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
            }
            return s;
        } catch (e) {
            return { sessionId: 'web-' + Math.random().toString(36).slice(2), visitorName: '' };
        }
    }

    function setSession(patch) {
        const s = Object.assign(getSession(), patch);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
    }

    async function postJSON(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }

    async function getJSON(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }

    let lastSeenAt = new Date().toISOString();

    async function poll() {
        const s = getSession();
        if (!s.ticketId) return; // not started yet
        try {
            const data = await getJSON('/api/chat/poll?ticketId=' + encodeURIComponent(s.ticketId) + '&after=' + encodeURIComponent(lastSeenAt));
            if (data && Array.isArray(data.messages)) {
                data.messages.forEach(m => {
                    appendBridge(m.content, m.sender_type);
                    if (new Date(m.created_at) > new Date(lastSeenAt)) {
                        lastSeenAt = m.created_at;
                    }
                });
            }
        } catch (e) {
            // silent — poll loop continues
        }
    }

    function appendBridge(text, senderType) {
        const tab = document.getElementById('chat-messages-tab');
        if (!tab) return;
        const div = document.createElement('div');
        // senderType 'admin' or 'ai' → bot bubble (UI identical to existing)
        // senderType 'user' is rare here (we already show user's own)
        div.className = 'chat-message ' + (senderType === 'user' ? 'user' : 'bot');
        div.innerHTML = '<div class="bubble">' + escapeHtml(text) + '</div>';
        tab.appendChild(div);
        tab.scrollTop = tab.scrollHeight;
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function send(text) {
        const s = getSession();
        const res = await postJSON('/api/chat/send', {
            sessionId: s.sessionId,
            ticketId: s.ticketId || null,
            visitorName: s.visitorName || '',
            message: text,
            page: location.pathname,
            userAgent: navigator.userAgent
        });
        if (res && res.ticketId) setSession({ ticketId: res.ticketId });
        if (res && Array.isArray(res.recent)) {
            // Already-received messages (in case of race) — only inject newer
            res.recent.forEach(m => {
                if (new Date(m.created_at) > new Date(lastSeenAt)) {
                    lastSeenAt = m.created_at;
                }
            });
        }
        if (res && res.autoReply) return res.autoReply;
        return 'Thanks — a team member will be with you shortly.';
    }

    // Expose
    window.AirpakBridge = { send, poll, getSession, setSession };

    // Start polling loop once DOM has the chat panel
    document.addEventListener('DOMContentLoaded', function () {
        setInterval(poll, POLL_MS);
    });
})();