jQuery(document).ready(function($) {
    // Access the localized data containing the default image URLs and primary color
    const DEFAULT_AGENT_IMAGE_URL = typeof cbfa_admin_data !== 'undefined' ? cbfa_admin_data.default_agent_image_url : '';
    const DEFAULT_BUTTON_IMAGE_URL = typeof cbfa_admin_data !== 'undefined' ? cbfa_admin_data.default_button_image_url : '';
    
    // CRITICAL FIX: Use the primary color passed from the PHP localization data for the broken icon fix
    const PRIMARY_COLOR = typeof cbfa_admin_data !== 'undefined' ? cbfa_admin_data.primary_color : '#4f46e5'; 

    // Initialize WordPress Color Picker
    $('.cbfa-color-field').wpColorPicker();

    /**
     * Handles the click event for the Upload/Change Avatar or Icon button.
     */
    $('.cbfa-upload-button').on('click', function(e) {
        e.preventDefault();
        
        const $button = $(this);
        const target = $button.data('target'); // 'agent' or 'button'
        
        // Define selectors based on the target (ensuring absolute precision)
        const inputId = '#cbfa_' + target + '_image_url';
        const previewId = '#cbfa_' + target + '_preview_img';
        const removeButtonSelector = `.cbfa-remove-button[data-target="${target}"]`;
        const uploadButtonSelector = `.cbfa-upload-button[data-target="${target}"]`;

        const buttonText = target === 'agent' ? 'Avatar' : 'Icon';

        // Ensure fresh mediaUploader instance
        let mediaUploader = wp.media({
            title: `Choose ${buttonText}`,
            button: {
                text: `Use this ${buttonText.toLowerCase()}`
            },
            multiple: false, 
            library: {
                // Explicitly filter for image files. VITAL for PNG support.
                type: 'image' 
            }
        });

        // When an image is selected, run a callback.
        mediaUploader.on('select', function() {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            
            // --- DEBUG: Output targeted elements on selection ---
            console.log(`[CBFA Admin] SELECTED. Target ID: ${target}`);
            console.log(`[CBFA Admin] Targeting Input: ${inputId}`);
            console.log(`[CBFA Admin] Targeting Preview: ${previewId}`);
            console.log(`[CBFA Admin] Selected URL: ${attachment.url}`);


            // Set the image URL to the correct input field
            $(inputId).val(attachment.url);

            // Update the correct preview image source, adding a cache-buster (?t=...) to force browser refresh.
            $(previewId).attr('src', attachment.url + '?t=' + new Date().getTime());
            
            // Show the correct remove button and update the upload button text
            $(removeButtonSelector).show();
            $(uploadButtonSelector).text(`Change ${buttonText}`);
            
            // CRITICAL FIX: Ensure button icon preview loses its background color if a custom image is uploaded
            if (target === 'button') {
                $(previewId).css('background', 'none');
            }
        });

        // Open the uploader dialog
        mediaUploader.open();
    });

    /**
     * Handles the click event for the Remove Avatar/Icon button.
     */
    $('.cbfa-remove-button').on('click', function(e) {
        e.preventDefault();
        
        const $button = $(this);
        const target = $button.data('target'); // 'agent' or 'button'
        
        // Define selectors based on the target
        const inputId = '#cbfa_' + target + '_image_url';
        const previewId = '#cbfa_' + target + '_preview_img';
        const removeButtonSelector = `.cbfa-remove-button[data-target="${target}"]`;
        const uploadButtonSelector = `.cbfa-upload-button[data-target="${target}"]`;

        const buttonText = target === 'agent' ? 'Avatar' : 'Icon';
        
        // CRITICAL FIX: Retrieve the default URL from the image's data attribute
        const defaultImageUrl = $(previewId).data('default-url');
        
        // Clear the hidden input field
        $(inputId).val('');
        
        // Reset the correct preview to the default image URL (with cache-buster)
        $(previewId).attr('src', defaultImageUrl + '?t=' + new Date().getTime());
        
        // Hide the correct remove button and reset the upload button text
        $(removeButtonSelector).hide();
        $(uploadButtonSelector).text(`Select ${buttonText}`);

        // CRITICAL FIX: Re-apply background color for the default button icon (if it's the button target)
        if (target === 'button') {
             // Re-apply the localized primary color background for the default button icon, ensuring the PNG is visible.
             $(previewId).css('background', PRIMARY_COLOR);
        }
    });
});