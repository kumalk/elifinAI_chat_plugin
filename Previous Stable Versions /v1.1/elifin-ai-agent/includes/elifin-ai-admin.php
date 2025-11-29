<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Renders the full settings page HTML.
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

    ?>
    <div class="wrap">
        <h1><?php echo esc_html('EliFin AI Chat Agent Configuration'); ?></h1>
        <form action="options.php" method="post">
            <?php
            // Output security fields for the registered setting 'cbfa_options_group'
            settings_fields('cbfa_options_group');
            // Output settings sections and their fields
            do_settings_sections('chatbase-assistant');
            // Output save button
            submit_button('Save Settings');
            ?>
        </form>
    </div>
    <?php
}

// ---------------------------------------------------------------------
// Settings Section and Field Callbacks
// ---------------------------------------------------------------------

function cbfa_settings_section_callback() {
    echo '<p>Configure your EliFin AI agent, provided by KumaPix, using your service credentials.</p>';
}

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

/**
 * Renders the Agent Image URL settings field with WordPress Media Uploader integration.
 */
function cbfa_agent_image_url_callback() {
    $option = get_option('cbfa_agent_image_url', '');
    // Define a fallback image URL path
    $default_image_url = CBFA_PLUGIN_URL . 'assets/default-agent.png';
    // Use the custom image if set, otherwise use the default
    $image_url = !empty($option) ? esc_url($option) : esc_url($default_image_url);

    ?>
    <div id="cbfa_agent_image_preview" style="margin-bottom: 10px;">
        <img id="cbfa_agent_preview_img" 
             src="<?php echo $image_url; ?>" 
             data-default-url="<?php echo esc_url($default_image_url); ?>"
             style="max-width: 64px; height: 64px; border-radius: 50%; border: 1px solid #ccc; object-fit: cover;"
             alt="Agent Avatar Preview">
    </div>
    <input type="text" id="cbfa_agent_image_url" name="cbfa_agent_image_url" 
           value="<?php echo esc_attr($option); ?>" class="regular-text" readonly 
           placeholder="No image selected">
    
    <button type="button" class="button cbfa-upload-button"><?php echo !empty($option) ? 'Change Avatar' : 'Select Avatar'; ?></button>
    <button type="button" class="button cbfa-remove-button" style="<?php echo empty($option) ? 'display: none;' : ''; ?>">Remove Avatar</button>
    
    <p class="description">Upload an image for the chat agent's avatar. It will be displayed as a small, round thumbnail.</p>
    <?php
}