// --- DEBUG: Confirm script execution start ---
console.log("EliFin AI: Frontend Script Start."); 

// Set this to true temporarily during development to force popups to show every time.
// REMEMBER TO SET THIS TO `false` BEFORE PRODUCTION DEPLOYMENT.
const CBFA_DEBUG_FORCE_CLEAR_HISTORY = false; // Set to false to adhere to POPUP_TRIGGER logic

// Ensure jQuery is available, as WordPress enqueues it by default.
jQuery(document).ready(function($) {
    // Inject Tailwind CSS CDN link dynamically. This is essential for the widget to be styled correctly.
    if (!$('script[src*="cdn.tailwindcss.com"]').length) {
        $('head').append('<script src="https://cdn.tailwindcss.com"></script>');
    }

    // Load Inter font for styling consistency
    if (!$('link[href*="Inter:wght"]').length) {
        $('head').append('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">');
    }

    // Inject custom CSS file link dynamically. (Handled by PHP now, but safe fallback)
    if (!$('link[href*="elifin-ai-frontend.css"]').length) {
        $('head').append('<link rel="stylesheet" href="assets/elifin-ai-frontend.css">');
    }

    // --- Configuration from WordPress PHP (via wp_localize_script) ---\
    const CBFA_DATA = typeof cbfa_data !== 'undefined' ? cbfa_data : {};

    const CBFA_AJAX_URL = CBFA_DATA.ajax_url;
    const CHATBOT_ID = CBFA_DATA.chatbot_id;
    const AGENT_NAME = CBFA_DATA.agent_name || 'EliFin AI Assistant';
    const AGENT_IMAGE_URL = CBFA_DATA.agent_image_url || ''; 
    const DEFAULT_AGENT_IMAGE = CBFA_DATA.default_agent_image; 
    const CBFA_NONCE = CBFA_DATA.nonce;
    const INITIAL_MESSAGES = CBFA_DATA.initial_messages || ["👋 Hello! How can I help?"]; // Array of messages
    const RAW_QUICK_LINKS = CBFA_DATA.quick_links || []; // Raw data array from PHP
    
    // Quick Links Parsing (Defensive Programming)
    let QUICK_LINKS = [];
    if (Array.isArray(RAW_QUICK_LINKS)) {
        QUICK_LINKS = RAW_QUICK_LINKS;
    } else {
        console.error("EliFin AI: Quick Links data failed to parse or is not an array. Check JSON formatting in Admin.");
    }
    
    // Popup Settings (Converted to milliseconds)
    const POPUP_DELAY = (CBFA_DATA.popup_delay * 1000) || 3000; 
    const POPUP_DURATION = (CBFA_DATA.popup_duration * 1000) || 6000; 
    const POPUP_TRIGGER = CBFA_DATA.popup_trigger || 'new_user'; 
    
    // Typing Delay Setting
    const TYPING_DELAY_MS_PER_CHAR = CBFA_DATA.typing_delay_ms_per_char || 25; 
    
    // Button Image Settings
    const BUTTON_IMAGE_URL = CBFA_DATA.button_image_url || '';
    const DEFAULT_BUTTON_IMAGE = CBFA_DATA.default_button_image;

    // Style Settings 
    const PRIMARY_COLOR = CBFA_DATA.primary_color || '#4f46e5';
    const SECONDARY_COLOR = CBFA_DATA.secondary_color || '#6366f1';
    
    const AGENT_NAME_COLOR = CBFA_DATA.agent_name_color || '#ffffff';
    const HEADER_TEXT_COLOR = CBFA_DATA.header_text_color || '#ffffff';

    const AGENT_MESSAGE_COLOR = CBFA_DATA.agent_message_color || '#e5e7eb';
    const USER_MESSAGE_COLOR = CBFA_DATA.user_message_color || '#6366f1';
    
    const AGENT_BUBBLE_TEXT_COLOR = CBFA_DATA.agent_bubble_text_color || '#1f2937';
    const USER_BUBBLE_TEXT_COLOR = CBFA_DATA.user_bubble_text_color || '#ffffff';

    const FONT_FAMILY = CBFA_DATA.font_family || "'Inter', sans-serif";
    const BASE_FONT_SIZE = CBFA_DATA.base_font_size || '14px';


    // Key for session storage
    const HISTORY_KEY = 'chatHistory';
    const POPUP_SHOWN_KEY = 'cbfaPopupShown'; 
    
    // Determine the avatar URL to use in the widget header (custom or default)
    const AVATAR_URL = AGENT_IMAGE_URL || DEFAULT_AGENT_IMAGE;
    
    // Determine the chat button content (custom image or default icon)
    let chatButtonContent;
    let chatButtonClasses;
    
    // Logic to prioritize Button Icon, then fall back to Agent Avatar, then default icon
    const FINAL_BUTTON_IMAGE = BUTTON_IMAGE_URL || AGENT_IMAGE_URL;
    
    // Use Agent Avatar as the button content if the user set a custom image for it, 
    // or if the default button image is used but it's not the default chat icon (i.e., AVATAR_URL is set).
    if (FINAL_BUTTON_IMAGE && FINAL_BUTTON_IMAGE !== DEFAULT_BUTTON_IMAGE) {
        // Custom Image Button or Agent Avatar used for button
        chatButtonContent = `<img src="${FINAL_BUTTON_IMAGE}" class="cbfa-button-image cbfa-fill-image" alt="Chat Icon">`;
        // Relying ONLY on CSS for rounding
        chatButtonClasses = `w-14 h-14 bg-indigo-600 shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl active:scale-95 transform`;
    } else {
        // Default Icon (icon.png)
        chatButtonContent = `
            <img id="chat-icon" class="cbfa-button-image" src="${DEFAULT_BUTTON_IMAGE}" alt="Chat Icon">
            <svg id="close-icon" class="w-6 h-6 hidden text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>`;
        // Relying ONLY on CSS for rounding
        chatButtonClasses = `w-14 h-14 bg-indigo-600 text-white shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-indigo-700 active:scale-95 transform`;
    }


    // --- DEVELOPMENT ONLY: FORCE CLEAR HISTORY ---
    if (CBFA_DEBUG_FORCE_CLEAR_HISTORY) {
        sessionStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem(POPUP_SHOWN_KEY);
        console.warn("EliFin AI: DEVELOPMENT MODE IS ON. Session history and popup status cleared.");
    }

    // --- Dynamic Style Injection (for custom colors/fonts) ---
    function injectCustomStyles() {
        // Calculate a light secondary color for link card background (e.g., secondary with 10% opacity)
        // Since we can't reliably manipulate HEX colors here, we define static light tints 
        // that match the default Indigo scheme, and rely on the CSS file to use them.
        const styleBlock = `
            #chat-widget-container {
                --cbfa-primary: ${PRIMARY_COLOR};
                --cbfa-secondary: ${SECONDARY_COLOR};
                
                --cbfa-agent-name-text: ${AGENT_NAME_COLOR};
                --cbfa-header-text: ${HEADER_TEXT_COLOR};
                
                --cbfa-agent-bubble: ${AGENT_MESSAGE_COLOR};
                --cbfa-user-bubble: ${USER_MESSAGE_COLOR};
                
                --cbfa-agent-bubble-text: ${AGENT_BUBBLE_TEXT_COLOR};
                --cbfa-user-bubble-text: ${USER_BUBBLE_TEXT_COLOR};

                --cbfa-font-family: ${FONT_FAMILY};
                --cbfa-base-font-size: ${BASE_FONT_SIZE};
            }
        `;
        // Check if style block already exists to prevent duplicates on navigation changes
        if (!$('#cbfa-custom-vars').length) {
            $('head').append(`<style id="cbfa-custom-vars">${styleBlock}</style>`);
            console.log("EliFin AI: Injected Custom CSS Variables.");
        }
    }
    
    // Inject styles early
    injectCustomStyles();


    // --- Quick Links HTML Generation (Requirement 3) ---
    function getQuickLinksHtml() {
        if (!QUICK_LINKS || QUICK_LINKS.length === 0) {
            console.log("EliFin AI: Quick links list is empty or invalid (Parsed Count: 0). Check JSON formatting in Admin.");
            return '';
        }
        
        // 1. Filter out invalid links
        const validLinks = QUICK_LINKS.filter(item => item && item.text && item.link);
        
        if (validLinks.length === 0) {
            console.log("EliFin AI: Quick links list contains no valid links.");
            return '';
        }
        
        console.log(`[CBFA] Rendering ${validLinks.length} valid quick links.`); // Confirms data is seen

        // Use document.location.origin as base for relative links
        const baseUrl = window.location.origin;

        const buttons = validLinks.map(item => {

            // Prepend base URL if link is relative
            const finalLink = item.link && item.link.startsWith('/') ? baseUrl + item.link : item.link;
            
            return `
                <a href="${finalLink}" target="_self" class="cbfa-quick-link-button">
                    ${item.text}
                </a>
            `;
        }).join('');
        
        return `
            <div id="quick-links-wrapper" class="cbfa-quick-links-wrapper">
                <div class="cbfa-quick-links-container">
                    ${buttons}
                </div>
            </div>
        `;
    }

    // --- DOM Elements (Must be generated in the script) ---
    
    // Function to generate and append the entire widget HTML
    function generateWidgetHtml() {
        const quickLinksHtml = getQuickLinksHtml();
        
        let widgetHtml = `
            <!-- The Floating Chat Widget Container -->
            <div id="chat-widget-container" style="position: fixed; bottom: 16px; right: 16px; z-index: 99999;">`;

        // --- 2. Initial Startup Messages (Multiple Popups) ---
        INITIAL_MESSAGES.forEach((message, index) => {
            const chatButtonHeight = 56; 
            const bubbleHeight = 60; 
            const baseOffset = 16 + chatButtonHeight; 

            const bottomOffset = baseOffset + (index * bubbleHeight); 
            const bubbleZIndex = 99998 - index; 
            
            widgetHtml += `
                <!-- Startup Message Bubble ${index + 1} -->
                <div id="startup-message-bubble-${index}"
                     data-index="${index}"
                     class="cbfa-startup-message absolute right-0 w-60 p-3 bg-white text-gray-800 text-sm rounded-lg shadow-lg border border-gray-200 cursor-pointer opacity-0 transition-opacity duration-300 transform translate-y-2 hidden"
                     style="bottom: ${bottomOffset}px; z-index: ${bubbleZIndex};"
                     title="Click to start chat">
                    ${message}
                    <!-- Triangle pointer -->
                    <div class="absolute right-3 bottom-[-6px] w-3 h-3 transform rotate-45 bg-white border-r border-b border-gray-200"></div>
                </div>`;
        });
        
        // --- 1. Floating Chat Bubble/Button ---
        widgetHtml += `
                <button id="chat-toggle-button"
                        class="${chatButtonClasses}">
                    ${chatButtonContent}
                </button>

                <!-- 3. Chat Window (Desktop Size Increased: 437px wide x 550px high) -->
                <div id="chat-window"
                     class="hidden fixed bottom-0 right-0 w-full h-full sm:absolute sm:w-[437px] sm:h-[550px] bg-gray-50 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden">

                    <!-- Header (MATCHING AURA IMAGE DESIGN) -->
                    <div class="chat-header flex items-center justify-between p-4 shadow-md">
                        <div class="flex items-center">
                            
                            <!-- Agent Avatar and Live Indicator -->
                            <div class="relative w-10 h-10 mr-3">
                                <img src="${AVATAR_URL}" 
                                    class="w-full h-full rounded-full object-cover bg-indigo-700 border-2 border-white"
                                    alt="Agent Avatar">
                                <!-- Green Live Indicator -->
                                <span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 cbfa-live-indicator" title="Online"></span>
                            </div>

                            <h3 class="text-lg font-semibold" id="agent-name-display">${AGENT_NAME}</h3>
                        </div>
                        <div class="flex items-center space-x-2">
                            <!-- Restart Button -->
                            <button id="restart-chat-button" title="Restart Chat" class="text-inherit hover:text-red-400 text-xs transition duration-150 p-1 rounded-full">
                                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21.5 2v6h-6"/><path d="M21.5 7c-2.88-3.5-7.38-5-11-3.5-3.62 1.5-6 5.5-5 9s4.5 7.5 8 6"/>
                                </svg>
                            </button>
                            <!-- Close Button (X icon) -->
                            <button id="close-chat-button" class="text-inherit hover:text-gray-300 transition duration-150 p-1 rounded-full">
                                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div id="chat-messages" class="flex-grow p-4 space-y-4 overflow-y-auto bg-white">
                        <!-- Messages will be injected here -->
                    </div>

                    <!-- Input Area -->
                    <div class="p-4 border-t border-gray-200 bg-gray-50 relative"> 
                        
                        <!-- NEW: Quick Action Links -->
                        ${quickLinksHtml}

                        <!-- Emoji Picker Dropdown -->
                        <div id="emoji-picker" class="absolute bottom-full mb-2 right-4 w-64 bg-white p-2 rounded-lg shadow-xl grid grid-cols-8 gap-1 hidden border border-gray-200">
                            <!-- Hardcoded Emojis for simplicity -->
                            <span>😀</span><span>😂</span><span>😊</span><span>😎</span><span>😍</span><span>🤔</span><span>👍</span><span>🙏</span>
                            <span>🔥</span><span>🚀</span><span>💡</span><span>🎉</span><span>✅</span><span>❌</span><span>⚠️</span><span>🔗</span>
                        </div>
                        
                        <div class="flex items-center rounded-3xl bg-white border border-gray-300 px-3 py-2 shadow-sm">
                            <!-- Emoji Button -->
                            <button id="emoji-button" title="Insert Emoji"
                                    class="text-gray-500 hover:text-indigo-500 transition duration-150 active:scale-95 transform mr-1 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>

                            <input type="text" id="chat-input" placeholder="Message..."
                                   class="flex-grow p-1 mr-2 bg-transparent border-none text-gray-800 focus:outline-none focus:ring-0 transition duration-150 placeholder-gray-500">
                            
                            <!-- Send button -->
                            <button id="send-button"
                                    class="text-indigo-600 hover:text-indigo-700 transition duration-150 active:scale-95 transform disabled:text-gray-400 p-1">
                                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                        <div id="status-message" class="text-xs text-red-400 mt-1 hidden"></div>
                    </div>
                </div>
            </div>
        `;
        $('body').append(widgetHtml);
    }
    
    // Generate the HTML and get references after DOM is ready
    generateWidgetHtml();

    const chatButton = $('#chat-toggle-button');
    const chatWindow = $('#chat-window');
    const chatIcon = $('#chat-icon');
    const closeIcon = $('#close-icon');
    // Using class selector to target all generated bubbles
    const startupBubbles = $('.cbfa-startup-message'); 
    const chatMessages = $('#chat-messages');
    const chatInput = $('#chat-input');
    const sendButton = $('#send-button');
    const statusMessage = $('#status-message');
    const emojiPicker = $('#emoji-picker');
    const emojiButton = $('#emoji-button');
    const restartButton = $('#restart-chat-button'); 

    // Store original viewport content
    let originalViewportContent = '';
    const viewportMeta = $('meta[name="viewport"]');
    if (viewportMeta.length) {
        originalViewportContent = viewportMeta.attr('content');
    } else {
        // If meta tag doesn't exist, use default standard
        originalViewportContent = 'width=device-width, initial-scale=1.0';
    }


    // --- State Management ---
    let conversationHistory = []; // Stores the message objects for context
    let isChatOpen = false;
    let isAwaitingResponse = false;
    let tempMessageId = 0;
    
    // Error retry counter
    let errorRetryCount = 0;
    const MAX_ERROR_RETRIES = 2; // Retry silently up to 2 times

    // --- History Persistence ---
    function saveHistory() {
        try {
            const simplifiedHistory = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            // Use sessionStorage instead of localStorage to clear history when the session ends
            sessionStorage.setItem(HISTORY_KEY, JSON.stringify(simplifiedHistory));
        } catch (e) {
            console.error("Error saving chat history:", e);
        }
    }

    function loadHistory() {
        // Load from sessionStorage
        const historyJson = sessionStorage.getItem(HISTORY_KEY);
        if (historyJson) {
            try {
                conversationHistory = JSON.parse(historyJson);
                conversationHistory.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
                scrollToBottom();
                return conversationHistory.length > 0;
            } catch (e) {
                console.error("Failed to load conversation history:", e);
                conversationHistory = [];
            }
        }
        return false;
    }

    // --- Mobile Zoom Protection ---
    function toggleMobileZoomProtection(enable) {
        if (window.innerWidth >= 640) return; // Only apply on small screens (mobile)

        let metaTag = $('meta[name="viewport"]');
        if (metaTag.length === 0) {
            // Create the meta tag if it doesn't exist
            metaTag = $('<meta>').attr('name', 'viewport').appendTo('head');
        }

        if (enable) {
            // Prevent zooming when chat is open (critical for fixed full-screen modal)
            metaTag.attr('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
            $('body').css('overflow', 'hidden'); // Prevent background scrolling
        } else {
            // Restore original viewport settings
            metaTag.attr('content', originalViewportContent);
            $('body').css('overflow', ''); // Restore background scrolling
        }
    }


    // --- Link Styling Utility (Same-Tab Links & Link Cards) ---
    // Matches URLs with or without surrounding text
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    function styleLinks(content) {
        // 1. Simple Markdown replacement for **bold** and *italic*
        let styledContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 2. Link Card replacement
        styledContent = styledContent.replace(urlRegex, (url) => {
            // Try to extract a clean title for display, default to the URL
            let displayUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
            let linkText = displayUrl.length > 40 ? displayUrl.substring(0, 37) + '...' : displayUrl;

            // Generate the link card HTML (target="_self" ensures same tab)
            return `
                <div class="cbfa-link-card-container">
                    <a href="${url}" target="_self" rel="noopener noreferrer" class="cbfa-link-card">
                        <!-- Link Icon (Using a simple Unicode char or SVG/Font Icon) -->
                        <span class="cbfa-link-card-icon">🔗</span>
                        <span class="cbfa-link-card-text" title="${url}">${linkText}</span>
                    </a>
                </div>`;
        });
        
        return styledContent;
    }


    // --- Utility Functions ---

    function toggleChat() {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            // FIX for Mobile Keyboard & Zoom 
            toggleMobileZoomProtection(true);

            // Set to full screen on mobile, absolute on desktop
            if (window.innerWidth < 640) {
                chatWindow.removeClass('hidden sm:absolute sm:w-[437px] sm:h-[550px]').addClass('flex fixed top-0 left-0 w-full h-full');
            } else {
                chatWindow.removeClass('hidden fixed top-0 left-0 w-full h-full').addClass('flex sm:absolute sm:w-[437px] sm:h-[550px]');
            }
            
            // Hide ALL startup bubbles when chat opens
            startupBubbles.removeClass('opacity-100').addClass('opacity-0 pointer-events-none transform translate-y-2 hidden'); 
            // Record that the user has opened the chat
            sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');

            // Toggle icons based on button content type
            if (!BUTTON_IMAGE_URL && !AGENT_IMAGE_URL) {
                $('#chat-icon').addClass('hidden');
                $('#close-icon').removeClass('hidden');
            }

            scrollToBottom();
            chatInput.focus();
        } else {
            // FIX for Mobile Keyboard & Zoom 
            toggleMobileZoomProtection(false);

            // Hide and reset classes to default (bottom-right float)
            chatWindow.addClass('hidden').removeClass('flex fixed top-0 left-0 w-full h-full sm:absolute sm:w-[437px] sm:h-[550px]');
            
            if (!BUTTON_IMAGE_URL && !AGENT_IMAGE_URL) {
                $('#chat-icon').removeClass('hidden');
                $('#close-icon').addClass('hidden');
            }
        }
        emojiPicker.addClass('hidden');
    }

    // Handle window resize for responsive chat window
    $(window).on('resize', function() {
        if (isChatOpen) {
            if (window.innerWidth < 640) {
                chatWindow.removeClass('sm:absolute sm:w-[437px] sm:h-[550px]').addClass('fixed top-0 left-0 w-full h-full');
            } else {
                chatWindow.removeClass('fixed top-0 left-0 w-full h-full').addClass('sm:absolute sm:w-[437px] sm:h-[550px]');
            }
        }
        // Re-apply zoom protection on resize, especially if transitioning between mobile/desktop
        toggleMobileZoomProtection(isChatOpen);
    });

    function scrollToBottom() {
        chatMessages.scrollTop(chatMessages.prop("scrollHeight"));
    }
    
    function toggleEmojiPicker(event) {
        event.stopPropagation();
        emojiPicker.toggleClass('hidden');
    }
    
    function insertEmoji(emoji) {
        const input = chatInput[0];
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
        
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        
        emojiPicker.addClass('hidden');
    }

    function addInitialMessagesToChat() {
        // If history is loaded, don't repopulate
        if (conversationHistory.length > 0) return;
        
        // Clear history and UI
        sessionStorage.removeItem(HISTORY_KEY);
        conversationHistory = [];
        chatMessages.empty();
        
        // Add all initial messages as assistant messages
        INITIAL_MESSAGES.forEach(message => {
            addMessage('assistant', message);
            conversationHistory.push({ role: 'assistant', content: message });
        });
        
        saveHistory();
    }

    function restartChat() {
        // Clear conversation history but keep POPUP_SHOWN_KEY
        errorRetryCount = 0; // Reset error counter
        addInitialMessagesToChat(); // Restart now adds the multiple initial messages
        setStatus('Chat restarted. All history cleared.', false);
        setTimeout(() => setStatus(''), 3000);
        scrollToBottom();
        chatInput.focus(); 
    }

    function addMessage(role, content, messageId = null) {
        const messageDiv = $('<div>').addClass('flex');
        let innerContent;
        let bubbleClasses;
        let containerClasses;
        
        // Use Tailwind classes overridden by CSS variables for styling
        if (role === 'user') {
            containerClasses = 'justify-end';
            // User bubble: Customized color via CSS variable, white text handled by CSS
            bubbleClasses = 'bg-indigo-500 text-white text-sm p-3 rounded-xl rounded-br-sm max-w-[85%] shadow text-left';
            innerContent = content;
        } else if (role === 'assistant') {
            containerClasses = 'justify-start';
            // Assistant bubble: Customized color via CSS variable, dark text handled by CSS
            bubbleClasses = 'bg-gray-200 text-gray-900 text-sm p-3 rounded-xl rounded-tl-sm max-w-[85%] shadow text-left';
            
            if (content === 'typing') {
                innerContent = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            } else {
                innerContent = styleLinks(content); // Apply styling immediately
            }
        }
        
        messageDiv.addClass(containerClasses).html(`
            <div id="${messageId || ''}" class="${bubbleClasses}">
                ${innerContent}
            </div>
        `);

        chatMessages.append(messageDiv);
        scrollToBottom();
        return messageId;
    }

    function setStatus(message, isError = false) {
        statusMessage.text(message);
        statusMessage.toggleClass('text-red-400', isError);
        statusMessage.toggleClass('text-green-400', !isError && message);
        statusMessage.toggleClass('hidden', !message);
    }
    
    function showStartupBubbles() {
        // 1. Check Visibility Trigger
        const isPopupShown = sessionStorage.getItem(POPUP_SHOWN_KEY) === 'true';
        
        if (POPUP_TRIGGER === 'new_user' && isPopupShown) {
            console.log("EliFin AI: Popup visibility skipped (New User mode, already shown this session).");
            return;
        }

        // If we reach this point, popups should be shown. Mark as shown now.
        if (POPUP_TRIGGER === 'new_user') {
            sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
        }
        
        // Calculate the time needed for all bubbles to finish staggering in
        const STAGGER_TIME = 500;
        const totalStaggeredShowTime = startupBubbles.length * STAGGER_TIME; 
        
        // 2. Set Initial Delay (from POPUP_DELAY setting)
        setTimeout(() => {
            
            console.log(`EliFin AI: Showing ${startupBubbles.length} bubbles. Delay: ${POPUP_DELAY}ms. Duration: ${POPUP_DURATION}ms.`);
            
            // --- SHOW POPUPS (Staggered) ---
            startupBubbles.each(function(index) {
                const bubble = $(this);
                
                // Staggered show time (500ms between bubbles)
                setTimeout(() => {
                    // Only show if chat is closed 
                    if (!isChatOpen) {
                        bubble.removeClass('hidden'); 

                        void bubble[0].offsetWidth; 
                        
                        bubble.removeClass('opacity-0 translate-y-2 pointer-events-none').addClass('opacity-100');
                    }
                }, index * STAGGER_TIME); 
            });
            
            // --- HIDE POPUPS (After Full Show + Duration) ---
            const hideDelay = totalStaggeredShowTime + POPUP_DURATION;

            setTimeout(() => {
                console.log(`EliFin AI: Hiding bubbles after total duration of ${hideDelay}ms.`);
                // Hide all bubbles simultaneously
                if (!isChatOpen) {
                    startupBubbles.removeClass('opacity-100').addClass('opacity-0 translate-y-2 pointer-events-none hidden');
                }
            }, hideDelay); 

        }, POPUP_DELAY); // Outer delay controlled by POPUP_DELAY setting
    }

    // --- Core API Interaction ---

    function sendMessage(isRetry = false) {
        let userInput = chatInput.val().trim();
        let isFormatErrorRetry = false;

        // If this is a silent retry, override the user input and don't affect UI history 
        if (isRetry) {
             userInput = '?'; // Silent question to try and get a proper response
             isFormatErrorRetry = true;
        }

        if (!userInput || isAwaitingResponse) return;
        
        // 1. Prepare UI and State (only if not a silent retry)
        if (!isFormatErrorRetry) {
            isAwaitingResponse = true;
            chatInput.val('');
            chatInput.prop('disabled', true);
            sendButton.prop('disabled', true);
            emojiPicker.addClass('hidden');

            // 2. Add User Message to UI and History
            addMessage('user', userInput);
            conversationHistory.push({ role: 'user', content: userInput });
            saveHistory();
        } else {
             // For silent retries, just show "Please wait!" in place of the typing indicator
             $('#' + currentMessageId).html('Please wait!');
        }


        // 3. Add Typing Indicator (Placeholder) or Update Placeholder
        const currentMessageId = `msg-${tempMessageId++}`;
        if (!isFormatErrorRetry) {
             addMessage('assistant', 'typing', currentMessageId);
        }
        
        void chatMessages[0].offsetWidth; 

        // 4. Construct API Payload (for WordPress AJAX)
        // Use the current conversationHistory, but exclude the silent '?' if it was just added for retry
        const historyToSend = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        if (isFormatErrorRetry) {
             // If this is a retry, append the '?' but don't save it to session history yet.
             historyToSend.push({ role: 'user', content: userInput });
        }


        const payload = {
            action: 'chatbase_proxy', 
            nonce: CBFA_NONCE,
            messages: JSON.stringify(historyToSend),
        };

        const MAX_RETRIES = 3;
        let retryCount = 0;

        function attemptProxyCall() {
            $.ajax({
                url: CBFA_AJAX_URL,
                type: 'POST',
                data: payload,
                dataType: 'json'
            })
            .done(function(data) {
                handleSuccessfulResponse(data, currentMessageId);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    // Exponential backoff
                    setTimeout(attemptProxyCall, Math.pow(2, retryCount) * 1000); 
                } else {
                    handleFailedResponse(jqXHR, currentMessageId);
                }
            });
        }
        
        function handleSuccessfulResponse(data, messageId) {
            let assistantResponseText = null;
            let errorText = null;
            let isFormatError = false;

            const aiResponseData = data && data.data ? data.data : null;

            if (aiResponseData && (aiResponseData.text || aiResponseData.message || aiResponseData.response || aiResponseData.content)) {
                // Successful response
                assistantResponseText = aiResponseData.text || aiResponseData.message || aiResponseData.response || aiResponseData.content;
                errorRetryCount = 0; // Reset retry counter on success

            } else if (aiResponseData && aiResponseData.error) {
                errorText = `AI Service Error: ${aiResponseData.error}. Check plugin settings.`;
                assistantResponseText = errorText; // Show error from AI service

            } else if (data && data.error) {
                 errorText = `PHP Proxy Error: ${data.error}. Check server logs.`;
                 assistantResponseText = errorText; // Show error from proxy

            } else {
                // Unexpected or empty data format (The key issue)
                isFormatError = true;
            }

            // --- CRITICAL ERROR RETRY LOGIC ---
            if (isFormatError && errorRetryCount < MAX_ERROR_RETRIES) {
                console.warn(`EliFin AI: Format error detected. Retrying silently (${errorRetryCount + 1}/${MAX_ERROR_RETRIES}).`);
                errorRetryCount++;
                // Add silent user message (the '?') to history only now
                conversationHistory.push({ role: 'user', content: '?' });
                saveHistory();
                
                // Immediately retry the message silently
                return sendMessage(true); 
            }
            
            // --- Final Output or Max Retry Failure ---
            
            const botMessageElement = $('#' + messageId);
            
            if (isFormatError && errorRetryCount >= MAX_ERROR_RETRIES) {
                 // Max retries failed, show nice error message
                 assistantResponseText = "I apologize, but I'm having trouble connecting to my brain right now. Please try restarting the chat.";
                 errorText = "Max silent retries failed.";
            }


            if (botMessageElement.length && assistantResponseText) {
                // Style the links BEFORE inserting the HTML
                const finalStyledContent = styleLinks(assistantResponseText); 
                
                // --- HUMANIZED TYPING DELAY ---
                const finalLength = finalStyledContent.replace(/<[^>]*>/g, '').length; // Count characters, ignoring HTML tags
                const delayTime = finalLength * TYPING_DELAY_MS_PER_CHAR;
                
                setTimeout(() => {
                    botMessageElement.html(finalStyledContent).removeAttr('id');
                    
                    conversationHistory.push({ role: 'assistant', content: assistantResponseText });
                    saveHistory();
                    
                    if (errorText) {
                        setStatus(errorText, true);
                    } else {
                        setStatus(''); 
                    }
                    
                    isAwaitingResponse = false;
                    chatInput.prop('disabled', false).focus();
                    sendButton.prop('disabled', false);
                    scrollToBottom();
                }, delayTime);

            } else if (assistantResponseText) {
                // Fallback if messageId element disappeared
                 addMessage('assistant', assistantResponseText);
            }
            
            // If the element is still 'typing' (meaning timeout hasn't completed or error occurred), 
            // ensure state is reset if no final output was generated due to immediate error.
            if (!assistantResponseText || botMessageElement.html().includes('typing-dots')) {
                 // Reset state immediately if this wasn't a timed success
                 isAwaitingResponse = false;
                 chatInput.prop('disabled', false).focus();
                 sendButton.prop('disabled', false);
            }

            // Note: If successfully timed out, reset happens inside setTimeout.
        }

        function handleFailedResponse(jqXHR, messageId) {
            console.error('AJAX Error:', jqXHR.status, jqXHR.responseText);
            const errorMessage = `🤖 Connection Error: Could not reach the AI service after ${MAX_RETRIES} attempts. Status: ${jqXHR.status}.`;
            
            const botMessageElement = $('#' + messageId);
            if (botMessageElement.length) {
                botMessageElement.text(errorMessage)
                    .removeClass('bg-gray-200') // Use primary color for connection error
                    .addClass('bg-red-600 text-white')
                    .removeAttr('id');
            } else {
                addMessage('assistant', errorMessage);
            }
            setStatus('Connection Error', true);

            isAwaitingResponse = false;
            chatInput.prop('disabled', false);
            sendButton.prop('disabled', false);
            scrollToBottom();
            errorRetryCount = 0; // Reset error counter
        }
        
        attemptProxyCall(); // Start the first call
    }

    // --- Initialization and Event Binding ---
    
    // Attach event listeners
    chatButton.on('click', toggleChat);
    restartButton.on('click', restartChat);
    $('#close-chat-button').on('click', toggleChat);
    sendButton.on('click', () => sendMessage(false)); // Ensure the first call is NOT a retry
    chatInput.on('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage(false); // Ensure the first call is NOT a retry
        }
    });
    emojiButton.on('click', toggleEmojiPicker);
    
    // NEW: Attach click event to all startup bubbles to open chat and initialize messages
    startupBubbles.on('click', function() {
        if (!isChatOpen) {
            addInitialMessagesToChat(); // Ensure chat history is populated
            toggleChat(); // Open the chat window
        }
    });

    // Initial load and welcome message
    const isHistoryLoaded = loadHistory();
    console.log("EliFin AI: Initial Messages Localized:", INITIAL_MESSAGES); 
    
    // If history is not loaded, ensure initial messages are added to the chat and popups are shown
    if (!isHistoryLoaded) {
        addInitialMessagesToChat();
        showStartupBubbles();
    }

    // Attach click listeners to all emojis in the picker
    emojiPicker.find('span').each(function() {
        $(this).addClass('cursor-pointer text-xl p-1 rounded-md hover:bg-zinc-600 transition');
        $(this).on('click', function(e) {
            e.stopPropagation();
            insertEmoji($(this).text());
        });
    });

    // Close picker when clicking anywhere else on the document
    $(document).on('click', function(e) {
        if (!emojiPicker.hasClass('hidden') && !emojiButton.is(e.target) && !emojiPicker.has(e.target).length) {
            emojiPicker.addClass('hidden');
        }
    });
});