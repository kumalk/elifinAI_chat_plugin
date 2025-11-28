## 📑 EliFin AI - Smart AI Chat Agent Service: Development Documentation

This document provides a detailed overview of the architecture and functionality of the **EliFin AI - Smart AI Chat Agent Service** WordPress plugin, which integrates a secure, responsive, and persistent AI chat widget using the **ChatBase API**.

The plugin adheres to WordPress best practices, utilizing admin settings for configuration, AJAX for secure server-side API calls, and proper front-end asset management.

---

### 1. Plugin Core: `elifin-ai-agent.php`

This file serves as the main entry point and orchestrator, handling file inclusion, WordPress hook registration, and essential state management.

* **Initialization:** Defines constants (`CBFA_PLUGIN_DIR`, `CBFA_PLUGIN_URL`) and includes the core logic files: `elifin-ai-admin.php` and `elifin-ai-ajax.php`. It ensures direct access is prevented using `!defined('ABSPATH')`.
* **Settings Registration:** Registers three main settings using `register_setting`: `cbfa_api_key`, `cbfa_chatbot_id`, and `cbfa_agent_name`.
* **Admin Menu:** Adds a top-level menu item named 'EliFin AI Agent' to the WordPress sidebar, linking to the settings page.
* **Front-End Script Enqueue:**
    * It only enqueues the front-end script (`elifin-ai-frontend.js`) if both the API Key and Bot ID are configured.
    * It uses `wp_localize_script` to securely pass configuration data (`ajax_url`, `chatbot_id`, `agent_name`, and a security `nonce`) from PHP to the JavaScript.
* **AJAX Proxy Hooks:** Hooks the server-side proxy handler (`cbfa_proxy_handler`) for both logged-in users (`wp_ajax_chatbase_proxy`) and non-logged-in users (`wp_ajax_nopriv_chatbase_proxy`) to enable secure communication.
* **Admin Notice:** Checks for missing API Key or Bot ID and displays an admin error notice prompting configuration if they are absent.

---

### 2. Secure AJAX Proxy: `includes/elifin-ai-ajax.php`

This file implements the **secure server-side proxy** for communicating with the external ChatBase AI service, ensuring the sensitive API Key is never exposed to the public.

* **Security Nonce Verification:** The handler begins by checking the `nonce` provided by the client using `wp_verify_nonce()` to prevent Cross-Site Request Forgery (CSRF).
* **Configuration Retrieval:** It retrieves the securely stored `$api_key` and `$bot_id` using `get_option()`.
* **Payload Construction:** It decodes the `messages` history received from the client and constructs the final JSON payload for the ChatBase API, including the `chatbotId` and the conversation `messages`.
* **cURL Execution:**
    * Uses **cURL** to make a server-to-server `POST` request to the ChatBase API URL (`https://www.chatbase.co/api/v1/chat`).
    * The **API Key** is transmitted securely in the `Authorization: Bearer` HTTP header.
    * Includes robust error handling for cURL connection failures and timeouts.
* **Response Handling:** It forwards the raw JSON response and the HTTP status code received from ChatBase directly back to the front-end, acting as a transparent proxy.

---

### 3. Front-End Logic: `assets/elifin-ai-frontend.js`

This script manages the widget's presentation, user interaction, conversation history, and AJAX communication.

#### Architecture and Dependencies
* **Dynamic Asset Loading:** It dynamically injects the **Tailwind CSS CDN** and the **Inter font** to ensure consistent styling and widget isolation from the site's theme. It also dynamically links the custom CSS file.
* **Widget Rendering:** The entire chat widget HTML is generated and appended to the `<body>`. It uses a crucial inline style (`position: fixed; bottom: 16px; right: 16px; z-index: 99999;`) to guarantee visibility and placement.

#### State and History
* **History Persistence:** Uses **`sessionStorage`** (key: `chatHistory`) to save and load the `conversationHistory` array, allowing the conversation to persist across page reloads within the same session.
* **Restart Function:** The `restartChat` function clears the `sessionStorage` and the UI, initiating a new conversation.
* **Welcome Message:** An initial welcome message is displayed upon first load or after a restart.

#### User Interface and Experience
* **Responsiveness Fix:** It includes logic to switch the chat window to a **full-screen fixed layout** on small screens (`window.innerWidth < 640`), which is noted as a fix for better virtual keyboard handling.
* **Typing Indicator:** A placeholder message with the `typing-dots` class is added immediately after the user sends a message, and its element ID is used to replace the content with the final response.
* **Retry Logic:** The `sendMessage` function implements a **3-try retry mechanism** with an **exponential backoff** (up to 4s delay) for resilient API calls.
* **Content Formatting:** The `styleLinks` utility function processes the assistant's response to:
    * Convert basic Markdown for **bold** (`**...**`) and *italic* (`*...*`).
    * Turn raw URLs into styled, clickable links.
* **Startup Bubble:** A temporary welcome bubble appears after a 3-second delay and auto-hides after another 6 seconds if the chat remains closed.
* **Emoji Picker:** Includes a functional emoji picker that allows users to insert emojis into the input field.

---

### 4. Front-End Styling: `assets/elifin-ai-frontend.css`

This file provides custom CSS required for specific animations and element behavior not easily handled by Tailwind utilities.

* **Font and Box Model:** Enforces `font-family: 'Inter', sans-serif;` and `box-sizing: border-box;` for all widget elements.
* **Custom Scrollbar:** Defines a clean, dark-themed scrollbar style for the `#chat-messages` container.
* **Typing Animation:** Defines the **`typing-dots`** element and the associated `@keyframes bounce` animation, providing a smooth visual indicator when the assistant is generating a response.

---

### 5. Admin Interface: `includes/elifin-ai-admin.php`

This file provides the necessary functions to display and save the plugin's configuration settings within the WordPress dashboard.

* **Security:** Checks for `current_user_can('manage_options')` before rendering content.
* **Settings Fields:** Provides input fields for:
    * **Agent Name:** The displayed name in the chat header.
    * **Bot ID:** The unique ID for the AI Bot.
    * **API Key:** Uses `type="password"` to obscure the sensitive key input, noting that the key is used securely on the server-side.