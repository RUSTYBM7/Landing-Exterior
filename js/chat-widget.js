/**
 * Airpak Express - Advanced AI Chat Widget
 * Dark Mode AI Agent Style with Home, Messages, Help tabs
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        supabaseUrl: 'https://zygoqqsgzhgpvlpttfbk.supabase.co',
        supabaseKey: 'sb_publishable_k2V-N9ZdtgkSeZSt_KfZkQ_OLTKJJ46',
        companyName: 'Airpak Express',
        welcomeMessage: 'Welcome to Airpak Express! How can I help you today?',
        accentColor: '#CD2727'
    };

    // Session ID for visitor tracking
    let sessionId = localStorage.getItem('airpak_chat_session') || generateSessionId();
    localStorage.setItem('airpak_chat_session', sessionId);

    let isOpen = false;
    let currentTab = 'home';
    let conversationId = null;

    // Create Supabase client
    let supabase = null;
    if (window.supabase) {
        supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    }

    // Generate unique session ID
    function generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Create widget HTML - matches the screenshot style exactly
    function createWidget() {
        const widgetHTML = `
        <div id="airpak-chat-widget">
            <!-- Toggle Button -->
            <button id="airpak-chat-toggle" onclick="toggleAirpakChat()">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
            </button>

            <!-- Chat Window - Wide Dark Mode AI Agent Style -->
            <div id="airpak-chat-window">
                <!-- Header -->
                <div id="airpak-chat-header">
                    <div class="chat-header-top">
                        <div class="chat-avatar">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                        </div>
                        <div class="chat-status">
                            <h3>` + CONFIG.companyName + ` AI</h3>
                            <div class="avail-indicator">
                                <span class="avail-dot"></span>
                                <span>Online now</span>
                            </div>
                        </div>
                    </div>
                    <!-- Search Bar -->
                    <div class="chat-search">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" placeholder="Search or ask anything..." id="airpak-search-input" />
                    </div>
                </div>

                <!-- Content Area -->
                <div id="airpak-chat-content">
                    <!-- HOME TAB CONTENT -->
                    <div id="tab-home" class="tab-content">
                        <!-- Alert Box -->
                        <div class="alert-box">
                            <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                            <span>Track your shipment or get instant quotes now!</span>
                        </div>

                        <!-- Quick Actions -->
                        <div class="section-header">Quick Actions</div>
                        <div class="quick-actions">
                            <div class="quick-action-card" onclick="window.open('https://tracking.airpak-express.com', '_blank')">
                                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                                <span>Track</span>
                            </div>
                            <div class="quick-action-card" onclick="window.open('https://shipnow.airpak-express.com', '_blank')">
                                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                                <span>Get Quote</span>
                            </div>
                            <div class="quick-action-card" onclick="window.open('https://shipnow.airpak-express.site', '_blank')">
                                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                <span>ShipNow</span>
                            </div>
                            <div class="quick-action-card" onclick="switchTab('help')">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                                <span>Help</span>
                            </div>
                        </div>

                        <!-- Services Menu -->
                        <div class="section-header">Services</div>
                        <div class="menu-list">
                            <div class="menu-item" onclick="window.open('/services.html', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                    <span>International Courier</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                            <div class="menu-item" onclick="window.open('/services.html#freight', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M18 18.5v.5h-2v-.5h2zm-4 0v.5h-2v-.5h2zm-4 0v.5h-2v-.5h2zm-4 0v.5h-2v-.5h2zm0-4v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm-8 0v.5H4v-.5h2zm4 0v.5h-2v-.5h2zm8 0v.5h-2v-.5h2zm-12-4v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm-4-4v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm4 0v.5h-2v-.5h2zm-4-4v.5h-2v-.5h2zm4 0v.5h-2v-.5h2z"/></svg>
                                    <span>Air & Sea Freight</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                            <div class="menu-item" onclick="window.open('/services.html#warehousing', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 3h2v2h-2V6zm0 3h2v2h-2V9zM8 6h2v2H8V6zm0 3h2v2H8V9zm-1 2H5V9h2v2zm0-3H5V6h2v2zm9 7H8v-2h8v2zm0-4h-2V9h2v2zm0-3h-2V6h2v2zm3 3h-2V9h2v2zm0-3h-2V6h2v2z"/></svg>
                                    <span>Warehousing</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                            <div class="menu-item" onclick="window.open('/contact.html', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                    <span>Contact Us</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                        </div>

                        <!-- Enterprise Tools Section -->
                        <div class="section-header">Enterprise Tools</div>
                        <div class="menu-list">
                            <div class="menu-item" onclick="window.open('https://shipnow.airpak-express.site', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                    <span>GETOnline Portal</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                            <div class="menu-item" onclick="window.open('https://admin.airpak-express.site', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm0-4H4V1h2v2zm10 12H9v-2h7v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm0-4h-2V1h2v2z"/></svg>
                                    <span>Admin Dashboard</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                            <div class="menu-item" onclick="window.open('https://tracking.airpak-express.com', '_blank')">
                                <div class="menu-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                    <span>Live Tracking</span>
                                </div>
                                <span class="menu-item-arrow">→</span>
                            </div>
                        </div>
                    </div>

                    <!-- MESSAGES TAB CONTENT -->
                    <div id="tab-messages" class="tab-content" style="display:none;">
                        <div class="messages-list" id="airpak-messages-list">
                            <!-- Messages will be loaded here -->
                        </div>
                        <div class="chat-messages-area" id="airpak-chat-messages" style="display:none;">
                            <!-- Chat interface -->
                        </div>
                    </div>

                    <!-- HELP TAB CONTENT -->
                    <div id="tab-help" class="tab-content" style="display:none;">
                        <div class="section-header">Frequently Asked Questions</div>
                        <div class="faq-list">
                            <div class="faq-item">
                                <div class="faq-question" onclick="toggleFaq(this.parentElement)">
                                    <span>How do I track my shipment?</span>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                                </div>
                                <div class="faq-answer">Visit our tracking page at <a href="https://tracking.airpak-express.com" style="color:#ff6b6b;">tracking.airpak-express.com</a> and enter your tracking number for real-time updates.</div>
                            </div>
                            <div class="faq-item">
                                <div class="faq-question" onclick="toggleFaq(this.parentElement)">
                                    <span>What are your delivery times?</span>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                                </div>
                                <div class="faq-answer">Express delivery: 2-5 business days. Standard delivery: 7-14 business days. Times vary by destination and service type.</div>
                            </div>
                            <div class="faq-item">
                                <div class="faq-question" onclick="toggleFaq(this.parentElement)">
                                    <span>How much does shipping cost?</span>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                                </div>
                                <div class="faq-answer">Rates depend on origin, destination, weight, and dimensions. Get instant quotes at <a href="https://shipnow.airpak-express.com" style="color:#ff6b6b;">shipnow.airpak-express.com</a></div>
                            </div>
                            <div class="faq-item">
                                <div class="faq-question" onclick="toggleFaq(this.parentElement)">
                                    <span>Do you offer door-to-door pickup?</span>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                                </div>
                                <div class="faq-answer">Yes! We offer convenient door-to-door pickup service. Schedule through your account or contact us to arrange pickup.</div>
                            </div>
                            <div class="faq-item">
                                <div class="faq-question" onclick="toggleFaq(this.parentElement)">
                                    <span>What items are prohibited?</span>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                                </div>
                                <div class="faq-answer">Prohibited items vary by country. Generally include: flammable items, explosives, weapons, and illegal goods. Contact us for specific regulations.</div>
                            </div>
                        </div>

                        <div class="section-header">Contact Options</div>
                        <div class="help-list">
                            <div class="help-item">
                                <div class="help-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                    <span>+65 6743 9200</span>
                                </div>
                            </div>
                            <div class="help-item">
                                <div class="help-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                    <span>support@airpak-express.com</span>
                                </div>
                            </div>
                            <div class="help-item">
                                <div class="help-item-left">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                    <span>Mon-Fri: 9AM-6PM SGT</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chat Input Area (shown when in chat mode) -->
                <div id="airpak-chat-input-area" style="display:none;">
                    <div class="chat-input-wrapper">
                        <input type="text" id="airpak-chat-input" placeholder="Type a message..." />
                        <button id="airpak-chat-send" onclick="sendAirpakMessage()">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Bottom Navigation -->
                <div id="airpak-chat-nav">
                    <div class="nav-item active" id="nav-home" onclick="switchTab('home')">
                        <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        <span>Home</span>
                    </div>
                    <div class="nav-item" id="nav-messages" onclick="switchTab('messages')">
                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                        <span>Messages</span>
                    </div>
                    <div class="nav-item" id="nav-help" onclick="switchTab('help')">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                        <span>Help</span>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Toggle chat window
            function toggleAirpakChat() {
                const window = document.getElementById('airpak-chat-window');
                const toggle = document.getElementById('airpak-chat-toggle');

                if (window.style.display === 'flex') {
                    window.style.display = 'none';
                    toggle.style.transform = 'scale(1)';
                } else {
                    window.style.display = 'flex';
                    toggle.style.transform = 'scale(1.1) rotate(90deg)';
                }
            }

            // Switch tabs
            function switchTab(tab) {
                // Update nav items
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.getElementById('nav-' + tab).classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
                document.getElementById('tab-' + tab).style.display = 'block';

                // Show/hide input area
                const inputArea = document.getElementById('airpak-chat-input-area');
                if (tab === 'messages') {
                    inputArea.style.display = 'block';
                } else {
                    inputArea.style.display = 'none';
                }

                currentTab = tab;
            }

            // Toggle FAQ expand/collapse
            function toggleFaq(element) {
                element.classList.toggle('open');
            }

            // Send message
            function sendAirpakMessage() {
                const input = document.getElementById('airpak-chat-input');
                const message = input.value.trim();

                if (!message) return;

                // Add user message to chat
                addMessageToUI('user', message);
                input.value = '';

                // Show typing indicator
                showTypingIndicator();

                // Process message with AI response
                setTimeout(function() {
                    hideTypingIndicator();
                    const response = getAIResponse(message);
                    addMessageToUI('bot', response);
                }, 1500);
            }

            // Add message to UI
            function addMessageToUI(type, content) {
                const messagesArea = document.getElementById('airpak-chat-messages');
                messagesArea.style.display = 'flex';

                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message ' + type;

                if (type === 'user') {
                    messageDiv.innerHTML = '<div class="bubble">' + content + '</div>';
                } else {
                    messageDiv.innerHTML = '<div class="bubble">' + content.replace(/\\n/g, '<br>') + '</div>';
                }

                messagesArea.appendChild(messageDiv);
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }

            // Show typing indicator
            function showTypingIndicator() {
                const messagesArea = document.getElementById('airpak-chat-messages');
                messagesArea.style.display = 'flex';

                const indicator = document.createElement('div');
                indicator.className = 'chat-message bot';
                indicator.id = 'typing-indicator';
                indicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

                messagesArea.appendChild(indicator);
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }

            // Hide typing indicator
            function hideTypingIndicator() {
                const indicator = document.getElementById('typing-indicator');
                if (indicator) indicator.remove();
            }

            // Get AI response
            function getAIResponse(message) {
                const lower = message.toLowerCase();

                if (/\\b(hi|hello|hey|help)\\b/.test(lower)) {
                    return "Hello! I'm your Airpak Express AI assistant. I can help you with:\n\n• Tracking shipments\n• Getting shipping quotes\n• Service information\n• Contact details\n\nWhat would you like to know?";
                }

                if (/\\b(track|tracking|where is|status)\\b/.test(lower)) {
                    return "To track your shipment, please visit:\n\nhttps://tracking.airpak-express.com\n\nEnter your tracking number for real-time updates on your delivery status.";
                }

                if (/\\b(price|quote|cost|rate)\\b/.test(lower)) {
                    return "For instant shipping quotes, visit:\n\nhttps://shipnow.airpak-express.com\n\nEnter your origin, destination, weight, and dimensions for accurate pricing.";
                }

                if (/\\b(contact|phone|email|call)\\b/.test(lower)) {
                    return "You can reach us through:\n\n📞 Phone: +65 6743 9200\n📧 Email: support@airpak-express.com\n🌐 Web: www.airpak-express.com";
                }

                return "Thanks for your message! For immediate assistance, you can:\n\n• Visit https://shipnow.airpak-express.com\n• Call +65 6743 9200\n• Email support@airpak-express.com\n\nOur team is ready to help!";
            }

            // Enter key handler
            document.addEventListener('DOMContentLoaded', function() {
                const input = document.getElementById('airpak-chat-input');
                if (input) {
                    input.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendAirpakMessage();
                        }
                    });
                }

                // Search input handler
                const searchInput = document.getElementById('airpak-search-input');
                if (searchInput) {
                    searchInput.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            const query = this.value.trim();
                            if (query) {
                                switchTab('messages');
                                document.getElementById('airpak-chat-input').value = query;
                                sendAirpakMessage();
                                this.value = '';
                            }
                        }
                    });
                }
            });

            window.toggleAirpakChat = toggleAirpakChat;
            window.switchTab = switchTab;
            window.toggleFaq = toggleFaq;
            window.sendAirpakMessage = sendAirpakMessage;
        </script>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    // Initialize widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();