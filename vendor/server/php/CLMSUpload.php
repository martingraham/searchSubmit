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

include '../../../php/ChromePhp.php';
ChromePhp::log('Hello console!');
ChromePhp::log(json_encode($_POST));
ChromePhp::log(json_encode($_SESSION));

// from http://stackoverflow.com/questions/2021624/string-sanitizer-for-filename

function normalizeString ($str = '')
{
    $str = filter_var ($str, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW);
    $str = preg_replace('/[\"\*\/\:\<\>\?\'\|]+/', ' ', $str);
    $str = html_entity_decode( $str, ENT_QUOTES, "utf-8" );
    $str = htmlentities($str, ENT_QUOTES, "utf-8");
    $str = preg_replace("/(&)([a-z])([a-z]+;)/i", '$2', $str);
    $str = str_replace(' ', '-', $str);
    $str = rawurlencode($str);
    $str = str_replace('%', '-', $str);
    return $str;
}

$relFolderPath = "/";
if (array_key_exists ("newAcqID", $_POST)) {
    $userName = $_SESSION["session_name"];
    $userID = $_SESSION["user_id"];
    $userName = normalizeString ($userName);

    $dirName = $_POST["newAcqID"];
    $dirName = normalizeString ($dirName);

    $relFolderPath = "users/".$userName."/".$dirName."/";
}
else if (array_key_exists ("newSeqID", $_POST)) {
    $dirName = $_POST["newSeqID"];
    $dirName = normalizeString ($dirName);

    $relFolderPath = "sequenceDB/".$dirName."/";
}

$options = array('upload_dir' => $relFolderPath, 'upload_url' => $relFolderPath);
ChromePhp::log($options);

error_reporting(E_ALL | E_STRICT);
require('UploadHandler.php');
$upload_handler = new UploadHandler ($options);


