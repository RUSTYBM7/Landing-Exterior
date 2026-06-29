/**
 * Skill: intake
 * Conversational shipment-creation wizard. Walks the visitor through
 * sender → receiver → package → service → pickup and hands off to the
 * existing /create-shipment.html form pre-filled with what we collected.
 *
 * State machine lives in `ctx.intake = { step, data }`.
 */
const STEPS = [
    { key: 'from_city',    prompt: 'Where will the parcel be **picked up from**? (city, country)' },
    { key: 'to_city',      prompt: 'Where is it **going to**? (city, country)' },
    { key: 'weight',       prompt: 'Approximate **weight in kg**? (and dimensions L×W×H in cm if known)' },
    { key: 'service',      prompt: 'Which service do you prefer?\n• Economy (5-7d)\n• Standard (3-5d)\n• Express (1-2d, most popular)\n• Overnight (next day)\n• International Priority (3-7d)' },
    { key: 'recipient',    prompt: 'Who is the **recipient**? Name + phone please.' },
    { key: 'confirm',      prompt: 'ready_to_build' }
];

async function run({ message, ctx, log }) {
    const intake = ctx.intake || { step: 0, data: {} };

    // First-time entry: present intro
    if (intake.step === 0 && !ctx._intake_started) {
        ctx._intake_started = true;
        return {
            handled: true,
            reply:
                "I can help you create a shipment in a few quick steps. Ready? I'll need:\n\n" +
                "1. Pickup city\n2. Destination city\n3. Weight (+ dimensions)\n4. Service level\n5. Recipient name & phone\n\n" +
                "Say **start** to begin, or [open the full form](/create-shipment) instead.",
            ctxPatch: { activeSkill: 'intake', intake: { step: 0, data: {} } }
        };
    }

    // "start" or any positive → begin
    if (intake.step === 0 && /^(start|yes|y|sure|ok)/i.test(message.trim())) {
        return {
            handled: true,
            reply: STEPS[0].prompt,
            ctxPatch: { activeSkill: 'intake', intake: { step: 1, data: {} } }
        };
    }

    // If they don't want the wizard, bail to form
    if (/^(cancel|stop|no|form)/i.test(message.trim())) {
        return {
            handled: true,
            reply: "No problem — [open the full shipment form](/create-shipment) anytime. I'm here if you change your mind.",
            ctxPatch: { activeSkill: null, intake: null }
        };
    }

    // Capture current answer
    const currentStep = STEPS[intake.step - 1];
    if (currentStep && currentStep.key !== 'confirm') {
        intake.data = intake.data || {};
        intake.data[currentStep.key] = message.trim();
    }

    // Advance
    const nextStep = intake.step + 1;
    if (nextStep >= STEPS.length) {
        // Build pre-fill URL
        const params = new URLSearchParams();
        if (intake.data.from_city)   params.set('sender_city', intake.data.from_city);
        if (intake.data.to_city)     params.set('receiver_city', intake.data.to_city);
        if (intake.data.weight)      params.set('weight', intake.data.weight);
        if (intake.data.service)     params.set('service', intake.data.service);
        if (intake.data.recipient)   params.set('receiver_name', intake.data.recipient);
        const url = '/create-shipment?' + params.toString();

        return {
            handled: true,
            reply:
                "Great — I've collected the basics. Continue here with the full form, all the details pre-filled:\n\n" +
                `[**Open the shipment form →**](\${url})\n\n`.replace('${url}', url) +
                "Or tell me anything else to refine the quote.",
            ctxPatch: { activeSkill: null, intake: null, lastIntake: intake.data },
            action: { type: 'open_url', url }
        };
    }

    return {
        handled: true,
        reply: STEPS[nextStep - 1].prompt,
        ctxPatch: { activeSkill: 'intake', intake: { step: nextStep, data: intake.data } }
    };
}

module.exports = { run };