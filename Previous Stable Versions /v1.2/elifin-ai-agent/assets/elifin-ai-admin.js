jQuery(document).ready(function($) {
    // Access the localized data containing the default image URL
    // This is passed from elifin-ai-agent.php
    // We assume cbfa_admin_data is defined via wp_localize_script
    const DEFAULT_IMAGE_URL = typeof cbfa_admin_data !== 'undefined' ? cbfa_admin_data.default_image_url : '';
    let mediaUploader;

    /**
     * Handles the click event for the Upload/Change Avatar button.
     */
    $('.cbfa-upload-button').on('click', function(e) {
        e.preventDefault();

        // If the uploader object is already created, reopen it.
        if (mediaUploader) {
            mediaUploader.open();
            return;
        }

        // Create a new media uploader frame
        mediaUploader = wp.media({
            title: 'Choose Agent Avatar',
            button: {
                text: 'Use this image'
            },
            multiple: false // Only allow single image selection
        });

        // When an image is selected, run a callback.
        mediaUploader.on('select', function() {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            
            // Set the image URL to the hidden input field that saves to the database
            $('#cbfa_agent_image_url').val(attachment.url);

            // Update the preview image source
            $('#cbfa_agent_preview_img').attr('src', attachment.url);
            
            // Show the remove button and update the upload button text
            $('.cbfa-remove-button').show();
            $('.cbfa-upload-button').text('Change Avatar');
        });

        // Open the uploader dialog
        mediaUploader.open();
    });

    /**
     * Handles the click event for the Remove Avatar button.
     */
    $('.cbfa-remove-button').on('click', function(e) {
        e.preventDefault();
        
        // Clear the hidden input field, effectively removing the custom image
        $('#cbfa_agent_image_url').val('');
        
        // Reset the preview to the default image URL provided by the PHP localization
        $('#cbfa_agent_preview_img').attr('src', DEFAULT_IMAGE_URL);
        
        // Hide the remove button and reset the upload button text
        $('.cbfa-remove-button').hide();
        $('.cbfa-upload-button').text('Select Avatar');
    });
});