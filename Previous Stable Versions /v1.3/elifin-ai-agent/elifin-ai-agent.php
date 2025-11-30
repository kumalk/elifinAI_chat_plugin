<?php
/**
 * Plugin Name: EliFin AI - Smart AI Chat Agent Service
 * Description: Integrates the EliFin AI Smart Chat Agent (powered by ChatBase) onto your WordPress site. Provided by KumaPix.
 * Version: 1.0.12 
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

// Custom Sanitize function (required for register_setting to accept hex colors)
if (!function_exists('sanitize_hex_color')) {
    function sanitize_hex_color($color) {
        if ('' === $color) return '';
        if (preg_match('|^#([A-Fa-f0-9]{3}){1,2}$|', $color)) return $color;
        return null;
    }
}

// Register settings
function cbfa_register_settings() {
    // --- Core Settings ---
    register_setting('cbfa_options_group', 'cbfa_api_key');
    register_setting('cbfa_options_group', 'cbfa_chatbot_id');
    register_setting('cbfa_options_group', 'cbfa_agent_name');
    register_setting('cbfa_options_group', 'cbfa_initial_messages'); 
    
    // --- Branding Settings ---
    register_setting('cbfa_options_group', 'cbfa_agent_image_url'); 
    register_setting('cbfa_options_group', 'cbfa_button_image_url'); 

    // --- Popup Control Settings ---
    register_setting('cbfa_options_group', 'cbfa_popup_delay', array('sanitize_callback' => 'intval')); 
    register_setting('cbfa_options_group', 'cbfa_popup_duration', array('sanitize_callback' => 'intval')); 
    register_setting('cbfa_options_group', 'cbfa_popup_trigger', array('sanitize_callback' => 'sanitize_text_field'));

    // --- Styling Settings (Colors and Fonts) ---
    register_setting('cbfa_options_group', 'cbfa_primary_color', array('sanitize_callback' => 'sanitize_hex_color'));
    register_setting('cbfa_options_group', 'cbfa_secondary_color', array('sanitize_callback' => 'sanitize_hex_color'));
    
    // NEW COLORS
    register_setting('cbfa_options_group', 'cbfa_agent_name_color', array('sanitize_callback' => 'sanitize_hex_color'));
    register_setting('cbfa_options_group', 'cbfa_header_text_color', array('sanitize_callback' => 'sanitize_hex_color')); // General header text/icons (e.g., Close/Restart)
    
    register_setting('cbfa_options_group', 'cbfa_agent_message_color', array('sanitize_callback' => 'sanitize_hex_color')); // Agent Bubble BG
    register_setting('cbfa_options_group', 'cbfa_user_message_color', array('sanitize_callback' => 'sanitize_hex_color'));   // User Bubble BG
    
    // NEW BUBBLE TEXT COLORS
    register_setting('cbfa_options_group', 'cbfa_agent_bubble_text_color', array('sanitize_callback' => 'sanitize_hex_color')); 
    register_setting('cbfa_options_group', 'cbfa_user_bubble_text_color', array('sanitize_callback' => 'sanitize_hex_color')); 

    register_setting('cbfa_options_group', 'cbfa_font_family', array('sanitize_callback' => 'sanitize_text_field'));
    register_setting('cbfa_options_group', 'cbfa_base_font_size', array('sanitize_callback' => 'sanitize_text_field'));


    // --- Add settings sections for tabs ---
    
    // 1. Configuration Tab
    add_settings_section(
        'cbfa_config_section', 
        'Core API Configuration',
        'cbfa_settings_section_callback', 
        'chatbase-assistant-config' // Page slug for this section
    );
    // 2. Branding Tab (Agent Avatar Only)
    add_settings_section(
        'cbfa_branding_section', 
        'Agent Avatar',
        'cbfa_branding_section_callback', 
        'chatbase-assistant-branding' // Page slug for this section
    );
    // 2.5. New Button Icon Tab
    add_settings_section(
        'cbfa_button_icon_section', 
        'Chat Button Icon',
        'cbfa_button_icon_section_callback', 
        'chatbase-assistant-button-icon' // Page slug for this section
    );
    // 3. Styling Tab
    add_settings_section(
        'cbfa_style_section', 
        'Chat Widget Appearance',
        'cbfa_style_section_callback', 
        'chatbase-assistant-styling'
    );
    // 4. Popups Tab
    add_settings_section(
        'cbfa_popup_section', 
        'Popup and Timing Controls',
        'cbfa_popup_section_callback', 
        'chatbase-assistant-popups'
    );


    // --- Add fields to their respective sections ---
    
    // Configuration Fields
    add_settings_field('cbfa_agent_name_field', 'Agent Name', 'cbfa_agent_name_callback', 'chatbase-assistant-config', 'cbfa_config_section');
    add_settings_field('cbfa_chatbot_id_field', 'Bot ID', 'cbfa_chatbot_id_callback', 'chatbase-assistant-config', 'cbfa_config_section');
    add_settings_field('cbfa_api_key_field', 'API Key', 'cbfa_api_key_callback', 'chatbase-assistant-config', 'cbfa_config_section');
    add_settings_field('cbfa_initial_messages_field', 'Initial Messages', 'cbfa_initial_messages_callback', 'chatbase-assistant-config', 'cbfa_config_section');

    // Branding Fields (Agent Avatar)
    add_settings_field('cbfa_agent_image_field', 'Agent Avatar (Header)', 'cbfa_agent_image_url_callback', 'chatbase-assistant-branding', 'cbfa_branding_section');
    
    // Button Icon Fields (New Tab)
    add_settings_field('cbfa_button_image_field', 'Chat Button Icon', 'cbfa_button_image_url_callback', 'chatbase-assistant-button-icon', 'cbfa_button_icon_section');


    // Styling Fields 
    add_settings_field('cbfa_primary_color_field', 'Primary Color', 'cbfa_primary_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    add_settings_field('cbfa_secondary_color_field', 'Secondary Color', 'cbfa_secondary_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    
    add_settings_field('cbfa_agent_name_color_field', 'Agent Name Color', 'cbfa_agent_name_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    add_settings_field('cbfa_header_text_color_field', 'Header Icons Color', 'cbfa_header_text_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    
    add_settings_field('cbfa_agent_message_color_field', 'Agent Bubble BG', 'cbfa_agent_message_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    add_settings_field('cbfa_agent_bubble_text_color_field', 'Agent Bubble Text Color', 'cbfa_agent_bubble_text_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    
    add_settings_field('cbfa_user_message_color_field', 'User Bubble BG', 'cbfa_user_message_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    add_settings_field('cbfa_user_bubble_text_color_field', 'User Bubble Text Color', 'cbfa_user_bubble_text_color_callback', 'chatbase-assistant-styling', 'cbfa_style_section');

    add_settings_field('cbfa_font_family_field', 'Font Family', 'cbfa_font_family_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    add_settings_field('cbfa_base_font_size_field', 'Base Font Size', 'cbfa_base_font_size_callback', 'chatbase-assistant-styling', 'cbfa_style_section');
    
    // Popup Fields
    add_settings_field('cbfa_popup_delay_field', 'Popup Delay (seconds)', 'cbfa_popup_delay_callback', 'chatbase-assistant-popups', 'cbfa_popup_section');
    add_settings_field('cbfa_popup_duration_field', 'Popup Duration (seconds)', 'cbfa_popup_duration_callback', 'chatbase-assistant-popups', 'cbfa_popup_section');
    add_settings_field('cbfa_popup_trigger_field', 'Popup Visibility', 'cbfa_popup_trigger_callback', 'chatbase-assistant-popups', 'cbfa_popup_section');
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
// 1.5 ADMIN ASSET ENQUEUE FOR MEDIA UPLOADER & TABS
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

    // Enqueue WordPress color picker and our custom admin CSS for tabs/colors
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_style('cbfa-admin-style', CBFA_PLUGIN_URL . 'assets/elifin-ai-admin.css', array(), '1.0.12'); 

    // Enqueue dedicated JS file
    wp_enqueue_script(
        'cbfa-admin-media', 
        CBFA_PLUGIN_URL . 'assets/elifin-ai-admin.js', 
        array('jquery', 'wp-color-picker'), // Added wp-color-picker dependency
        '1.0.12', 
        true
    );
    
    // Retrieve Primary Color from saved options
    $primary_color = get_option('cbfa_primary_color', '#4f46e5');

    // Pass the plugin URL and PRIMARY COLOR to the admin script
    wp_localize_script(
        'cbfa-admin-media',
        'cbfa_admin_data',
        array(
            'default_agent_image_url' => CBFA_PLUGIN_URL . 'assets/default-agent.png', 
            'default_button_image_url' => CBFA_PLUGIN_URL . 'assets/icon.png', // <-- CHANGED TO PNG
            'primary_color' => $primary_color, // Added primary color here for JS use
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
    if (empty($initial_messages)) {
        $initial_messages = array("👋 Hi there! Ask me anything about our products.");
    }
    
    // Retrieve Settings
    $popup_delay = (int) get_option('cbfa_popup_delay', 3); 
    $popup_duration = (int) get_option('cbfa_popup_duration', 6); 
    $popup_trigger = get_option('cbfa_popup_trigger', 'new_user'); 
    
    // Retrieve Styling Settings
    $style_settings = array(
        'primary_color'             => get_option('cbfa_primary_color', '#4f46e5'), 
        'secondary_color'           => get_option('cbfa_secondary_color', '#6366f1'), 
        
        'agent_name_color'          => get_option('cbfa_agent_name_color', '#ffffff'), 
        'header_text_color'         => get_option('cbfa_header_text_color', '#ffffff'), 
        
        'agent_message_color'       => get_option('cbfa_agent_message_color', '#e5e7eb'), 
        'user_message_color'        => get_option('cbfa_user_message_color', '#6366f1'), 
        
        'agent_bubble_text_color'   => get_option('cbfa_agent_bubble_text_color', '#1f2937'), 
        'user_bubble_text_color'    => get_option('cbfa_user_bubble_text_color', '#ffffff'), 

        'font_family'               => get_option('cbfa_font_family', "'Inter', sans-serif"),
        'base_font_size'            => get_option('cbfa_base_font_size', '14px'),
    );


    // Enqueue the main front-end script
    wp_enqueue_script(
        'cbfa-frontend-script',
        CBFA_PLUGIN_URL . 'assets/elifin-ai-frontend.js', 
        array('jquery'),
        '1.0.12', 
        true 
    );

    // Pass configuration data to the JavaScript file
    wp_localize_script(
        'cbfa-frontend-script',
        'cbfa_data',
        array_merge(
            array(
                'ajax_url'              => admin_url('admin-ajax.php'),
                'chatbot_id'            => $bot_id,
                'agent_name'            => get_option('cbfa_agent_name') ?: 'EliFin AI Assistant',
                'agent_image_url'       => get_option('cbfa_agent_image_url', ''), 
                'default_agent_image'   => CBFA_PLUGIN_URL . 'assets/default-agent.png', 
                'initial_messages'      => $initial_messages, 
                'popup_delay'           => $popup_delay,
                'popup_duration'        => $popup_duration,
                'popup_trigger'         => $popup_trigger,
                'button_image_url'      => get_option('cbfa_button_image_url'), 
                'default_button_image'  => CBFA_PLUGIN_URL . 'assets/icon.png', // <-- CHANGED TO PNG
                'nonce'                 => wp_create_nonce('chatbase_proxy_nonce')
            ),
            $style_settings // Merged new style settings
        )
    );
    
    // Enqueue the CSS file
    wp_enqueue_style(
        'cbfa-frontend-style',
        CBFA_PLUGIN_URL . 'assets/elifin-ai-frontend.css',
        array(),
        '1.0.12'
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