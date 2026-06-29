/**
 * Airpak Express - Chat Widget JavaScript
 * Dark AI Agent Interface with tabs
 */

(function() {
    // Create widget structure
    const widgetHTML = `
        <div id="airpak-chat-toggle" aria-label="Open chat">
            <div class="chat-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <span class="chat-text">Chat With Us</span>
        </div>
        <div id="airpak-chat-window">
            <button id="airpak-chat-close">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div id="airpak-chat-header">
                <div class="chat-header-top">
                    <div class="chat-avatar">A</div>
                    <div class="chat-status">
                        <h3>Airpak Assistant</h3>
                        <span>AI-powered support</span>
                    </div>
                </div>
                <div class="chat-search">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <input type="text" placeholder="Search help articles..." id="chat-search-input">
                </div>
            </div>
            <div id="airpak-chat-content">
                <!-- Home Tab Content -->
                <div class="chat-tab-content" id="chat-home-tab">
                    <div class="chat-section">
                        <div class="chat-section-title">Quick Actions</div>
                        <div class="quick-actions">
                            <div class="quick-action-card" data-action="track">
                                <div class="quick-action-icon">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                </div>
                                <div class="quick-action-text">
                                    <span>Track Shipment</span>
                                    <small>Check your package status</small>
                                </div>
                                <span class="quick-action-arrow">→</span>
                            </div>
                            <div class="quick-action-card" data-action="quote">
                                <div class="quick-action-icon">
                                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                </div>
                                <div class="quick-action-text">
                                    <span>Get a Quote</span>
                                    <small>Calculate shipping cost</small>
                                </div>
                                <span class="quick-action-arrow">→</span>
                            </div>
                            <div class="quick-action-card" data-action="pickup">
                                <div class="quick-action-icon">
                                    <svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                </div>
                                <div class="quick-action-text">
                                    <span>Schedule Pickup</span>
                                    <small>Book a courier collection</small>
                                </div>
                                <span class="quick-action-arrow">→</span>
                            </div>
                            <div class="quick-action-card" data-action="support">
                                <div class="quick-action-icon">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                                </div>
                                <div class="quick-action-text">
                                    <span>Contact Support</span>
                                    <small>Talk to our team</small>
                                </div>
                                <span class="quick-action-arrow">→</span>
                            </div>
                        </div>
                    </div>

                    <div class="ai-agent-card">
                        <div class="ai-agent-header">
                            <span class="ai-badge">AI AGENT</span>
                            <div class="team-avatars">
                                <div class="team-avatar">J</div>
                                <div class="team-avatar">M</div>
                                <div class="team-avatar">S</div>
                                <div class="team-avatar">+</div>
                            </div>
                        </div>
                        <p style="color: #ccc; font-size: 13px; margin: 0; line-height: 1.5;">
                            Hi! I'm your AI assistant. I can help you track packages, get quotes, and answer shipping questions instantly.
                        </p>
                    </div>

                    <div class="alert-box">
                        <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                        <span>During Chinese New Year, delivery may take 1-3 days longer than usual.</span>
                    </div>

                    <div class="chat-section">
                        <div class="chat-section-title">Popular Topics</div>
                        <div class="faq-list">
                            <div class="faq-item" data-faq="rates">
                                <div class="faq-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                                    <span>Shipping Rates & Fees</span>
                                </div>
                                <span class="faq-item-arrow">→</span>
                            </div>
                            <div class="faq-item" data-faq="customs">
                                <div class="faq-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                    <span>Customs & Duties</span>
                                </div>
                                <span class="faq-item-arrow">→</span>
                            </div>
                            <div class="faq-item" data-faq="delays">
                                <div class="faq-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                    <span>Delivery Delays</span>
                                </div>
                                <span class="faq-item-arrow">→</span>
                            </div>
                            <div class="faq-item" data-faq="returns">
                                <div class="faq-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/></svg>
                                    <span>Return & Refund Policy</span>
                                </div>
                                <span class="faq-item-arrow">→</span>
                            </div>
                        </div>
                    </div>

                    <div class="chat-section">
                        <div style="text-align: center; margin-top: 16px;">
                            <button id="create-ticket-btn" style="background: #CD2727; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%;">
                                Create a Ticket
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Messages Tab Content -->
                <div class="chat-tab-content" id="chat-messages-tab" style="display: none;">
                    <div style="text-align: center; padding: 40px 20px; color: #666;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="#444"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                        <p style="margin-top: 16px; font-size: 14px;">No messages yet</p>
                        <p style="font-size: 12px; color: #555;">Start a conversation with our AI assistant</p>
                    </div>
                </div>

                <!-- Help Tab Content -->
                <div class="chat-tab-content" id="chat-help-tab" style="display: none;">
                    <div class="chat-section">
                        <div class="chat-section-title">Contact Options</div>
                        <div style="padding: 16px; background: #252525; border-radius: 10px;">
                            <div style="margin-bottom: 12px;">
                                <span style="color: #888; font-size: 12px;">Phone</span>
                                <p style="color: white; margin: 4px 0;">+65 6743 9200</p>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <span style="color: #888; font-size: 12px;">Email</span>
                                <p style="color: white; margin: 4px 0;">support@airpak-express.com</p>
                            </div>
                            <div>
                                <span style="color: #888; font-size: 12px;">Business Hours</span>
                                <p style="color: white; margin: 4px 0;">Mon-Fri: 9AM-6PM SGT</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="airpak-chat-nav">
                <div class="nav-item active" data-tab="home">
                    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    <span>Home</span>
                </div>
                <div class="nav-item" data-tab="messages">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                    <span>Messages</span>
                </div>
                <div class="nav-item" data-tab="help">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    <span>Help</span>
                </div>
            </div>
            <div id="airpak-chat-input-area">
                <div class="chat-input-wrapper">
                    <input type="text" id="airpak-chat-input" placeholder="Type your message...">
                    <button id="airpak-chat-send">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .chat-tab-content { display: none; }
        .chat-tab-content.active { display: block; }
    `;
    document.head.appendChild(styleEl);

    // Create and append widget
    const widget = document.createElement('div');
    widget.id = 'airpak-chat-widget';
    widget.innerHTML = widgetHTML;
    document.body.appendChild(widget);

    // Initialize state
    let isOpen = false;
    let currentTab = 'home';

    // Elements
    const toggle = document.getElementById('airpak-chat-toggle');
    const window = document.getElementById('airpak-chat-window');
    const closeBtn = document.getElementById('airpak-chat-close');
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.chat-tab-content');
    const searchInput = document.getElementById('chat-search-input');
    const chatInput = document.getElementById('airpak-chat-input');
    const sendBtn = document.getElementById('airpak-chat-send');
    const quickActions = document.querySelectorAll('.quick-action-card');
    const faqItems = document.querySelectorAll('.faq-item');
    const createTicketBtn = document.getElementById('create-ticket-btn');

    // Toggle window
    toggle.addEventListener('click', function() {
        isOpen = !isOpen;
        window.style.display = isOpen ? 'flex' : 'none';
    });

    // Close button
    closeBtn.addEventListener('click', function() {
        isOpen = false;
        window.style.display = 'none';
    });

    // Tab navigation
    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            currentTab = tab;

            // Update active state
            navItems.forEach(function(n) { n.classList.remove('active'); });
            this.classList.add('active');

            // Show corresponding content
            tabContents.forEach(function(content) {
                content.style.display = 'none';
            });
            document.getElementById('chat-' + tab + '-tab').style.display = 'block';

            // Show input area only when in messages tab
            const inputArea = document.getElementById('airpak-chat-input-area');
            inputArea.style.display = tab === 'messages' ? 'block' : 'none';
        });
    });

    // Search functionality
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim().toLowerCase();
            if (query) {
                // Simulate search and switch to messages
                document.querySelector('[data-tab="messages"]').click();
                chatInput.value = query;
                chatInput.focus();
            }
        }
    });

    // Quick action cards
    quickActions.forEach(function(card) {
        card.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'track':
                    document.querySelector('[data-tab="messages"]').click();
                    chatInput.value = 'I want to track my shipment';
                    break;
                case 'quote':
                    document.querySelector('[data-tab="messages"]').click();
                    chatInput.value = 'I need a shipping quote';
                    break;
                case 'pickup':
                    document.querySelector('[data-tab="messages"]').click();
                    chatInput.value = 'I want to schedule a pickup';
                    break;
                case 'support':
                    document.querySelector('[data-tab="messages"]').click();
                    chatInput.value = 'I need help with';
                    chatInput.focus();
                    break;
            }
        });
    });

    // FAQ items
    faqItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const faq = this.getAttribute('data-faq');
            document.querySelector('[data-tab="messages"]').click();
            const faqResponses = {
                'rates': 'Our shipping rates vary by destination, weight, and dimensions. Visit our rate calculator or type "rates" for details.',
                'customs': 'All international shipments may be subject to customs duties. These fees are the responsibility of the recipient.',
                'delays': 'During peak seasons, deliveries may take 1-3 days longer. Track your package for real-time updates.',
                'returns': 'We offer a 14-day return policy for unused items. Contact support to initiate a return.'
            };
            chatInput.value = faqResponses[faq] || 'Please contact our support team for more information.';
        });
    });

    // Create ticket button
    createTicketBtn.addEventListener('click', function() {
        document.querySelector('[data-tab="messages"]').click();
        chatInput.value = 'I want to create a support ticket';
        chatInput.focus();
    });

    // Send message
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        const messagesTab = document.getElementById('chat-messages-tab');
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-message user';
        userBubble.innerHTML = '<div class="bubble">' + message + '</div>';
        messagesTab.appendChild(userBubble);

        chatInput.value = '';

        // === AirPak AI Swarm ============================================
        // Routes through the AI orchestrator first (skills: tracking,
        // rates, faq, intake, escalate). Admin replies still arrive via
        // the AirpakBridge poll loop — both work together. If the AI
        // escalates, the message is also persisted for a human to pick up.
        AirpakAI.send(message, {
            ticketId: (window.AirpakBridge && AirpakBridge.getSession().ticketId) || null
        }).then(function(res) {
            appendBot(res.reply || 'Thanks — a team member will be with you shortly.');
            // The AI may also persist the conversation to Supabase; tell
            // the bridge so future polls find the ticket.
            if (res.ticketId && window.AirpakBridge) {
                AirpakBridge.setSession({ ticketId: res.ticketId });
            }
            // Optional: respect skill actions (e.g. open_url)
            if (res.action && res.action.type === 'open_url' && res.action.url) {
                setTimeout(function() { window.open(res.action.url, '_blank'); }, 600);
            }
        }).catch(function(err) {
            console.error('[AirpakAI] failed, falling back to bridge', err);
            // Last resort: plain bridge send (existing admin-reply flow)
            if (window.AirpakBridge) {
                AirpakBridge.send(message).then(appendBot).catch(function() {
                    appendBot('We couldn\'t reach support just now. Please try again or email support@airpak-express.site.');
                });
            }
        });
        // =================================================================
    }

    function appendBot(text) {
        const messagesTab = document.getElementById('chat-messages-tab');
        const botBubble = document.createElement('div');
        botBubble.className = 'chat-message bot';
        botBubble.innerHTML = '<div class="bubble">' + text + '</div>';
        messagesTab.appendChild(botBubble);
        messagesTab.scrollTop = messagesTab.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    // Close on outside click (only for toggle button area)
    document.addEventListener('click', function(e) {
        if (isOpen && !window.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
            isOpen = false;
            window.style.display = 'none';
        }
    });

})();