<?php
session_start();
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
if (!$_SESSION['session_name']) {
    header("location:login.html");
}
 
include '../../../php/utils.php';

// make a timestamp in the session to use in filepaths and name entries (so db php routines can use it) 
//if (! array_key_exists ("uploadTimeStamp", $_SESSION) || $_SESSION["uploadTimeStamp"] == null) {
//error_log(print_r ($_POST, true));
    
date_default_timezone_set ('Europe/Berlin');
$timeStamp = (new DateTime())->format("-H_i_s-d_M_Y");
$baseDir = $_SESSION["baseDir"];

// override php.ini settings so massive files can be uploaded - doesn't work, needs to be in php.ini itself
//ini_set('post_max_size', '4G');
//ini_set('upload_max_filesize', '4G');

if (isset ($_POST["newacqID"])) {
    if (! isset($_SESSION["acqUploadTimeStamp"])) {
        $_SESSION["acqUploadTimeStamp"] = $timeStamp;
    }
    
    $userName = $_SESSION["session_name"];
    $userName = normalizeString ($userName);

    $dirName = $_POST["newacqID"].$_SESSION["acqUploadTimeStamp"];
    $dirName = normalizeString ($dirName);
    
    $folder = $baseDir."xi/users/".$userName."/".$dirName."/";
}
else if (isset($_POST["newseqID"])) {
    if (! isset($_SESSION["seqUploadTimeStamp"])) {
        $_SESSION["seqUploadTimeStamp"] = $timeStamp;
    }
    
    $dirName = $_POST["newseqID"].$_SESSION["seqUploadTimeStamp"];
    $dirName = normalizeString ($dirName);
     
    $folder = $baseDir."xi/sequenceDB/".$dirName."/";
}

$options = array('upload_dir' => $folder, 'upload_url' => $folder);

error_reporting(E_ALL | E_STRICT);
require('UploadHandler.php');
try {
    if ($_SESSION["canAddNewSearch"]) {
        $upload_handler = new UploadHandler ($options);

        if (property_exists ($upload_handler, "response") && array_key_exists ("files", $upload_handler->response)) {
            $resp = $upload_handler->response;
            $upFiles = $resp["files"];
            /*
            foreach ($upFiles as $upFile) {
                if (array_key_exists ("url", $upFile)) {

                    error_log (print_r($upFile, TRUE));
                    //$fperms = fileperms ($upFile->url);
                    //$octal = substr(sprintf('%o', $fperms), -4);
                    //error_log (print_r($octal, TRUE));
                    //$stat = stat ($upFile->url);

                    //$chsucc = chmod ($upFile->url, 0766);

                    //error_log ("chmodok to 0766 ".$chsucc);
                    //$fperms = fileperms ($upFile->url);
                    //$octal = substr(sprintf('%o', $fperms), -4);
                    //error_log (print_r($octal, TRUE));
                    //$stat = stat ($upFile->url);
                    //error_log (print_r($stat, TRUE));
                }
            }
            */
        }
    }
}
catch (Exception $e) {
    error_log (print_r($e, TRUE));
}

?>