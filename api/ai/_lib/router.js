/**
 * Skill router. Cheap intent classifier — picks which skill should
 * handle the visitor's message. Runs BEFORE the LLM to save tokens
 * and avoid sending PII to the model.
 *
 * Returns one of: 'tracking' | 'rates' | 'intake' | 'faq' | 'escalate' | 'chat'
 */
const INTENTS = {
    tracking: /\b(track|tracking|where\s*is|status\s*of|trace|find\s*my\s*package|shipment\s*status|delivery\s*status|ap\d+|trk\d+)\b/i,
    rates:    /\b(rate|price|cost|how\s*much|quote|estimate|charges?|fees?|shipping\s*cost)\b/i,
    intake:   /\b(create|send|new\s*shipment|ship\s*a\s*package|book|schedule|arrange\s*a\s*pickup|i\s*want\s*to\s*ship)\b/i,
    escalate: /\b(human|agent|person|supervisor|manager|complaint|angry|frustrat|speak\s*to\s*someone|call\s*me|representative)\b/i,
};

function classify(text, ctx = {}) {
    const t = String(text || '').trim();
    if (!t) return 'faq';

    // Hard escalation overrides everything
    if (INTENTS.escalate.test(t)) return 'escalate';

    // Look for tracking-id patterns
    if (/\b(?:AP|TRK|APE)[-]?\d{6,}\b/i.test(t)) return 'tracking';

    // If we already have a tracking context and the user says "yes" / "no" / short reply,
    // keep them in the tracking flow
    if (ctx.activeSkill === 'tracking' && t.length < 30) return 'tracking';

    // Intent keywords
    for (const [intent, rx] of Object.entries(INTENTS)) {
        if (intent === 'escalate') continue;
        if (rx.test(t)) return intent;
    }
    return 'faq';
}

module.exports = { classify };