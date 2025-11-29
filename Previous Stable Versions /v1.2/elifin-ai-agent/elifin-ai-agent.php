<?php
/**
 * Plugin Name: EliFin AI - Smart AI Chat Agent Service
 * Description: Integrates the EliFin AI Smart Chat Agent (powered by ChatBase) onto your WordPress site. Provided by KumaPix.
 * Version: 1.0.5 
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
// Include the secure PHP proxy logic
require_once CBFA_PLUGIN_DIR . 'includes/elifin-ai-ajax.php';

// Register settings
function cbfa_register_settings() {
    register_setting('cbfa_options_group', 'cbfa_api_key');
    register_setting('cbfa_options_group', 'cbfa_chatbot_id');
    register_setting('cbfa_options_group', 'cbfa_agent_name');
    register_setting('cbfa_options_group', 'cbfa_agent_image_url'); 
    register_setting('cbfa_options_group', 'cbfa_initial_messages'); 
    
    // NEW Popup Control Settings
    register_setting('cbfa_options_group', 'cbfa_popup_delay', array('sanitize_callback' => 'intval')); 
    register_setting('cbfa_options_group', 'cbfa_popup_duration', array('sanitize_callback' => 'intval')); 
    register_setting('cbfa_options_group', 'cbfa_popup_trigger', array('sanitize_callback' => 'sanitize_text_field'));

    // Add settings section
    add_settings_section(
        'cbfa_main_section', // ID
        'EliFin AI Configuration (KumaPix)',
        'cbfa_settings_section_callback', // Callback
        'chatbase-assistant' // Page slug
    );
    
    add_settings_section(
        'cbfa_popup_section', // ID
        'Popup and Timing Controls',
        'cbfa_popup_section_callback', // Callback
        'chatbase-assistant' // Page slug
    );


    // Add fields
    add_settings_field('cbfa_agent_name_field', 'Agent Name', 'cbfa_agent_name_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_chatbot_id_field', 'Bot ID', 'cbfa_chatbot_id_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_api_key_field', 'API Key', 'cbfa_api_key_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_agent_image_field', 'Agent Avatar', 'cbfa_agent_image_url_callback', 'chatbase-assistant', 'cbfa_main_section');
    add_settings_field('cbfa_initial_messages_field', 'Initial Messages', 'cbfa_initial_messages_callback', 'chatbase-assistant', 'cbfa_main_section');

    // NEW Popup Fields
    add_settings_field('cbfa_popup_delay_field', 'Popup Delay (seconds)', 'cbfa_popup_delay_callback', 'chatbase-assistant', 'cbfa_popup_section');
    add_settings_field('cbfa_popup_duration_field', 'Popup Duration (seconds)', 'cbfa_popup_duration_callback', 'chatbase-assistant', 'cbfa_popup_section');
    add_settings_field('cbfa_popup_trigger_field', 'Popup Visibility', 'cbfa_popup_trigger_callback', 'chatbase-assistant', 'cbfa_popup_section');
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
// 1.5 ADMIN ASSET ENQUEUE FOR MEDIA UPLOADER
// ---------------------------------------------------------------------

/**
 * Enqueues the WordPress media uploader and our custom admin JS script.
 */
function cbfa_enqueue_admin_assets($hook) {
    // Only load on our plugin settings page
    if ('toplevel_page_chatbase-assistant' !== $hook) {
        return;
    }
    
    // Enqueue WordPress Media Uploader scripts and styles
    wp_enqueue_media();

    // Enqueue a dedicated JS file to handle the image upload logic
    wp_enqueue_script(
        'cbfa-admin-media', 
        CBFA_PLUGIN_URL . 'assets/elifin-ai-admin.js', 
        array('jquery'), 
        '1.0.5', 
        true
    );

    // Pass the plugin URL to the admin script for default image path handling
    wp_localize_script(
        'cbfa-admin-media',
        'cbfa_admin_data',
        array(
            // Assuming default-agent.png is in the assets folder
            'default_image_url' => CBFA_PLUGIN_URL . 'assets/default-agent.png', 
        )
    );
}
add_action('admin_enqueue_scripts', 'cbfa_enqueue_admin_assets');


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

    // Retrieve initial messages, split by newline, and clean up empty lines
    $raw_messages = get_option('cbfa_initial_messages', "👋 Hi there! Ask me anything about our products.");
    $initial_messages = array_filter(
        array_map('trim', explode("\n", $raw_messages)),
        'strlen'
    );
    // Ensure there is at least one default message if the setting is empty
    if (empty($initial_messages)) {
        $initial_messages = array("👋 Hi there! Ask me anything about our products.");
    }
    
    // Retrieve NEW Popup Control Settings
    $popup_delay = (int) get_option('cbfa_popup_delay', 3); // Default 3 seconds
    $popup_duration = (int) get_option('cbfa_popup_duration', 6); // Default 6 seconds
    $popup_trigger = get_option('cbfa_popup_trigger', 'new_user'); // Default to new_user

    // Enqueue the main front-end script
    wp_enqueue_script(
        'cbfa-frontend-script',
        CBFA_PLUGIN_URL . 'assets/elifin-ai-frontend.js', 
        array('jquery'),
        '1.0.5', // Bumping version for cache bust and new logic
        true // Load in the footer for performance
    );

    // Pass configuration data to the JavaScript file
    wp_localize_script(
        'cbfa-frontend-script',
        'cbfa_data',
        array(
            'ajax_url'              => admin_url('admin-ajax.php'),
            'chatbot_id'            => $bot_id,
            'agent_name'            => get_option('cbfa_agent_name') ?: 'EliFin AI Assistant',
            'agent_image_url'       => get_option('cbfa_agent_image_url', ''), 
            'default_agent_image'   => CBFA_PLUGIN_URL . 'assets/default-agent.png', 
            'initial_messages'      => $initial_messages, 
            'popup_delay'           => $popup_delay, // NEW
            'popup_duration'        => $popup_duration, // NEW
            'popup_trigger'         => $popup_trigger, // NEW
            'nonce'                 => wp_create_nonce('chatbase_proxy_nonce') 
        )
    );
    
    // Enqueue the CSS file
    wp_enqueue_style(
        'cbfa-frontend-style',
        CBFA_PLUGIN_URL . 'assets/elifin-ai-frontend.css',
        array(),
        '1.0.5'
    );
}
// Hook for front-end script loading
add_action('wp_enqueue_scripts', 'cbfa_enqueue_frontend_scripts');


// ---------------------------------------------------------------------
// 3. AJAX PROXY INTEGRATION
// ---------------------------------------------------------------------

// The proxy handler is defined in elifin-ai-ajax.php

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