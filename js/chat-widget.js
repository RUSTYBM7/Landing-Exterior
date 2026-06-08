/**
 * Airpak Express - Intercom-Style Chat Widget
 * Connected to Supabase Backend + Telegram Integration
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        supabaseUrl: 'https://zygoqqsgzhgpvlpttfbk.supabase.co',
        supabaseKey: 'sb_publishable_k2V-N9ZdtgkSeZSt_KfZkQ_OLTKJJ46',
        companyName: 'Airpak Express',
        welcomeMessage: 'Welcome to Airpak Express! How can we help you today?',
        accentColor: '#CD2727',
        position: 'right'
    };

    // Session ID for visitor tracking
    let sessionId = localStorage.getItem('airpak_chat_session') || generateSessionId();
    localStorage.setItem('airpak_chat_session', sessionId);

    let isOpen = false;
    let conversationId = null;

    // Create Supabase client
    const supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

    // Generate unique session ID
    function generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Load existing conversation or create new one
    async function initConversation() {
        try {
            // Check for existing open conversation
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('visitor_session_id', sessionId)
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                conversationId = data[0].id;
                return conversationId;
            }

            // Create new conversation
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    visitor_session_id: sessionId,
                    source: 'widget',
                    status: 'open'
                })
                .select()
                .single();

            if (createError) throw createError;
            conversationId = newConv.id;

            // Send welcome message
            await sendBotMessage(CONFIG.welcomeMessage);

            return conversationId;
        } catch (err) {
            console.error('Conversation init error:', err);
            return null;
        }
    }

    // Send message
    async function sendMessage(content) {
        if (!conversationId || !content.trim()) return;

        try {
            // Save user message
            const { error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_type: 'user',
                    content: content.trim()
                });

            if (error) throw error;

            // Track event
            await trackEvent('message_sent', { content_length: content.length });

            // Add message to UI
            addMessageToUI('user', content.trim());
            scrollToBottom();

            // Send auto-response
            setTimeout(async () => {
                await processUserMessage(content.trim());
            }, 500);

        } catch (err) {
            console.error('Send message error:', err);
        }
    }

    // Send bot message
    async function sendBotMessage(content) {
        if (!conversationId) return;

        try {
            await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_type: 'bot',
                    content: content
                });

            addMessageToUI('bot', content);
            scrollToBottom();
        } catch (err) {
            console.error('Bot message error:', err);
        }
    }

    // Process user message with AI-like intelligence
    async function processUserMessage(content) {
        const lowerContent = content.toLowerCase();

        // Greetings
        if (/\b(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings)\b/.test(lowerContent)) {
            const greetings = [
                "Hello! Welcome to Airpak Express. I'm here to help you with all your shipping needs. What can I assist you with today?",
                "Hi there! Thanks for reaching out to Airpak Express. How may I help you today?",
                "Hey! Great to hear from you. I'm your Airpak Express assistant. What would you like to know?"
            ];
            await sendBotMessage(greetings[Math.floor(Math.random() * greetings.length)]);
            return;
        }

        // Tracking related
        if (/\b(track|tracking|where is|status|delivery|shipment|parcel|package)\b/.test(lowerContent)) {
            if (/\d{6,}/.test(content)) {
                await sendBotMessage('I found a tracking number in your message! You can track your shipment at: https://tracking.airpak-express.com\n\nAlternatively, visit our tracking page and enter your tracking number for real-time updates on your delivery status.');
            } else {
                await sendBotMessage('To track your shipment, please visit our tracking page at: https://tracking.airpak-express.com\n\nOr provide your tracking number and I can help guide you through the process.');
            }
            return;
        }

        // Pricing/Rates
        if (/\b(price|cost|rate|quote|charge|fee|amount|pay|price|how much)\b/.test(lowerContent)) {
            if (/\b(singapore|malaysia|thailand|indonesia|usa|uk|europe|asia)\b/.test(lowerContent)) {
                await sendBotMessage('Great question! I can help you with international shipping rates. For the most accurate quote, please:\n\n1. Visit: https://shipnow.airpak-express.com\n2. Or provide your exact origin, destination, package weight, and dimensions.\n\nOur rates are competitive and we offer express delivery options as well.');
            } else {
                await sendBotMessage('For shipping rates, I\'ll need a few details:\n\n• Origin country\n• Destination country  \n• Package weight & dimensions\n• Service type (Express/Standard)\n\nVisit https://shipnow.airpak-express.com for instant quotes, or share these details and I\'ll connect you with our team.');
            }
            return;
        }

        // Contact information
        if (/\b(contact|phone|call|email|reach|speak|human|agent|real person|live)\b/.test(lowerContent)) {
            await sendBotMessage('You can reach us through:\n\n📞 Phone: +65 XXXX XXXX\n📧 Email: support@airpak-express.com\n💬 Telegram: @AirpakExpress\n\nOr continue chatting here and an agent will respond shortly!');
            return;
        }

        // Delivery times
        if (/\b(deliver|delivery|days|how long|time|when|eta|arrive|arrival)\b/.test(lowerContent)) {
            await sendBotMessage('Delivery times vary by destination and service:\n\n✈️ Express: 2-5 business days\n🚢 Standard: 7-14 business days\n\nFor exact estimates, visit https://shipnow.airpak-express.com with your route details.');
            return;
        }

        // Pickup service
        if (/\b(pickup|pick-up|collect|collection|doorstep|home pickup)\b/.test(lowerContent)) {
            await sendBotMessage('Yes, we offer door-to-door pickup service!\n\nTo schedule a pickup:\n1. Login at https://shipnow.airpak-express.com\n2. Create a shipment order\n3. Select pickup date & time\n\nOur courier will collect your package from your specified address.');
            return;
        }

        // Customs/Import
        if (/\b(customs|import|duty|tax|clearance|prohibited|restricted)\b/.test(lowerContent)) {
            await sendBotMessage('For customs information, please note:\n\n• Each country has different import regulations\n• Some items may require permits or are prohibited\n• Duties and taxes may apply at destination\n\nCheck our shipping guidelines or contact us for specific destination requirements.');
            return;
        }

        // Packaging
        if (/\b(pack|package|box|envelope|wrap|bubble|fragile)\b/.test(lowerContent)) {
            await sendBotMessage('Proper packaging tips:\n\n• Use a sturdy box appropriate for contents\n• Wrap fragile items with bubble wrap\n• Seal all edges securely\n• Label packages clearly\n• Include sender/receiver info inside & outside\n\nWe also offer packing supplies if needed!');
            return;
        }

        // Signup/Login
        if (/\b(sign up|register|create account|signup|signin|login|log in)\b/.test(lowerContent)) {
            await sendBotMessage('Get started with Airpak Express:\n\n📦 New user? Sign up at: https://shipnow.airpak-express.site/signup\n\n🔐 Existing user? Login at: https://shipnow.airpak-express.site/\n\nFor enterprise solutions, visit: https://admin.airpak-express.site');
            return;
        }

        // Insurance
        if (/\b(insurance|insured|coverage|protect|claim|compensation)\b/.test(lowerContent)) {
            await sendBotMessage('We offer cargo insurance for your peace of mind:\n\n• Coverage available for declared value\n• Protects against loss or damage\n• Affordable rates based on shipment value\n\nContact our team for insurance options on your specific shipment.');
            return;
        }

        // Services
        if (/\b(service|services|express|standard|economy|same day|next day|freight|cargo)\b/.test(lowerContent)) {
            await sendBotMessage('Our services include:\n\n✈️ International Express Courier\n🚢 Sea & Air Freight\n📦 Warehousing & Fulfilment\n🚚 Domestic Delivery\n🌍 Customs Clearance\n\nVisit our services page or contact us for details on which option suits your needs best!');
            return;
        }

        // Working hours
        if (/\b(hour|open|close|time|available|operation)\b/.test(lowerContent)) {
            await sendBotMessage('Airpak Express operating hours:\n\n🕐 Customer Support: Mon-Fri, 9AM-6PM SGT\n📦 Pickup: Mon-Sat, 9AM-6PM\n🌐 Online: 24/7 at shipnow.airpak-express.com\n\nFor urgent matters outside hours, use our chat and we\'ll respond ASAP.');
            return;
        }

        // Thank you / Goodbye
        if (/\b(thanks|thank you|thx|appreciate|bye|goodbye|see you|take care)\b/.test(lowerContent)) {
            await sendBotMessage("You're welcome! It was my pleasure assisting you. Don't hesitate to reach out if you have any more questions. Have a great day!");
            return;
        }

        // Help command
        if (/\b(help|what can you do|commands|menu|options)\b/.test(lowerContent)) {
            await sendBotMessage('I can help you with:\n\n📦 Tracking - Check shipment status\n💰 Pricing - Get shipping quotes\n🚚 Delivery - Delivery times & options\n📋 Services - Learn about our services\n📞 Contact - Reach our team\n📦 Pickup - Schedule door-to-door collection\n📝 Signup - Create an account\n❓ General - Any other questions\n\nJust type your question!');
            return;
        }

        // Default response with escalation
        const defaultResponses = [
            "Thanks for your message! I've forwarded it to our support team and someone will get back to you shortly.",
            "I appreciate your question. Our team will review and respond as soon as possible.",
            "Great question! I've noted it down and an agent will provide detailed assistance shortly."
        ];
        await sendBotMessage(defaultResponses[Math.floor(Math.random() * defaultResponses.length)] + '\n\nFor immediate assistance, contact us at support@airpak-express.com or visit our FAQ page.');
    }

    // Add message to UI
    function addMessageToUI(type, content) {
        const messagesContainer = document.getElementById('airpakMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'airpak-msg airpak-msg-' + type;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (type === 'user') {
            messageDiv.innerHTML = '<div class="airpak-msg-bubble airpak-msg-user"><p>' + escapeHtml(content) + '</p></div><span class="airpak-msg-time">' + time + '</span>';
        } else {
            messageDiv.innerHTML = '<div class="airpak-msg-avatar"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="' + CONFIG.accentColor + '"/><path d="M12 6C8.69 6 6 8.69 6 12s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/></svg></div><div class="airpak-msg-content"><div class="airpak-msg-bubble airpak-msg-bot"><p>' + content.replace(/\n/g, '<br>') + '</p></div><span class="airpak-msg-time">' + time + '</span></div>';
        }

        messagesContainer.appendChild(messageDiv);
    }

    function scrollToBottom() {
        const messagesContainer = document.getElementById('airpakMessages');
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function trackEvent(eventType, data) {
        try {
            await supabase.from('widget_events').insert({
                session_id: sessionId,
                event_type: eventType,
                event_data: data || {},
                page_url: window.location.href,
                referrer: document.referrer
            });
        } catch (err) { console.error('Track event error:', err); }
    }

    async function loadHistory() {
        if (!conversationId) return;
        try {
            const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
            if (error) throw error;
            if (data) {
                const messagesContainer = document.getElementById('airpakMessages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '';
                    data.forEach(msg => addMessageToUI(msg.sender_type === 'user' ? 'user' : 'bot', msg.content));
                    scrollToBottom();
                }
            }
        } catch (err) { console.error('Load history error:', err); }
    }

    // Create widget HTML
    function createWidget() {
        const widgetHTML = '<style>\
.airpak-chat-widget{position:fixed;bottom:24px;right:24px;z-index:999999;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}\
.airpak-chat-btn{width:60px;height:60px;border-radius:50%;background:' + CONFIG.accentColor + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(205,39,39,0.4);transition:all 0.3s ease;position:relative}\
.airpak-chat-btn:hover{transform:scale(1.05);box-shadow:0 6px 25px rgba(205,39,39,0.5)}\
.airpak-chat-btn svg{width:28px;height:28px;fill:white}\
.airpak-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#4CAF50;border-radius:50%;border:2px solid white;display:none}\
.airpak-chat-btn.has-unread .airpak-badge{display:block;animation:pulse 2s infinite}\
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}\
.airpak-chat-window{position:absolute;bottom:80px;right:0;width:380px;max-width:calc(100vw - 48px);height:580px;max-height:calc(100vh - 120px);background:white;border-radius:16px;box-shadow:0 10px 50px rgba(0,0,0,0.2);display:none;flex-direction:column;overflow:hidden;animation:slideUp 0.3s ease}\
.airpak-chat-window.active{display:flex}\
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\
.airpak-chat-header{background:linear-gradient(135deg,' + CONFIG.accentColor + ' 0%,#a01f1f 100%);padding:20px;display:flex;align-items:center;justify-content:space-between}\
.airpak-chat-header-info{display:flex;align-items:center;gap:12px}\
.airpak-chat-avatar{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center}\
.airpak-chat-avatar svg{width:24px;height:24px;fill:white}\
.airpak-chat-header-text h4{color:white;margin:0;font-size:16px;font-weight:600}\
.airpak-chat-header-text p{color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px;display:flex;align-items:center;gap:6px}\
.airpak-status-dot{width:8px;height:8px;background:#4CAF50;border-radius:50%;display:inline-block}\
.airpak-chat-header-actions{display:flex;gap:8px}\
.airpak-chat-action-btn{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s}\
.airpak-chat-action-btn:hover{background:rgba(255,255,255,0.2)}\
.airpak-chat-action-btn svg{width:16px;height:16px;fill:white}\
.airpak-quick-actions{background:#f8f9fa;padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #eee}\
.airpak-quick-btn{padding:8px 14px;background:white;border:1px solid #e0e0e0;border-radius:20px;font-size:12px;color:#333;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px}\
.airpak-quick-btn:hover{background:' + CONFIG.accentColor + ';color:white;border-color:' + CONFIG.accentColor + '}\
.airpak-quick-btn svg{width:14px;height:14px}\
.airpak-messages{flex:1;overflow-y:auto;padding:20px;background:#f5f5f5;display:flex;flex-direction:column;gap:16px}\
.airpak-messages::-webkit-scrollbar{width:6px}\
.airpak-messages::-webkit-scrollbar-track{background:transparent}\
.airpak-messages::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}\
.airpak-msg{display:flex;gap:8px;max-width:85%}\
.airpak-msg-user{margin-left:auto;flex-direction:row-reverse}\
.airpak-msg-avatar{flex-shrink:0}\
.airpak-msg-content{display:flex;flex-direction:column;gap:4px}\
.airpak-msg-bubble{padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.5}\
.airpak-msg-user .airpak-msg-bubble{background:' + CONFIG.accentColor + ';color:white;border-bottom-right-radius:4px}\
.airpak-msg-bot .airpak-msg-bubble{background:white;color:#333;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.1)}\
.airpak-msg-bubble p{margin:0}\
.airpak-msg-time{font-size:10px;color:#999}\
.airpak-msg-user .airpak-msg-time{text-align:right}\
.airpak-input-area{padding:16px;background:white;border-top:1px solid #eee}\
.airpak-input-wrapper{display:flex;align-items:flex-end;gap:12px;background:#f5f5f5;border-radius:24px;padding:8px 8px 8px 20px}\
.airpak-input{flex:1;border:none;background:transparent;font-size:14px;resize:none;max-height:100px;outline:none;font-family:inherit}\
.airpak-input::placeholder{color:#999}\
.airpak-send-btn{width:40px;height:40px;border-radius:50%;background:' + CONFIG.accentColor + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}\
.airpak-send-btn:hover{background:#a01f1f;transform:scale(1.05)}\
.airpak-send-btn svg{width:18px;height:18px;fill:white;margin-left:2px}\
.airpak-powered{text-align:center;padding:8px;font-size:10px;color:#999;background:#fafafa}\
.airpak-powered a{color:' + CONFIG.accentColor + ';text-decoration:none}\
@media(max-width:480px){.airpak-chat-widget{bottom:16px;right:16px}.airpak-chat-window{width:calc(100vw - 32px);height:calc(100vh - 100px);max-height:none;right:-8px}.airpak-quick-actions{display:none}}\
</style>\
\
<div class="airpak-chat-widget" id="airpakChatWidget">\
<div class="airpak-chat-window" id="airpakChatWindow">\
<div class="airpak-chat-header">\
<div class="airpak-chat-header-info">\
<div class="airpak-chat-avatar"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>\
<div class="airpak-chat-header-text"><h4>' + CONFIG.companyName + '</h4><p><span class="airpak-status-dot"></span> Typically replies in minutes</p></div>\
</div>\
<div class="airpak-chat-header-actions"><button class="airpak-chat-action-btn" onclick="toggleAirpakChat()" title="Minimize"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>\
</div>\
<div class="airpak-quick-actions">\
<button class="airpak-quick-btn" onclick="window.open(\'https://tracking.airpak-express.com\', \'_blank\')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>Track Shipment</button>\
<button class="airpak-quick-btn" onclick="window.open(\'/contact.html\', \'_blank\')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Contact Us</button>\
<button class="airpak-quick-btn" onclick="window.open(\'https://shipnow.airpak-express.site\', \'_blank\')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>Get Quote</button>\
</div>\
<div class="airpak-messages" id="airpakMessages"></div>\
<div class="airpak-input-area">\
<div class="airpak-input-wrapper">\
<textarea class="airpak-input" id="airpakInput" placeholder="Type your message..." rows="1"></textarea>\
<button class="airpak-send-btn" id="airpakSendBtn" onclick="sendAirpakMessage()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>\
</div>\
</div>\
<div class="airpak-powered">Powered by <a href="#">Airpak Express</a> · <a href="#">Telegram Support</a></div>\
</div>\
<button class="airpak-chat-btn" id="airpakChatBtn" onclick="toggleAirpakChat()"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg><span class="airpak-badge"></span></button>\
</div>\
\
<script>\
if(!window.supabase){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";s.onload=initAirpakChat;document.head.appendChild(s)}else{initAirpakChat()}\
function initAirpakChat(){initConversation().then(function(){loadHistory()});document.getElementById("airpakInput").addEventListener("keypress",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAirpakMessage()}});document.getElementById("airpakInput").addEventListener("input",function(){this.style.height="auto";this.style.height=Math.min(this.scrollHeight,100)+"px"})}\
function toggleAirpakChat(){var w=document.getElementById("airpakChatWindow");var b=document.getElementById("airpakChatBtn");w.classList.toggle("active");b.classList.remove("has-unread")}\
function sendAirpakMessage(){var i=document.getElementById("airpakInput");var m=i.value.trim();if(!m)return;sendMessage(m);i.value="";i.style.height="auto"}\
window.toggleAirpakChat=toggleAirpakChat;window.sendAirpakMessage=sendAirpakMessage;\
</script>';

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();