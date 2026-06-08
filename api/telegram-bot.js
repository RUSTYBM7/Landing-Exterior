/**
 * Airpak Express Telegram Bot with MiniMax Agent Integration
 * Handles customer support via Telegram
 */

const express = require('express');
const router = express.Router();

const TELEGRAM_API = 'https://api.telegram.org';

// Configuration
const CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.ADMIN_TELEGRAM_ID || '',
    supabaseUrl: process.env.SUPABASE_URL || 'https://zygoqqsgzhgpvlpttfbk.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
    minimaxApiKey: process.env.MINIMAX_API_KEY || '',
    minimaxBotId: process.env.MINIMAX_BOT_ID || ''
};

// Simple message handler for the bot
const messageHandlers = {
    start: async (chatId, userName) => {
        const welcomeMessage = `Welcome to Airpak Express Support, ${userName}! 👋

I'm your AI assistant and can help you with:
- 📦 Shipping & Tracking
- 💰 Rates & Quotes
- 📍 Pickup & Delivery info
- ❓ General inquiries

How can I assist you today?`;

        await sendTelegramMessage(chatId, welcomeMessage);
    },

    help: async (chatId) => {
        const helpMessage = `Available commands:

/start - Start conversation
/help - Show this help
/track <tracking_number> - Track your shipment
/quote - Get a shipping quote
/contact - Contact human support
/status - Check open tickets

Or just type your question and I'll help!`;
        await sendTelegramMessage(chatId, helpMessage);
    },

    track: async (chatId, args) => {
        const trackingNumber = args.join(' ').trim();
        if (!trackingNumber) {
            await sendTelegramMessage(chatId, 'Please provide a tracking number.\nExample: /track ABC123456');
            return;
        }
        // Forward to tracking API
        await sendTelegramMessage(chatId, `Searching for tracking number: ${trackingNumber}...\n\nPlease visit https://tracking.airpak-express.com for detailed tracking.`);
    },

    contact: async (chatId) => {
        const contactMessage = `Connect with our human support team:

📧 Email: support@airpak-express.com
📞 Phone: +65 XXXX XXXX
🌐 Website: airpak-express.com

Or continue chatting here and an agent will respond shortly.`;
        await sendTelegramMessage(chatId, contactMessage);
    },

    default: async (chatId, messageText) => {
        // Use MiniMax Agent for intelligent responses
        const response = await getMiniMaxResponse(messageText);
        await sendTelegramMessage(chatId, response);
    }
};

// Send message to Telegram
async function sendTelegramMessage(chatId, text, parseMode = 'HTML') {
    try {
        const response = await fetch(`${TELEGRAM_API}/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: parseMode
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Telegram send error:', error);
        return null;
    }
}

// Get response from MiniMax Agent
async function getMiniMaxResponse(userMessage) {
    // If MiniMax is not configured, use basic responses
    if (!CONFIG.minimaxApiKey) {
        return getBasicResponse(userMessage);
    }

    try {
        const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.minimaxApiKey}`
            },
            body: JSON.stringify({
                model: 'abab5.5-chat',
                messages: [{
                    role: 'user',
                    content: `You are a helpful customer support assistant for Airpak Express, a Singapore-based courier and logistics company.

Customer question: ${userMessage}

Provide a helpful, concise response. If you cannot answer, suggest contacting human support.`
                }]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || getBasicResponse(userMessage);
    } catch (error) {
        console.error('MiniMax API error:', error);
        return getBasicResponse(userMessage);
    }
}

// Basic response fallback
function getBasicResponse(message) {
    const lower = message.toLowerCase();

    if (lower.includes('tracking') || lower.includes('track')) {
        return 'To track your shipment, please visit: https://tracking.airpak-express.com or provide your tracking number.';
    }
    if (lower.includes('price') || lower.includes('rate') || lower.includes('quote')) {
        return 'For shipping rates, please provide:\n- Origin & destination\n- Package weight & dimensions\n\nVisit https://shipnow.airpak-express.com for instant quotes.';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        return 'Hello! How can I help you today? I can assist with tracking, shipping rates, and general inquiries.';
    }
    if (lower.includes('contact') || lower.includes('human')) {
        return 'To speak with a human agent, email support@airpak-express.com or call +65 XXXX XXXX.';
    }

    return 'Thanks for your message! An agent will respond shortly. For urgent matters, contact us at support@airpak-express.com';
}

// Telegram webhook handler
router.post('/webhook', async (req, res) => {
    const { message, edited_message, callback_query } = req.body;

    try {
        if (callback_query) {
            // Handle callback queries (button clicks)
            const chatId = callback_query.message.chat.id;
            const data = callback_query.data;

            // Process callback
            if (data === 'contact_support') {
                await sendTelegramMessage(chatId, 'Connecting you with a human agent... Please wait.');
            }

            return res.send({ ok: true });
        }

        const msg = message || edited_message;
        if (!msg) return res.send({ ok: true });

        const chatId = msg.chat.id;
        const text = msg.text || '';
        const userName = msg.from.first_name || 'there';

        // Parse command
        const [command, ...args] = text.split(' ');
        const commandLower = command?.toLowerCase();

        if (commandLower === '/start') {
            await messageHandlers.start(chatId, userName);
        } else if (commandLower === '/help') {
            await messageHandlers.help(chatId);
        } else if (commandLower === '/track') {
            await messageHandlers.track(chatId, args);
        } else if (commandLower === '/contact') {
            await messageHandlers.contact(chatId);
        } else if (commandLower === '/quote') {
            await sendTelegramMessage(chatId, 'Visit https://shipnow.airpak-express.com for instant shipping quotes!');
        } else {
            await messageHandlers.default(chatId, text);
        }

        // Log message to database
        await logMessage(chatId, text, 'telegram');

        res.send({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.send({ ok: false });
    }
});

// Set webhook
router.get('/setup', async (req, res) => {
    const webhookUrl = req.query.url;

    if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL required' });
    }

    try {
        const response = await fetch(`${TELEGRAM_API}/bot${CONFIG.botToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log message to Supabase
async function logMessage(sessionId, content, source) {
    // This would log to Supabase conversations table
    console.log('Log message:', { sessionId, content, source });
}

// Admin: Send message to user via Telegram
router.post('/send', async (req, res) => {
    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ error: 'userId and message required' });
    }

    try {
        const result = await sendTelegramMessage(userId, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get pending conversations
router.get('/conversations', async (req, res) => {
    // This would fetch from Supabase
    res.json({ conversations: [] });
});

module.exports = router;