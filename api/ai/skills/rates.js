/**
 * Skill: rates
 * Quick shipping cost estimate from structured input or message parsing.
 * Falls back to a guide if we don't have enough info.
 */

const ZONES = {
    domestic_sg: { sg: 1, my: 2 },
    asia: { sg: 1, my: 1.1, id: 1.2, th: 1.2, ph: 1.3, vn: 1.3, hk: 1.1, cn: 1.4, jp: 1.5, kr: 1.5, in: 1.5 },
    intl: { us: 3.5, uk: 3.7, eu: 3.8, au: 3.0, ae: 3.2 }
};

const SERVICES = {
    Economy:        { base: 9.9,  perKg: 4.0,  etaDays: 6 },
    Standard:       { base: 14.9, perKg: 5.5,  etaDays: 4 },
    Express:        { base: 24.9, perKg: 7.5,  etaDays: 2 },
    Overnight:      { base: 39.9, perKg: 9.5,  etaDays: 1 },
    'International Priority': { base: 49.0, perKg: 14.0, etaDays: 5 }
};

function estimate({ origin = 'sg', destination = 'sg', weightKg = 1, dim = {} }) {
    // Find zone multiplier
    const allZones = { ...ZONES.domestic_sg, ...ZONES.asia, ...ZONES.intl };
    const zoneMul = allZones[destination.toLowerCase()] || 3.5;
    const isDomestic = origin.toLowerCase() === destination.toLowerCase();

    // Dimensional weight: L*W*H/5000
    const dimW = ((dim.l || 0) * (dim.w || 0) * (dim.h || 0)) / 5000;
    const chargeable = Math.max(Number(weightKg) || 1, dimW, 1);

    const out = {};
    for (const [name, cfg] of Object.entries(SERVICES)) {
        const total = (cfg.base + cfg.perKg * chargeable) * (isDomestic ? 1 : zoneMul);
        out[name] = {
            price: Math.round(total * 100) / 100,
            eta: `${cfg.etaDays} day${cfg.etaDays > 1 ? 's' : ''}`,
            currency: 'USD'
        };
    }
    return { chargeableKg: Math.round(chargeable * 10) / 10, services: out, zoneMul };
}

function parseMessage(msg) {
    // "5kg box from singapore to new york"  →  { origin:'sg', destination:'us', weight:5 }
    const text = String(msg || '').toLowerCase();
    const weight = (text.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|lb|pound)/) || [])[1];
    const cities = ['singapore','malaysia','kuala lumpur','jakarta','bangkok','manila','hanoi','hong kong','shanghai','tokyo','seoul','mumbai','new york','los angeles','london','paris','sydney','dubai'];
    const found = cities.filter(c => text.includes(c));
    return {
        origin: found[0] ? slug(found[0]) : null,
        destination: found[1] ? slug(found[1]) : null,
        weightKg: weight ? parseFloat(weight) : null
    };
}

function slug(name) {
    return ({
        'singapore': 'sg', 'malaysia': 'my', 'kuala lumpur': 'my',
        'jakarta': 'id', 'bangkok': 'th', 'manila': 'ph', 'hanoi': 'vn',
        'hong kong': 'hk', 'shanghai': 'cn', 'tokyo': 'jp', 'seoul': 'kr',
        'mumbai': 'in', 'new york': 'us', 'los angeles': 'us',
        'london': 'uk', 'paris': 'eu', 'sydney': 'au', 'dubai': 'ae'
    })[name] || name.split(' ')[0].slice(0, 3);
}

async function run({ message, ctx, log }) {
    const parsed = parseMessage(message);
    const merged = {
        origin:      ctx.origin      || parsed.origin      || 'sg',
        destination: ctx.destination || parsed.destination || 'us',
        weightKg:    ctx.weightKg    || parsed.weightKg    || 1
    };

    // Need at least one explicit hint (origin/destination/weight) before estimating
    const hasHint = (parsed.origin || parsed.destination || parsed.weightKg || (ctx.origin || ctx.destination || ctx.weightKg));
    if (!hasHint) {
        return {
            handled: true,
            reply:
                "Happy to give you a rate estimate. Tell me:\n" +
                "• origin city\n• destination city\n• weight (kg)\n\n" +
                "Example: *5kg box from Singapore to New York*.",
            ctxPatch: { activeSkill: 'rates', awaiting: 'rate_input' }
        };
    }

    const est = estimate(merged);
    log({ stage: 'estimate', est });

    const lines = Object.entries(est.services)
        .map(([name, s]) => `• **${name}** — $${s.price} (ETA ${s.eta})`)
        .join('\n');

    return {
        handled: true,
        reply:
            `📐 **Rate estimate** (${merged.origin.toUpperCase()} → ${merged.destination.toUpperCase()}, ${merged.weightKg}kg chargeable)\n\n` +
            lines + '\n\n' +
            'Prices are indicative — final cost depends on actual dimensions and any accessorials. Ready to book? [Create a shipment](/create-shipment).',
        ctxPatch: { activeSkill: 'rates', ...merged, lastEstimate: est }
    };
}

module.exports = { run, estimate };