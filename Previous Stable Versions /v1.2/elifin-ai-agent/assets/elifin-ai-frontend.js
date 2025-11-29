// --- DEBUG: Confirm script execution start ---
console.log("EliFin AI: Frontend Script Start."); 

// Set this to true temporarily during development to force popups to show every time.
// REMEMBER TO SET THIS TO `false` BEFORE PRODUCTION DEPLOYMENT.
const CBFA_DEBUG_FORCE_CLEAR_HISTORY = true; 

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

    // Inject custom CSS file link dynamically.
    if (!$('link[href*="elifin-ai-frontend.css"]').length) {
        // NOTE: The main PHP file now handles explicit CSS enqueue, but this fallback remains.
        $('head').append('<link rel="stylesheet" href="assets/elifin-ai-frontend.css">');
    }

    // --- Configuration from WordPress PHP (via wp_localize_script) ---
    // Safely check for cbfa_data and provide fallbacks if localization fails entirely
    const CBFA_DATA = typeof cbfa_data !== 'undefined' ? cbfa_data : {};

    const CBFA_AJAX_URL = CBFA_DATA.ajax_url;
    const CHATBOT_ID = CBFA_DATA.chatbot_id;
    const AGENT_NAME = CBFA_DATA.agent_name || 'EliFin AI Assistant';
    const AGENT_IMAGE_URL = CBFA_DATA.agent_image_url || ''; 
    const DEFAULT_AGENT_IMAGE = CBFA_DATA.default_agent_image; 
    const CBFA_NONCE = CBFA_DATA.nonce;
    const INITIAL_MESSAGES = CBFA_DATA.initial_messages || ["👋 Hello! How can I help?"]; // Array of messages
    
    // NEW Popup Settings
    const POPUP_DELAY = (CBFA_DATA.popup_delay * 1000) || 3000; // Time (ms) before showing popups
    const POPUP_DURATION = (CBFA_DATA.popup_duration * 1000) || 6000; // Time (ms) popups stay visible
    const POPUP_TRIGGER = CBFA_DATA.popup_trigger || 'new_user'; // 'new_user' or 'always'

    // Key for session storage (clears history on session end)
    const HISTORY_KEY = 'chatHistory';
    const POPUP_SHOWN_KEY = 'cbfaPopupShown'; // Key to track if popup was shown this session
    
    // Determine the avatar URL to use in the widget header (custom or default)
    const AVATAR_URL = AGENT_IMAGE_URL || DEFAULT_AGENT_IMAGE;
    
    // --- DEVELOPMENT ONLY: FORCE CLEAR HISTORY ---
    if (CBFA_DEBUG_FORCE_CLEAR_HISTORY) {
        sessionStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem(POPUP_SHOWN_KEY);
        console.warn("EliFin AI: DEVELOPMENT MODE IS ON. Session history and popup status cleared.");
    }

    // --- DOM Elements (Must be generated in the script) ---
    
    // Function to generate and append the entire widget HTML
    function generateWidgetHtml() {
        // Base HTML for the chat button and window
        let widgetHtml = `
            <!-- The Floating Chat Widget Container -->
            <div id="chat-widget-container" style="position: fixed; bottom: 16px; right: 16px; z-index: 99999;">`;

        // --- 2. Initial Startup Messages (Multiple Popups) ---
        // Generate a bubble for each initial message
        INITIAL_MESSAGES.forEach((message, index) => {
            // Calculate stacking: 16px base offset + 60px height/margin per bubble + 16px for the chat button (56px)
            const chatButtonHeight = 56; // 14 Tailwind units = 56px
            const bubbleHeight = 60; // Approximate height of one bubble
            const baseOffset = 16 + chatButtonHeight; // Base offset from bottom of screen to top of chat button

            // Calculate the bottom position for the current bubble based on index
            const bottomOffset = baseOffset + (index * bubbleHeight); 
            
            // Set a high Z-Index explicitly to prevent being hidden by other theme elements
            // We use a staggered index to ensure the lower bubble (higher index) is visually below the higher one.
            const bubbleZIndex = 99998 - index; 
            
            // NOTE: The 'hidden' class is critical to prevent the flash of unstyled content (FOUC).
            widgetHtml += `
                <!-- Startup Message Bubble ${index + 1} -->
                <div id="startup-message-bubble-${index}"
                     data-index="${index}"
                     class="cbfa-startup-message absolute right-0 w-60 p-3 bg-white text-gray-800 text-sm rounded-lg shadow-lg border border-gray-200 cursor-pointer opacity-0 transition-opacity duration-300 transform translate-y-2 hover:bg-gray-50 active:scale-[1.01] hidden"
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
                        class="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-indigo-700 active:scale-95 transform">
                    <svg id="chat-icon" class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg id="close-icon" class="w-6 h-6 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- 3. Chat Window (Hidden by default) -->
                <div id="chat-window"
                     class="hidden fixed bottom-0 right-0 w-full h-full sm:absolute sm:w-[350px] sm:h-[500px] bg-zinc-900 rounded-lg shadow-2xl flex flex-col transition-all duration-300 overflow-hidden">

                    <!-- Header (INCLUDES AVATAR) -->
                    <div class="flex items-center justify-between p-3 bg-zinc-800 text-white shadow-md">
                        <div class="flex items-center">
                            
                            <!-- Agent Avatar and Live Indicator -->
                            <div class="relative w-8 h-8 mr-3">
                                <img src="${AVATAR_URL}" 
                                    class="w-full h-full rounded-full object-cover bg-zinc-700"
                                    alt="Agent Avatar">
                                <!-- Green Live Indicator -->
                                <span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 cbfa-live-indicator" title="Online"></span>
                            </div>

                            <h3 class="font-semibold" id="agent-name-display">${AGENT_NAME}</h3>
                        </div>
                        <div class="flex items-center space-x-2">
                            <!-- Restart Button -->
                            <button id="restart-chat-button" title="Restart Chat" class="text-zinc-400 hover:text-red-400 transition duration-150">
                                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.05 6.7 2.92"/><path d="M17 2.92v4.1H21"/>
                                </svg>
                            </button>
                            <!-- Close Button -->
                            <button id="close-chat-button" class="text-zinc-400 hover:text-white transition duration-150">
                                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div id="chat-messages" class="flex-grow p-4 space-y-4 overflow-y-auto">
                        <!-- Messages will be injected here -->
                    </div>

                    <!-- Input Area -->
                    <div class="p-4 border-t border-zinc-800 bg-zinc-900 relative"> 
                        
                        <!-- Emoji Picker Dropdown -->
                        <div id="emoji-picker" class="absolute bottom-full mb-2 right-4 w-64 bg-zinc-700 p-2 rounded-lg shadow-xl grid grid-cols-8 gap-1 hidden">
                            <!-- Hardcoded Emojis for simplicity -->
                            <span>😀</span><span>😂</span><span>😊</span><span>😎</span><span>😍</span><span>🤔</span><span>👍</span><span>🙏</span>
                            <span>🔥</span><span>🚀</span><span>💡</span><span>🎉</span><span>✅</span><span>❌</span><span>⚠️</span><span>🔗</span>
                        </div>
                        
                        <div class="flex items-center">
                            <!-- Emoji Button -->
                            <button id="emoji-button" title="Insert Emoji"
                                    class="p-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition duration-150 mr-2 active:scale-95 transform">
                                😀
                            </button>

                            <input type="text" id="chat-input" placeholder="Type your message..."
                                   class="flex-grow p-3 mr-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-indigo-500 transition duration-150">
                            <button id="send-button"
                                    class="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 active:scale-95 transform disabled:bg-indigo-400">
                                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Link styling
        styledContent = styledContent.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline font-medium hover:text-indigo-300 transition duration-150">${url}</a>`;
        });
        
        return styledContent;
    }

    // --- Utility Functions ---

    function toggleChat() {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            // FIX for Mobile Keyboard: For small screens, use top-0 and h-full 
            if (window.innerWidth < 640) {
                // Remove sm:* classes and apply full-screen fixed positioning
                chatWindow.removeClass('hidden sm:absolute sm:w-[350px] sm:h-[500px]').addClass('flex fixed top-0 left-0 w-full h-full');
            } else {
                // Apply desktop floating window classes
                chatWindow.removeClass('hidden fixed top-0 left-0 w-full h-full').addClass('flex sm:absolute sm:w-[350px] sm:h-[500px]');
            }
            // Hide ALL startup bubbles when chat opens
            startupBubbles.removeClass('opacity-100').addClass('opacity-0 pointer-events-none transform translate-y-2 hidden'); // Added 'hidden' for robustness
            // NEW: Record that the user has opened the chat
            sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');

            chatIcon.addClass('hidden');
            closeIcon.removeClass('hidden');
            scrollToBottom();
            chatInput.focus();
        } else {
            // Hide and reset classes to default (bottom-right float)
            chatWindow.addClass('hidden').removeClass('flex fixed top-0 left-0 w-full h-full sm:absolute sm:w-[350px] sm:h-[500px]');
            chatIcon.removeClass('hidden');
            closeIcon.addClass('hidden');
        }
        emojiPicker.addClass('hidden');
    }

    // Handle window resize for responsive chat window
    $(window).on('resize', function() {
        if (isChatOpen) {
            if (window.innerWidth < 640) {
                // Ensure fullscreen on small screens during resize
                chatWindow.removeClass('sm:absolute sm:w-[350px] sm:h-[500px]').addClass('fixed top-0 left-0 w-full h-full');
            } else {
                // Ensure floating window on large screens during resize
                chatWindow.removeClass('fixed top-0 left-0 w-full h-full').addClass('sm:absolute sm:w-[350px] sm:h-[500px]');
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
        // Clear session tracking when restarting chat
        sessionStorage.removeItem(POPUP_SHOWN_KEY); 

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

        if (role === 'user') {
            containerClasses = 'justify-end';
            bubbleClasses = 'bg-indigo-600 text-white text-sm p-3 rounded-xl rounded-br-sm max-w-[85%] shadow text-left';
            innerContent = content;
        } else if (role === 'assistant') {
            containerClasses = 'justify-start';
            bubbleClasses = 'bg-zinc-700 text-white text-sm p-3 rounded-xl rounded-tl-sm max-w-[85%] shadow text-left';
            
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
        
        // FIX: The check for conversationHistory.length was removed here because
        // it was running immediately after history was populated by addInitialMessagesToChat,
        // causing a false positive for "History already loaded."
        
        if (POPUP_TRIGGER === 'new_user' && isPopupShown) {
            console.log("EliFin AI: Popup visibility skipped (New User mode, already shown this session).");
            return;
        }

        // If we reach this point, popups should be shown. Mark as shown now.
        if (POPUP_TRIGGER === 'new_user') {
            sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
        }
        
        // Calculate the time needed for all bubbles to finish staggering in
        // Each bubble takes 300ms transition time + 500ms stagger time
        const STAGGER_TIME = 500;
        const totalStaggeredShowTime = startupBubbles.length * STAGGER_TIME; 
        
        // 2. Set Initial Delay (from POPUP_DELAY setting)
        // Wait for the user-defined delay before starting the show animation
        setTimeout(() => {
            
            console.log(`EliFin AI: Showing ${startupBubbles.length} bubbles. Delay: ${POPUP_DELAY}ms. Duration: ${POPUP_DURATION}ms.`);
            
            // --- SHOW POPUPS (Staggered) ---
            startupBubbles.each(function(index) {
                const bubble = $(this);
                
                // Staggered show time (500ms between bubbles)
                setTimeout(() => {
                    // Only show if chat is closed 
                    if (!isChatOpen) {
                        // FIX 1: Remove the hard 'hidden' class applied in generateWidgetHtml
                        bubble.removeClass('hidden'); 

                        // Force a repaint/reflow before starting the transition
                        void bubble[0].offsetWidth; 
                        
                        // FIX 2: Remove opacity-0, translate-y-2, and pointer-events-none to trigger the fade-in and slide-up.
                        bubble.removeClass('opacity-0 translate-y-2 pointer-events-none').addClass('opacity-100');
                    }
                }, index * STAGGER_TIME); 
            });
            
            // --- HIDE POPUPS (After Full Show + Duration) ---
            // The hide timer should start AFTER the last bubble has finished its staggered show time.
            const hideDelay = totalStaggeredShowTime + POPUP_DURATION;

            setTimeout(() => {
                console.log(`EliFin AI: Hiding bubbles after total duration of ${hideDelay}ms.`);
                // Hide all bubbles simultaneously
                if (!isChatOpen) {
                    // FIX 3: Re-apply the initial hidden state, including the transform and pointer events, AND the 'hidden' class
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
    // Debug log to check localized data
    console.log("EliFin AI: Initial Messages Localized:", INITIAL_MESSAGES); 
    
    if (!isHistoryLoaded) {
        // If history is not loaded, we still run this to populate the chat messages for the first time
        addInitialMessagesToChat();
    }

    // Initial 3-second delay for the startup messages
    if (!isHistoryLoaded) {
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