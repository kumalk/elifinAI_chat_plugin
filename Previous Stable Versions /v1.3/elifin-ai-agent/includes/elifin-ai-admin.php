<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Helper function to output hidden fields for all settings not currently on the page.
 * This prevents WordPress from deleting options not present in the submitted form.
 */
function cbfa_output_hidden_preserved_settings($active_tab) {
    // Group all settings by their registration section for organization
    // NOTE: This list MUST match the settings registered in elifin-ai-agent.php
    $all_settings_fields = array(
        'configuration' => array('cbfa_api_key', 'cbfa_chatbot_id', 'cbfa_agent_name', 'cbfa_initial_messages'),
        // Branding now only holds Agent Avatar
        'branding'      => array('cbfa_agent_image_url'),
        // New 'button_icon' tab for chat button settings
        'button_icon'   => array('cbfa_button_image_url'),
        'styling'       => array('cbfa_primary_color', 'cbfa_secondary_color', 'cbfa_agent_name_color', 'cbfa_header_text_color', 'cbfa_agent_message_color', 'cbfa_agent_bubble_text_color', 'cbfa_user_message_color', 'cbfa_user_bubble_text_color', 'cbfa_font_family', 'cbfa_base_font_size'),
        'popups'        => array('cbfa_popup_delay', 'cbfa_popup_duration', 'cbfa_popup_trigger'),
    );

    foreach ($all_settings_fields as $tab => $keys) {
        // Skip the current active tab's settings, as they are already in the form
        if ($tab === $active_tab) {
            continue;
        }

        foreach ($keys as $key) {
            $value = get_option($key);
            // Check if value is set and not false (empty strings should be submitted to clear)
            if ($value !== false) {
                if (!is_array($value)) {
                    // Output a hidden field for each setting in the inactive tabs
                    echo '<input type="hidden" name="' . esc_attr($key) . '" value="' . esc_attr($value) . '" />';
                } else {
                    // Handle arrays 
                    foreach ($value as $k => $v) {
                        echo '<input type="hidden" name="' . esc_attr($key) . '[' . esc_attr($k) . ']" value="' . esc_attr($v) . '" />';
                    }
                }
            }
        }
    }
}


/**
 * Renders the full settings page HTML with tabbed navigation.
 */
function cbfa_settings_page_html() {
    // Check user capabilities
    if (!current_user_can('manage_options')) {
        return;
    }

    // Show saved settings message
    if (isset($_GET['settings-updated'])) {
        add_settings_error('cbfa_messages', 'cbfa_message', 'Settings Saved', 'updated');
    }
    settings_errors('cbfa_messages');

    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'configuration';

    ?>
    <div class="wrap">
        <h1><?php echo esc_html('EliFin AI Chat Agent Configuration'); ?></h1>
        
        <h2 class="nav-tab-wrapper">
            <a href="?page=chatbase-assistant&tab=configuration" class="nav-tab <?php echo $active_tab == 'configuration' ? 'nav-tab-active' : ''; ?>">Configuration</a>
            <a href="?page=chatbase-assistant&tab=branding" class="nav-tab <?php echo $active_tab == 'branding' ? 'nav-tab-active' : ''; ?>">Agent Avatar</a>
            <a href="?page=chatbase-assistant&tab=button_icon" class="nav-tab <?php echo $active_tab == 'button_icon' ? 'nav-tab-active' : ''; ?>">Button Icon</a>
            <a href="?page=chatbase-assistant&tab=styling" class="nav-tab <?php echo $active_tab == 'styling' ? 'nav-tab-active' : ''; ?>">Styling & Colors</a>
            <a href="?page=chatbase-assistant&tab=popups" class="nav-tab <?php echo $active_tab == 'popups' ? 'nav-tab-active' : ''; ?>">Popups</a>
            <a href="?page=chatbase-assistant&tab=about" class="nav-tab <?php echo $active_tab == 'about' ? 'nav-tab-active' : ''; ?>">About</a>
        </h2>
        
        <form action="options.php" method="post">
            <?php
            settings_fields('cbfa_options_group');
            
            // CRITICAL FIX: Preserve settings from inactive tabs
            if ($active_tab !== 'about') {
                cbfa_output_hidden_preserved_settings($active_tab);
            }

            // Hidden field to preserve the active tab on redirect after saving
            echo '<input type="hidden" name="tab" value="' . esc_attr($active_tab) . '" />';
            
            switch ($active_tab) {
                case 'branding':
                    do_settings_sections('chatbase-assistant-branding');
                    break;
                case 'button_icon':
                    do_settings_sections('chatbase-assistant-button-icon');
                    break;
                case 'styling':
                    do_settings_sections('chatbase-assistant-styling');
                    break;
                case 'popups':
                    do_settings_sections('chatbase-assistant-popups');
                    break;
                case 'about':
                    cbfa_about_tab_content();
                    break;
                case 'configuration':
                default:
                    do_settings_sections('chatbase-assistant-config');
                    break;
            }

            if ($active_tab !== 'about') {
                submit_button('Save Settings');
            }
            ?>
        </form>
    </div>
    <?php
}

function cbfa_about_tab_content() {
    ?>
    <div class="card">
        <h3>About EliFin AI - Smart Chat Agent</h3>
        <p>This plugin is proudly provided by KumaPix, integrating the powerful ChatBase AI service into your WordPress site.</p>
        <p>It enables secure, server-side communication with your AI model, ensuring your API key is never exposed on the client side.</p>
        <p>Version: 1.0.12</p>
        <h4>Support & Documentation</h4>
        <p>For support and documentation, please refer to your vendor documentation.</p>
    </div>
    <?php
}

// ---------------------------------------------------------------------
// Settings Section and Field Callbacks
// ---------------------------------------------------------------------

function cbfa_settings_section_callback() {
    echo '<p>Configure your EliFin AI agent, provided by KumaPix, using your service credentials.</p>';
}

function cbfa_branding_section_callback() {
    echo '<p>Customize the look and branding of the chat agent\'s avatar.</p>';
}

function cbfa_button_icon_section_callback() {
    echo '<p>Customize the floating chat button\'s icon.</p>';
}

function cbfa_style_section_callback() {
    echo '<p>Set custom colors and fonts for the chat widget to match your brand. These colors override the default theme settings.</p>';
}

function cbfa_popup_section_callback() {
    echo '<p>Control the timing and visibility of the initial popup messages.</p>';
}


// --- Configuration Fields ---

function cbfa_agent_name_callback() {
    $option = get_option('cbfa_agent_name');
    ?>
    <input type="text" id="cbfa_agent_name" name="cbfa_agent_name" value="<?php echo esc_attr($option ?: 'EliFin AI Assistant'); ?>" placeholder="e.g., EliFin AI Assistant" class="regular-text">
    <p class="description">The name that appears in the chat window header.</p>
    <?php
}

function cbfa_chatbot_id_callback() {
    $option = get_option('cbfa_chatbot_id');
    ?>
    <input type="text" id="cbfa_chatbot_id" name="cbfa_chatbot_id" value="<?php echo esc_attr($option); ?>" placeholder="e.g., __3gNzfEFKAe5jcV37XOn" class="regular-text">
    <p class="description">The unique ID for your AI Bot.</p>
    <?php
}

function cbfa_api_key_callback() {
    $option = get_option('cbfa_api_key');
    ?>
    <input type="password" id="cbfa_api_key" name="cbfa_api_key" value="<?php echo esc_attr($option); ?>" placeholder="Enter your full API Key here" class="regular-text">
    <p class="description">Your API Key. This key is used securely on the server-side and is never exposed to the public.</p>
    <?php
}

function cbfa_initial_messages_callback() {
    $default_messages = "👋 Hi there! Ask me anything about our products.\nI'm available 24/7 to help you.";
    $option = get_option('cbfa_initial_messages', $default_messages);
    ?>
    <textarea id="cbfa_initial_messages" name="cbfa_initial_messages" rows="5" cols="50" class="large-text"><?php echo esc_textarea($option); ?></textarea>
    <p class="description">Enter multiple initial messages for the chat agent, one per line.</p>
    <?php
}


// --- Branding Fields (Agent Avatar and Button Icon) ---

/**
 * Renders a generic Image URL settings field with WordPress Media Uploader integration.
 * @param string $key_suffix 'agent' or 'button'
 * @param string $default_url_suffix 'default-agent.png' or 'icon.png'
 * @param string $label 'Avatar' or 'Icon'
 * @param string $description Field description
 * @param string $preview_styles Custom CSS for the preview image.
 */
function cbfa_image_upload_field_html($key_suffix, $default_url_suffix, $label, $description, $preview_styles) {
    // Keys derived from suffix
    $option_key = 'cbfa_' . $key_suffix . '_image_url';
    $input_id = $option_key;
    $preview_id = 'cbfa_' . $key_suffix . '_preview_img';

    // Get current option value
    $option = get_option($option_key, '');
    
    // Default URL must be derived from PHP constant (CBFA_PLUGIN_URL comes from elifin-ai-agent.php)
    $default_image_url = defined('CBFA_PLUGIN_URL') ? CBFA_PLUGIN_URL . 'assets/' . $default_url_suffix : '';
    $image_url = !empty($option) ? esc_url($option) : esc_url($default_image_url);

    // Initial background style for button icon if no image is selected (to fix broken/invisible PNG)
    // We fetch the primary color to use as a fallback background
    $primary_color = get_option('cbfa_primary_color', '#4f46e5');
    $button_background = ($key_suffix === 'button' && empty($option)) ? 'background: ' . esc_attr($primary_color) . ';' : '';

    ?>
    <div id="<?php echo esc_attr($key_suffix); ?>_image_preview_wrapper" style="margin-bottom: 10px;">
        <img id="<?php echo esc_attr($preview_id); ?>" 
             class="cbfa-preview-image"
             src="<?php echo $image_url; ?>" 
             data-default-url="<?php echo esc_url($default_image_url); ?>"
             style="<?php echo esc_attr($preview_styles) . esc_attr($button_background); ?>"
             alt="<?php echo esc_attr($label); ?> Preview">
    </div>
    <input type="text" id="<?php echo esc_attr($input_id); ?>" name="<?php echo esc_attr($option_key); ?>" 
           value="<?php echo esc_attr($option); ?>" class="regular-text cbfa-upload-target" readonly 
           placeholder="No image selected">
    
    <button type="button" data-target="<?php echo esc_attr($key_suffix); ?>" class="button cbfa-upload-button"><?php echo !empty($option) ? 'Change ' . $label : 'Select ' . $label; ?></button>
    <button type="button" data-target="<?php echo esc_attr($key_suffix); ?>" class="button cbfa-remove-button" style="<?php echo empty($option) ? 'display: none;' : ''; ?>">Remove <?php echo esc_html($label); ?></button>
    
    <p class="description"><?php echo esc_html($description); ?></p>
    <?php
}

/**
 * Renders the Agent Image URL settings field (used in chat header).
 */
function cbfa_agent_image_url_callback() {
    cbfa_image_upload_field_html(
        'agent',
        'default-agent.png',
        'Avatar',
        'Upload an image for the chat agent\'s avatar, displayed in the chat header.',
        'max-width: 64px; height: 64px; border-radius: 50%; border: 1px solid #ccc; object-fit: cover;'
    );
}

/**
 * Renders the Chat Button Image URL settings field.
 */
function cbfa_button_image_url_callback() {
    cbfa_image_upload_field_html(
        'button',
        'icon.png', // <-- CHANGED TO PNG
        'Icon',
        'Upload a custom image (e.g., your logo or a staff photo) for the floating chat button. It will override the default chat icon.',
        'max-width: 50px; height: 50px; border-radius: 50%; border: 1px solid #ccc; object-fit: cover;'
    );
}


// --- Styling Fields ---

function cbfa_primary_color_callback() {
    $option = get_option('cbfa_primary_color', '#4f46e5');
    ?>
    <input type="text" id="cbfa_primary_color" name="cbfa_primary_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#4f46e5">
    <p class="description">Used for chat button, header gradient start, and primary UI elements.</p>
    <?php
}

function cbfa_secondary_color_callback() {
    $option = get_option('cbfa_secondary_color', '#6366f1');
    ?>
    <input type="text" id="cbfa_secondary_color" name="cbfa_secondary_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#6366f1">
    <p class="description">Used for header gradient end and secondary UI elements.</p>
    <?php
}

function cbfa_agent_name_color_callback() {
    $option = get_option('cbfa_agent_name_color', '#ffffff');
    ?>
    <input type="text" id="cbfa_agent_name_color" name="cbfa_agent_name_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#ffffff">
    <p class="description">Color for the Agent Name text in the chat header.</p>
    <?php
}

function cbfa_header_text_color_callback() {
    $option = get_option('cbfa_header_text_color', '#ffffff');
    ?>
    <input type="text" id="cbfa_header_text_color" name="cbfa_header_text_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#ffffff">
    <p class="description">Color for the Header Icons (Restart, Close) and general header text (excluding Agent Name).</p>
    <?php
}

function cbfa_agent_message_color_callback() {
    $option = get_option('cbfa_agent_message_color', '#e5e7eb');
    ?>
    <input type="text" id="cbfa_agent_message_color" name="cbfa_agent_message_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#e5e7eb">
    <p class="description">Background color for the AI Agent's message bubbles.</p>
    <?php
}

function cbfa_agent_bubble_text_color_callback() {
    $option = get_option('cbfa_agent_bubble_text_color', '#1f2937');
    ?>
    <input type="text" id="cbfa_agent_bubble_text_color" name="cbfa_agent_bubble_text_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#1f2937">
    <p class="description">Text color inside the AI Agent\'s message bubbles.</p>
    <?php
}


function cbfa_user_message_color_callback() {
    $option = get_option('cbfa_user_message_color', '#6366f1');
    ?>
    <input type="text" id="cbfa_user_message_color" name="cbfa_user_message_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#6366f1">
    <p class="description">Background color for the User\'s message bubbles.</p>
    <?php
}

function cbfa_user_bubble_text_color_callback() {
    $option = get_option('cbfa_user_bubble_text_color', '#ffffff');
    ?>
    <input type="text" id="cbfa_user_bubble_text_color" name="cbfa_user_bubble_text_color" value="<?php echo esc_attr($option); ?>" class="cbfa-color-field" data-default-color="#ffffff">
    <p class="description">Text color inside the User\'s message bubbles.</p>
    <?php
}

function cbfa_font_family_callback() {
    $option = get_option('cbfa_font_family', "'Inter', sans-serif");
    ?>
    <input type="text" id="cbfa_font_family" name="cbfa_font_family" value="<?php echo esc_attr($option); ?>" placeholder="'Inter', sans-serif" class="regular-text">
    <p class="description">Specify the font stack (e.g., 'Arial', sans-serif). Note: 'Inter' is loaded by default.</p>
    <?php
}

function cbfa_base_font_size_callback() {
    $option = get_option('cbfa_base_font_size', '14px');
    ?>
    <input type="text" id="cbfa_base_font_size" name="cbfa_base_font_size" value="<?php echo esc_attr($option); ?>" placeholder="14px" class="small-text">
    <p class="description">Base font size for the chat widget (e.g., 14px, 0.875rem).</p>
    <?php
}


// --- Popup Fields ---

function cbfa_popup_delay_callback() {
    $option = get_option('cbfa_popup_delay', 3); 
    ?>
    <input type="number" min="0" step="1" id="cbfa_popup_delay" name="cbfa_popup_delay" value="<?php echo esc_attr($option); ?>" placeholder="3" class="small-text">
    <p class="description">Time (in seconds) after the page loads before the popups appear.</p>
    <?php
}

function cbfa_popup_duration_callback() {
    $option = get_option('cbfa_popup_duration', 6); 
    ?>
    <input type="number" min="1" step="1" id="cbfa_popup_duration" name="cbfa_popup_duration" value="<?php echo esc_attr($option); ?>" placeholder="6" class="small-text">
    <p class="description">Time (in seconds) the popups remain visible before automatically hiding.</p>
    <?php
}

function cbfa_popup_trigger_callback() {
    $option = get_option('cbfa_popup_trigger', 'new_user'); 
    ?>
    <select id="cbfa_popup_trigger" name="cbfa_popup_trigger">
        <option value="new_user" <?php selected($option, 'new_user'); ?>>Only for New Users (One per session)</option>
        <option value="always" <?php selected($option, 'always'); ?>>Always (Every page load)</option>
    </select>
    <p class="description">Control when the popups are displayed.</p>
    <?php
}