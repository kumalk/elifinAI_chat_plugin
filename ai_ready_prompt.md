ELIFIN AI CHAT AGENT PLUGIN: DEVELOPMENT CONTEXT AND GUIDELINES

You are tasked with continuing the development, bug fixing, and improvement of the EliFin AI - Smart AI Chat Agent Service WordPress plugin.

CRITICAL GUIDELINE: You MUST adhere strictly to the existing file structure, variable names, function signatures, and overall coding style. All outputs MUST be provided as complete, updated code files.

1. Project Overview

Plugin Name: EliFin AI - Smart AI Chat Agent Service (Handles secure, server-side proxy communication with a ChatBase AI endpoint).

Target Environment: WordPress (PHP, jQuery, Vanilla JS, Custom CSS, Tailwind CSS utilities).

Security: API Key is stored in WP options and used exclusively via a secure PHP AJAX proxy (elifin-ai-ajax.php).

2. File Structure

wp-content/plugins/elifin-ai-agent/
├── elifin-ai-agent.php               <-- Main plugin file (Hooks, Settings registration, Shortcode/Embed logic)
├── includes/
│   ├── elifin-ai-admin.php           <-- Admin Settings Page HTML/Callbacks
│   └── elifin-ai-ajax.php            <-- Secure PHP Proxy (Handles external API call)
└── assets/
    ├── elifin-ai-frontend.js         <-- Core Chat Widget Logic (DOM manipulation, AJAX calls, State, UI features)
    ├── elifin-ai-frontend.css        <-- Widget Styling (Custom Variables, Layout, Animations)
    ├── elifin-ai-admin.js            <-- Admin Media Uploader/Color Picker logic
    └── elifin-ai-admin.css           <-- Admin Page Styling (Tabs)


3. Key Features Implemented (Change Log Summary)

Secure Communication: Uses PHP proxy (elifin-ai-ajax.php) to keep API keys hidden.

Customization: Extensive Admin Panel (split into Configuration, Avatar, Button Icon, Styling, Popups).

Error Handling & Typing Simulation: Implements a silent error retry loop (up to 2 times) for unexpected data format errors, and a humanized typing delay based on message length (cbfa_typing_delay_ms_per_char).

UI/UX: Responsive mobile zoom prevention, clickable link cards in chat bubbles (same-tab links), scrollable Quick Action Buttons above the message input.

Embed Mode: Supports a floating widget (default) OR embedding via shortcode [elifin_ai_chat].

4. Code Files (Mandatory Context)

[Content of elifin-ai-agent.php]
[Content of elifin-ai-admin.php]
[Content of elifin-ai-ajax.php]
[Content of elifin-ai-frontend.js]
[Content of elifin-ai-frontend.css]
[Content of elifin-ai-admin.js]
[Content of elifin-ai-admin.css]

5. Task Instructions

Based on the context and files above, please execute the user's request. Always provide the complete, updated code for any modified file.