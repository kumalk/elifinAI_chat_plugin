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
    
    // Popup Settings (Converted to milliseconds)
    const POPUP_DELAY = (CBFA_DATA.popup_delay * 1000) || 3000; 
    const POPUP_DURATION = (CBFA_DATA.popup_duration * 1000) || 6000; 
    const POPUP_TRIGGER = CBFA_DATA.popup_trigger || 'new_user'; 
    
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
    
    // --- FIX: PRIORITIZE CUSTOM BUTTON IMAGE, THEN FALLBACK TO AVATAR IMAGE, THEN DEFAULT PNG ---
    let finalButtonImageUrl;

    if (BUTTON_IMAGE_URL) {
        // 1. User set a specific Button Icon
        finalButtonImageUrl = BUTTON_IMAGE_URL;
    } else if (AGENT_IMAGE_URL) {
        // 2. User requested Agent Avatar on Button (Using AGENT_IMAGE_URL)
        finalButtonImageUrl = AGENT_IMAGE_URL;
    } else {
        // 3. Fallback to default PNG icon
        finalButtonImageUrl = DEFAULT_BUTTON_IMAGE;
    }

    // Determine the class and content based on if we are using an actual image (Avatar or Button Icon)
    // If using the Avatar or Custom Button Icon, we want the image to fill the button completely.
    if (BUTTON_IMAGE_URL || AGENT_IMAGE_URL) {
        // Use Image: Avatar fill requested OR Custom Button Icon provided.
        chatButtonContent = `<img src="${finalButtonImageUrl}" class="cbfa-button-image cbfa-fill-image" alt="Chat Icon">`;
        // Remove bg-indigo-600 because the image fills it, and set text-white for the close button.
        chatButtonClasses = `w-14 h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl active:scale-95 transform overflow-hidden bg-transparent`;
    } else {
        // Use Default PNG icon (which is a chat bubble icon and should be centered on the colored background)
        chatButtonContent = `
            <img id="chat-icon" src="${finalButtonImageUrl}" class="cbfa-button-image w-7 h-7" alt="Chat Icon">
            <svg id="close-icon" class="w-6 h-6 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>`;
        // Keep the colored background for the default icon
        chatButtonClasses = `w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-indigo-700 active:scale-95 transform`;
    }
    
    // If a custom image is used for fill, we need a special class on the image to ensure cover fit
    // This class must be defined in elifin-ai-frontend.css (using Tailwind utilities) but 
    // since we can't edit that file now, we'll use inline styles/classes that Tailwind understands.
    // The existing .cbfa-button-image should handle fill IF we use the overflow-hidden class on the button.
    
    // --- DEVELOPMENT ONLY: FORCE CLEAR HISTORY ---
    if (CBFA_DEBUG_FORCE_CLEAR_HISTORY) {
        sessionStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem(POPUP_SHOWN_KEY);
        console.warn("EliFin AI: DEVELOPMENT MODE IS ON. Session history and popup status cleared.");
    }

    // --- Dynamic Style Injection (for custom colors/fonts) ---
    function injectCustomStyles() {
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


    // --- DOM Elements (Must be generated in the script) ---
    
    // Function to generate and append the entire widget HTML
    function generateWidgetHtml() {
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
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.05 6.7 2.92"/><path d="M17 2.92v4.1H21"/>
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

    // --- State Management ---
    let conversationHistory = []; // Stores the message objects for context
    let isChatOpen = false;
    let isAwaitingResponse = false;
    let tempMessageId = 0;

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

    // --- Link Styling Utility ---
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

    function styleLinks(content) {
        // Simple Markdown replacement for **bold** and *italic*
        let styledContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*\*/g, '<em>$1</em>');
        
        // Link styling (using Tailwind classes overridden by CSS variables)
        styledContent = styledContent.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline font-medium hover:text-indigo-300 transition duration-150" style="color: var(--cbfa-primary);">${url}</a>`;
        });
        
        return styledContent;
    }

    // --- Utility Functions ---

    function toggleChat() {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            // FIX for Mobile Keyboard: For small screens, use top-0 and h-full 
            if (window.innerWidth < 640) {
                chatWindow.removeClass('hidden sm:absolute sm:w-[437px] sm:h-[550px]').addClass('flex fixed top-0 left-0 w-full h-full');
            } else {
                chatWindow.removeClass('hidden fixed top-0 left-0 w-full h-full').addClass('flex sm:absolute sm:w-[437px] sm:h-[550px]');
            }
            // Hide ALL startup bubbles when chat opens
            startupBubbles.removeClass('opacity-100').addClass('opacity-0 pointer-events-none transform translate-y-2 hidden'); 
            // NEW: Record that the user has opened the chat
            sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');

            // Toggle icons based on button content type
            // The default chat icon is now an image, so we just toggle its visibility
            $('#chat-icon').addClass('hidden');
            $('#close-icon').removeClass('hidden');


            scrollToBottom();
            chatInput.focus();
        } else {
            // Hide and reset classes to default (bottom-right float)
            chatWindow.addClass('hidden').removeClass('flex fixed top-0 left-0 w-full h-full sm:absolute sm:w-[437px] sm:h-[550px]');
            
            // The default chat icon is now an image, so we just toggle its visibility
            $('#chat-icon').removeClass('hidden');
            $('#close-icon').addClass('hidden');
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
        // IMPROVEMENT FIX: Do NOT clear POPUP_SHOWN_KEY when restarting chat.

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
        const totalStaggeredShowTime = startupBubbles.length * STAGGERED_TIME; 
        
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

    // --- Core API Interaction (No changes needed, keeping for completeness) ---

    function sendMessage() {
        const userInput = chatInput.val().trim();
        if (!userInput || isAwaitingResponse) return;

        // 1. Prepare UI and State
        isAwaitingResponse = true;
        chatInput.val('');
        chatInput.prop('disabled', true);
        sendButton.prop('disabled', true);
        emojiPicker.addClass('hidden');

        // 2. Add User Message to UI and History
        addMessage('user', userInput);
        conversationHistory.push({ role: 'user', content: userInput });
        saveHistory();

        // 3. Add Typing Indicator (Placeholder)
        const currentMessageId = `msg-${tempMessageId++}`;
        addMessage('assistant', 'typing', currentMessageId);
        
        void chatMessages[0].offsetWidth; 

        // 4. Construct API Payload (for WordPress AJAX)
        const payload = {
            action: 'chatbase_proxy', 
            nonce: CBFA_NONCE,
            messages: JSON.stringify(conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }))),
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
                    setTimeout(attemptProxyCall, Math.pow(2, retryCount) * 1000); 
                } else {
                    handleFailedResponse(jqXHR, currentMessageId);
                }
            });
        }
        
        function handleSuccessfulResponse(data, messageId) {
            let assistantResponseText = 'Received unexpected data format.';
            let errorText = null;

            const aiResponseData = data && data.data ? data.data : null;

            if (aiResponseData) {
                if (aiResponseData.text) {
                    assistantResponseText = aiResponseData.text;
                } else if (aiResponseData.message) {
                    assistantResponseText = aiResponseData.message;
                } else if (aiResponseData.response) { 
                    assistantResponseText = aiResponseData.response;
                } else if (aiResponseData.content) {
                    assistantResponseText = aiResponseData.content;
                }
                
                if (aiResponseData.error) {
                    errorText = `AI Service Error: ${aiResponseData.error}. Check plugin settings.`;
                    assistantResponseText = errorText;
                }

            } else if (data && data.error) {
                 errorText = `PHP Proxy Error: ${data.error}. Check server logs.`;
                 assistantResponseText = errorText;
            } else {
                console.error("Unknown response data structure:", data);
            }


            const botMessageElement = $('#' + messageId);
            
            if (botMessageElement.length) {
                // Style the links BEFORE inserting the HTML
                const finalStyledContent = styleLinks(assistantResponseText); 
                botMessageElement.html(finalStyledContent).removeAttr('id');
            } else {
                addMessage('assistant', assistantResponseText);
            }

            conversationHistory.push({ role: 'assistant', content: assistantResponseText });
            saveHistory();
            
            if (errorText) {
                setStatus(errorText, true);
            } else if (assistantResponseText === 'Received unexpected data format.') {
                 setStatus('Response format error. Check console for details.', true);
            } else {
                setStatus(''); 
            }
            
            isAwaitingResponse = false;
            chatInput.prop('disabled', false);
            sendButton.prop('disabled', false);
            
            setTimeout(() => {
                chatInput.focus();
                scrollToBottom();
            }, 100);
        }

        function handleFailedResponse(jqXHR, messageId) {
            console.error('AJAX Error:', jqXHR.status, jqXHR.responseText);
            const errorMessage = `🤖 Connection Error: Could not reach the AI service after ${MAX_RETRIES} attempts. Status: ${jqXHR.status}.`;
            
            const botMessageElement = $('#' + messageId);
            if (botMessageElement.length) {
                botMessageElement.text(errorMessage)
                    .removeClass('bg-zinc-700')
                    .addClass('bg-red-800')
                    .removeAttr('id');
            } else {
                addMessage('assistant', errorMessage);
            }
            setStatus('Connection Error', true);

            isAwaitingResponse = false;
            chatInput.prop('disabled', false);
            sendButton.prop('disabled', false);
            scrollToBottom();
        }
        
        attemptProxyCall(); // Start the first call
    }

    // --- Initialization and Event Binding ---
    
    // Attach event listeners
    chatButton.on('click', toggleChat);
    restartButton.on('click', restartChat);
    $('#close-chat-button').on('click', toggleChat);
    sendButton.on('click', sendMessage);
    chatInput.on('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
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