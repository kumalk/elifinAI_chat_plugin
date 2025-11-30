# **EliFin AI \- Smart AI Chat Agent Service (Developer Documentation)**

## **Overview**

The EliFin AI Chat Agent is a specialized WordPress plugin designed to seamlessly integrate a custom-branded AI chatbot (powered by ChatBase) onto a WordPress website. Its defining feature is the use of a secure, server-side PHP proxy to handle API requests, ensuring the sensitive API Key is never exposed to the client side.

## **I. File Structure**

| Path | Purpose |
| :---- | :---- |
| elifin-ai-agent.php | **Core Plugin File.** Handles WordPress hooks, settings registration, localization, asset enqueuing (now deferred to wp\_footer), and shortcode registration (\[elifin\_ai\_chat\]). |
| includes/elifin-ai-admin.php | **Admin Logic.** Renders the tabbed settings page HTML and houses all settings field callback functions. |
| includes/elifin-ai-ajax.php | **Security Proxy.** Contains the cbfa\_proxy\_handler function for secure, server-side communication with the ChatBase API via cURL. |
| assets/elifin-ai-frontend.js | **Frontend Logic.** Manages the chat widget UI, state, history persistence (sessionStorage), mobile responsiveness, humanized typing delay, silent error retries, and AJAX communication. |
| assets/elifin-ai-frontend.css | **Frontend Styling.** Contains custom CSS variables, animation keyframes, and style rules for the widget, overriding standard Tailwind classes where necessary. |
| assets/elifin-ai-admin.js | **Admin Media Logic.** Integrates the WordPress Media Uploader and color picker for branding options. |
| assets/elifin-ai-admin.css | **Admin Styling.** Provides styling for the custom tab navigation on the settings page. |

## **II. Key Features**

| Feature | Description | Implementation Details |
| :---- | :---- | :---- |
| **Secure Proxy** | API Key is protected by handling all external communication server-side via PHP/cURL. | elifin-ai-ajax.php |
| **Deferred Loading (NEW)** | Widget script is loaded in the footer to ensure the main page content loads first. | add\_action('wp\_footer', 'cbfa\_load\_widget') in elifin-ai-agent.php. |
| **Embed Mode (NEW)** | Supports embedding the widget within any page content area. | Shortcode \[elifin\_ai\_chat\] in elifin-ai-agent.php. Uses class cbfa-embedded-widget to adjust positioning in JS. |
| **Humanized Typing** | Simulates a human typing speed proportional to the response length. | Configurable via **Typing Speed (ms/char)** setting. Logic implemented via setTimeout in elifin-ai-frontend.js. |
| **Error Retries** | Silently retries failed requests (e.g., unexpected data format) up to 2 times before showing a user-friendly error. | Logic implemented in sendMessage and handleSuccessfulResponse in elifin-ai-frontend.js. |
| **Quick Links** | Horizontally scrollable buttons above the message input for common actions. | Configured via JSON array in **Quick Action Links** setting. Rendered using getQuickLinksHtml() in elifin-ai-frontend.js. |
| **Mobile Fixes** | Prevents unwanted screen zooming on iOS/Android when the chat window is open. | Dynamically manipulates the viewport meta tag in elifin-ai-frontend.js. |
| **Custom Styling** | Fully customizable colors, agent/button images, and font stack via the tabbed Admin Panel. | CSS variables are generated dynamically in JS and used throughout elifin-ai-frontend.css. |
| **Link Cards** | URLs are replaced with elegant, clickable cards that open in the same tab. | styleLinks function in elifin-ai-frontend.js. |

## **III. Change Log**

| Version | Date | Changes |
| :---- | :---- | :---- |
| **1.0.12** | 2025-11-30 | **STABILITY & NEW FEATURES RELEASE** |
|  |  | \- **Fix:** Resolved PHP fatal error on activation by correcting missing code and malformed function structures in elifin-ai-agent.php and includes/elifin-ai-admin.php. |
|  |  | \- **Fix:** Fixed Chat Button shape issue by adding defensive overflow: hidden \!important; and explicit border-radius: 50% to image container/content in elifin-ai-frontend.css. |
|  |  | \- **Fix:** Fixed Quick Links visibility by adding robust array filtering and rendering logic in elifin-ai-frontend.js and correcting the wrapper's CSS. |
|  |  | \- **Feature: Shortcode/Embed Mode:** Added shortcode \[elifin\_ai\_chat\] support and logic to prevent the floating widget from loading when the shortcode is used. |
|  |  | \- **Feature: Deferred Load:** Switched asset enqueuing hook from wp\_enqueue\_scripts to wp\_footer to ensure the widget loads after core page content. |
| **1.0.11** | 2025-11-29 | **UI/UX & Error Handling Release** |
|  |  | \- **Feature:** Implemented silent retry logic (up to 2 attempts) for unexpected API response formats. |
|  |  | \- **Feature:** Added humanized typing delay (ms/char) configurable via Admin Panel. |
|  |  | \- **Feature:** Added scrollable Quick Action Buttons (JSON configurable) above the input box. |
|  |  | \- **Enhancement:** Switched header gradient direction (Secondary Top, Primary Bottom). |
|  |  | \- **Enhancement:** Links open in the **same tab** (target="\_self") and render as clickable cards. |
|  |  | \- **Fix:** Resolved mobile screen zoom issue by dynamically managing the viewport meta tag. |
| **1.0.10** | 2025-11-28 | **Admin & Asset Stabilization** |
|  |  | \- **Fix:** Switched default Chat Button icon from SVG to icon.png due to cross-browser/styling issues. |
|  |  | \- **Fix:** Implemented definitive fix for Admin Media Uploader cross-talk issue by separating Agent and Button settings into two tabs and refining JS targeting logic. |
|  |  | \- **Enhancement:** Chat button uses Agent Avatar image as a fallback when Button Icon is empty. |

