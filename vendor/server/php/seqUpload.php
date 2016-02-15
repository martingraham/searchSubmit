<?php
/*
 * jQuery File Upload Plugin PHP Example
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

include '../../../php/ChromePhp.php';
ChromePhp::log('Hello console!');
ChromePhp::log(json_encode($_POST));

$options = array('upload_dir' => $_POST["newSeqID"]."/", 'upload_url' => $_POST["newSeqID"]."/");
ChromePhp::log($options);

error_reporting(E_ALL | E_STRICT);
require('UploadHandler.php');
$upload_handler = new UploadHandler ($options);
