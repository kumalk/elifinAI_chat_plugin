<?php
/**
 * Plugin Name: EliFin AI - Smart AI Chat Agent Service
 * Description: Integrates the EliFin AI Smart Chat Agent (powered by ChatBase) onto your WordPress site. Provided by KumaPix.
 * Version: 1.0.2
 * Author: KumaPix
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin path for includes
define('CBFA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CBFA_PLUGIN_URL', plugin_dir_url(__FILE__));

// ---------------------------------------------------------------------
// 1. ADMIN AND SETTINGS
// ---------------------------------------------------------------------

// Include admin settings page logic
require_once CBFA_PLUGIN_DIR . 'includes/elifin-ai-admin.php';

// Register settings (called from the admin file, but defined here for hook context)
function cbfa_register_settings() {
    register_setting('cbfa_options_group', 'cbfa_api_key');
    register_setting('cbfa_options_group', 'cbfa_chatbot_id');
    register_setting('cbfa_options_group', 'cbfa_agent_name');

    // Add settings section
    add_settings_section(
        'cbfa_main_section', // ID
        'EliFin AI Configuration (KumaPix)',
        'cbfa_settings_section_callback', // Callback
        'chatbase-assistant' // Page slug
    );

    // Add fields
    add_settings_field('cbfa_agent_name_field', 'Agent Name', 'cbfa_agent_name_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_chatbot_id_field', 'Bot ID', 'cbfa_chatbot_id_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_api_key_field', 'API Key', 'cbfa_api_key_callback', 'chatbase-assistant', 'cbfa_main_section');
}
add_action('admin_init', 'cbfa_register_settings');

// Add top-level menu item to the WordPress sidebar
function cbfa_add_admin_menu() {
    add_menu_page(
        'EliFin AI Chat Agent Settings',
        'EliFin AI Agent',
        'manage_options',
        'chatbase-assistant',
        'cbfa_settings_page_html',
        'dashicons-format-chat',
        6
    );
}
add_action('admin_menu', 'cbfa_add_admin_menu');


// ---------------------------------------------------------------------
// 2. FRONT-END SCRIPT AND HTML INJECTION
// ---------------------------------------------------------------------

/**
 * Enqueues the chat widget script on the public facing front-end.
 */
function cbfa_enqueue_frontend_scripts() {
    // Retrieve configuration values
    $api_key = get_option('cbfa_api_key');
    $bot_id = get_option('cbfa_chatbot_id');

    // Do not load agent if not configured
    if (empty($api_key) || empty($bot_id)) {
        return; 
    }

    // Enqueue the main front-end script
    wp_enqueue_script(
        'cbfa-frontend-script',
        CBFA_PLUGIN_URL . 'assets/elifin-ai-frontend.js', // Target the correct file
        array('jquery'),
        '1.0.2', // Bumping version for cache bust and new logic
        true // Load in the footer for performance
    );

    // Pass configuration data to the JavaScript file
    wp_localize_script(
        'cbfa-frontend-script',
        'cbfa_data',
        array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'chatbot_id' => $bot_id,
            'agent_name' => get_option('cbfa_agent_name') ?: 'EliFin AI Assistant',
            'nonce'      => wp_create_nonce('chatbase_proxy_nonce') 
        )
    );
}
// Hook for front-end script loading
add_action('wp_enqueue_scripts', 'cbfa_enqueue_frontend_scripts');


// ---------------------------------------------------------------------
// 3. AJAX PROXY INTEGRATION
// ---------------------------------------------------------------------

// Include the secure PHP proxy logic
require_once CBFA_PLUGIN_DIR . 'includes/elifin-ai-ajax.php';

// Hook the proxy handler for logged-in users and non-logged-in users
add_action('wp_ajax_chatbase_proxy', 'cbfa_proxy_handler');
add_action('wp_ajax_nopriv_chatbase_proxy', 'cbfa_proxy_handler');

// ---------------------------------------------------------------------
// 4. ADMIN NOTICE
// ---------------------------------------------------------------------

function cbfa_missing_settings_notice() {
    echo '<div class="notice notice-error is-dismissible">
        <p><strong>EliFin AI Chat Agent:</strong> Please configure your Bot ID and API Key on the <a href="' . esc_url(admin_url('admin.php?page=chatbase-assistant')) . '">EliFin AI Settings</a> page to enable the widget.</p>
    </div>';
}

/**
 * Checks for missing settings and displays an admin notice if required.
 * Hooked to admin_init.
 */
function cbfa_check_for_missing_settings() {
    $api_key = get_option('cbfa_api_key');
    $bot_id = get_option('cbfa_chatbot_id');
    
    if (empty($api_key) || empty($bot_id)) {
        add_action('admin_notices', 'cbfa_missing_settings_notice');
    }
}
// Using admin_init to reliably check the settings status in the admin area
add_action('admin_init', 'cbfa_check_for_missing_settings');