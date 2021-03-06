/*
 * jQuery File Upload Plugin JS Example 8.2
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint nomen: true, regexp: true */
/*global $, window, navigator, blueimp */

var submitter = submitter || {};
/**
*   BlueImp uploader function.
*   Passed in options object has keys corresponding to IDs of DOM elements of class "fileupload".
*   These keys point to objects with properties fileTypes, maxFileSize, maxNumberOfFiles which are used to set
*   limits (per fileupload widget) on the files which can be uploaded
*   @namespace submitter
*   @module submitter
*   @function
*   @param myOptions - options
*/
submitter.upload = function (myOptions) {
    'use strict';

    // Initialize the jQuery File Upload widget:
    //    $('#fileupload').fileupload({
    //        // Uncomment the following to send cross-domain cookies:
    //        //xhrFields: {withCredentials: true},
    //        url: ''
    //    });
    
    var perUploadRestriction = function () {
        // previouslyUploaded is class added in template-download
        // with this query here it means previously uploaded files don't count towards the max_file_upload limit
        // only the files in the current upload in preparation
        return this.filesContainer.children().not('.processing').not('.previouslyUploaded').length;
    };
    
    $('.fileupload').each(function () {
        var id = d3.select(this).attr("id");
        var opts = myOptions[id];
        //console.log ("options", opts);
        var r = new RegExp ("(\.|\/)("+opts.fileTypes+")$", "i");
        $(this).fileupload({
            dropZone: $(this),
            //sequentialUploads: true,
            //acceptFileTypes: /(\.|\/)(zip)$/i,
            processQueue: [{
                action: 'validate', 
                acceptFileTypes: r, 
                maxFileSize: opts.maxFileSize, 
                maxNumberOfFiles: opts.maxNumberOfFiles || 1000,
            }],
            getNumberOfFiles: opts.maxNumberOfFiles ? perUploadRestriction : undefined,
        });
    });

    // Enable iframe cross-domain access via redirect option:
    $('#fileupload').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );
};
