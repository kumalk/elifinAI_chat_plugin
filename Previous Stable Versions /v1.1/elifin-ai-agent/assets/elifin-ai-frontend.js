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
    const CBFA_AJAX_URL = cbfa_data.ajax_url;
    const CHATBOT_ID = cbfa_data.chatbot_id;
    const AGENT_NAME = cbfa_data.agent_name;
    const AGENT_IMAGE_URL = cbfa_data.agent_image_url; // NEW: Agent Image URL
    const DEFAULT_AGENT_IMAGE = cbfa_data.default_agent_image; // NEW: Default image path
    const CBFA_NONCE = cbfa_data.nonce;
    
    // Key for session storage (clears history on session end)
    const HISTORY_KEY = 'chatHistory';
    
    // Determine the avatar URL to use in the widget header (custom or default)
    const AVATAR_URL = AGENT_IMAGE_URL || DEFAULT_AGENT_IMAGE;

    // --- DOM Elements (Must be generated in the script) ---
    
    // Function to generate and append the entire widget HTML
    function generateWidgetHtml() {
        // Using inline style for fixed positioning and z-index (99999) 
        // to guarantee visibility and placement.
        const widgetHtml = `
            <!-- The Floating Chat Widget Container -->
            <div id="chat-widget-container" style="position: fixed; bottom: 16px; right: 16px; z-index: 99999;">

                <!-- 1. Floating Chat Bubble/Button -->
                <button id="chat-toggle-button"
                        class="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-indigo-700 active:scale-95 transform">
                    <svg id="chat-icon" class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg id="close-icon" class="w-6 h-6 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <!-- 2. Initial Startup Message -->
                <div id="startup-message-bubble"
                     class="absolute bottom-16 right-0 w-60 p-3 bg-white text-gray-800 text-sm rounded-lg shadow-lg border border-gray-200 pointer-events-none opacity-0 transition-opacity duration-300 transform translate-y-2">
                    👋 Hi there! Ask me anything about our products.
                    <div class="absolute right-3 bottom-[-6px] w-3 h-3 transform rotate-45 bg-white border-r border-b border-gray-200"></div>
                </div>


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
    const startupBubble = $('#startup-message-bubble');
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
            // to expand the chat window for better virtual keyboard handling.
            if (window.innerWidth < 640) {
                // Remove sm:* classes and apply full-screen fixed positioning
                chatWindow.removeClass('hidden sm:absolute sm:w-[350px] sm:h-[500px]').addClass('flex fixed top-0 left-0 w-full h-full');
            } else {
                // Apply desktop floating window classes
                chatWindow.removeClass('hidden fixed top-0 left-0 w-full h-full').addClass('flex sm:absolute sm:w-[350px] sm:h-[500px]');
            }
            startupBubble.addClass('opacity-0 pointer-events-none').removeClass('opacity-100');
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

    function restartChat() {
        sessionStorage.removeItem(HISTORY_KEY);
        conversationHistory = [];
        chatMessages.empty();
        
        const welcomeMessage = "Welcome! I'm " + AGENT_NAME + ", your EliFin AI Chat Agent from KumaPix. How can I help you today?";
        addMessage('assistant', welcomeMessage);
        conversationHistory.push({ role: 'assistant', content: welcomeMessage });
        saveHistory();
        
        setStatus('Chat restarted. All history cleared.', false);
        setTimeout(() => setStatus(''), 3000);
        scrollToBottom();
        chatInput.focus(); // Ensure focus after restart
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
                innerContent = content;
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

    // --- Core API Interaction ---

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
        
        // FIX for Mobile Animation: Force browser reflow/repaint immediately after adding the element.
        void chatMessages[0].offsetWidth; 

        // 4. Construct API Payload (for WordPress AJAX)
        const payload = {
            action: 'chatbase_proxy', // This MUST match the hook added in the main PHP file
            nonce: CBFA_NONCE,
            // Send history as a JSON string to easily handle in PHP $_POST
            messages: JSON.stringify(conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }))),
        };

        // Retry logic for API calls
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
                // Success: Update UI
                handleSuccessfulResponse(data, currentMessageId);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                // Failure: Retry or display error
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    // Exponential backoff: 1s, 2s, 4s...
                    setTimeout(attemptProxyCall, Math.pow(2, retryCount) * 1000); 
                } else {
                    handleFailedResponse(jqXHR, currentMessageId);
                }
            });
        }
        
        function handleSuccessfulResponse(data, messageId) {
            let assistantResponseText = 'Received unexpected data format.';
            let errorText = null;

            // NEW LOGIC: Unwrap the WordPress AJAX success envelope and check the actual AI response structure
            const aiResponseData = data && data.data ? data.data : null;

            if (aiResponseData) {
                // 1. Check for expected 'text' field (common in simpler responses)
                if (aiResponseData.text) {
                    assistantResponseText = aiResponseData.text;
                // 2. Check for 'message' field (common in error/status messages)
                } else if (aiResponseData.message) {
                    assistantResponseText = aiResponseData.message;
                // 3. Check for 'response' or 'content' field, which is common in structured ChatBase/GPT API responses
                } else if (aiResponseData.response) { 
                    assistantResponseText = aiResponseData.response;
                } else if (aiResponseData.content) {
                    assistantResponseText = aiResponseData.content;
                } else {
                    // Fallback to the original error if none of the expected fields are found
                    // Log the full response to help with debugging the expected structure
                    console.error("AI Response Success but unexpected content structure:", aiResponseData);
                }
                
                // If the AI Service returns an error object, we should catch it here
                if (aiResponseData.error) {
                    errorText = `AI Service Error: ${aiResponseData.error}. Check plugin settings.`;
                    assistantResponseText = errorText;
                }

            } else if (data && data.error) {
                // This handles errors coming from the PHP side *before* reaching ChatBase
                 errorText = `PHP Proxy Error: ${data.error}. Check server logs.`;
                 assistantResponseText = errorText;
            } else {
                // Fallback for completely unknown/empty data structure
                console.error("Unknown response data structure:", data);
            }


            const botMessageElement = $('#' + messageId);
            
            if (botMessageElement.length) {
                const finalStyledContent = styleLinks(assistantResponseText);
                botMessageElement.html(finalStyledContent).removeAttr('id');
            } else {
                // If indicator element was missed, add message directly
                addMessage('assistant', assistantResponseText);
            }

            conversationHistory.push({ role: 'assistant', content: assistantResponseText });
            saveHistory();
            
            if (errorText) {
                setStatus(errorText, true);
            } else if (assistantResponseText === 'Received unexpected data format.') {
                 // Keep the error status if we failed to parse the text but still got HTTP 200
                 setStatus('Response format error. Check console for details.', true);
            } else {
                setStatus(''); // Clear status on success
            }
            
            // Ensure state reset and input re-enable on successful response
            isAwaitingResponse = false;
            chatInput.prop('disabled', false);
            sendButton.prop('disabled', false);
            
            // Ensure focus and scroll
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

            // Ensure state reset and input re-enable on final failure
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

    // Initial load and welcome message
    const isHistoryLoaded = loadHistory();
    if (!isHistoryLoaded) {
        const welcomeMessage = "Welcome! I'm " + AGENT_NAME + ", your EliFin AI Chat Agent from KumaPix. How can I help you today?";
        addMessage('assistant', welcomeMessage);
        conversationHistory.push({ role: 'assistant', content: welcomeMessage });
        saveHistory();
    }

    // Initial 3-second delay for the startup message
    setTimeout(() => {
        if (!isChatOpen) {
            startupBubble.removeClass('opacity-0 pointer-events-none').addClass('opacity-100');
            
            // Auto-hide the bubble after another 6 seconds
            setTimeout(() => {
                startupBubble.removeClass('opacity-100').addClass('opacity-0 pointer-events-none');
            }, 6000);
        }
    }, 3000);

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