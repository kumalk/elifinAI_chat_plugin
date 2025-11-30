<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Handles the server-side proxy request to the external AI API.
 * Uses the securely stored API Key.
 */
function cbfa_proxy_handler() {
    // 1. Verify Security Nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'chatbase_proxy_nonce')) {
        wp_send_json_error(['error' => 'Security check failed.']);
        wp_die();
    }

    // 2. Retrieve Configuration
    $api_key = get_option('cbfa_api_key');
    $bot_id = get_option('cbfa_chatbot_id');
    // NOTE: The external API URL is intentionally hardcoded here and not exposed in settings
    $chatbase_api_url = "https://www.chatbase.co/api/v1/chat"; 

    if (empty($api_key) || empty($bot_id)) {
        wp_send_json_error(['error' => 'EliFin AI Bot ID or API Key is not configured in WordPress settings.']);
        wp_die();
    }

    // 3. Get and Validate Client Payload
    $messages_json = isset($_POST['messages']) ? wp_unslash($_POST['messages']) : '';
    $messages = json_decode($messages_json);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($messages)) {
        wp_send_json_error(['error' => 'Invalid message history format received.']);
        wp_die();
    }

    // Reconstruct the full payload for the external service
    $payload = json_encode([
        'chatbotId' => $bot_id,
        'messages' => $messages,
    ]);

    // 4. Execute the cURL Request to the external service
    $ch = curl_init($chatbase_api_url);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer ' . $api_key,
        'Content-Type: application/json',
        'Content-Length: ' . strlen($payload)
    ));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $curl_error = curl_error($ch);
        curl_close($ch);
        status_header(503); // Service Unavailable
        wp_send_json_error(['error' => 'Server Error: Could not connect to the AI service. Reason: ' . $curl_error]);
        wp_die();
    }

    curl_close($ch);

    // 5. Handle Response
    if ($http_code !== 200) {
        $error_data = json_decode($response, true);
        $error_message = 'AI Service responded with HTTP ' . $http_code;
        if (isset($error_data['message'])) {
            $error_message .= ': ' . $error_data['message'];
        }

        status_header($http_code);
        wp_send_json_error(['error' => $error_message, 'response' => $response]);
        wp_die();
    }

    // Successful response - simply pass it back to the client
    $response_data = json_decode($response, true);
    wp_send_json_success($response_data);
    wp_die();
}