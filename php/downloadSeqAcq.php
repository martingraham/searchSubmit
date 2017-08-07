<?php
session_start();
if (empty ($_SESSION['session_name'])) {
    header("location: ../xi3/login.html");
}
else {    
    $index = intval ($_GET["queueIndex"]);
    
    if (isset ($_SESSION['downloadQueue'])) {
        $relPath = $_SESSION['downloadQueue'][$index];
        $file = $_SESSION["baseDir"].$relPath;
        //error_log (print_r ($file, true));
        if ($relPath && file_exists($file)) {
            //ini_set('memory_limit', '1024M'); 
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename='.basename($file));
            header('Pragma: no-cache');
            header('Content-Length: '.filesize($file));
            ob_clean();
            flush();
            //readfile($file);
            readfile_chunked ($file);
        } else {
            return array ("error" => "Sorry, the file cannot be found on the xi server", "errorType" => "File Error");
        }
    } else {
        return array ("error" => "No files queued for download", "errorType" => "Queue Empty");
    }
}

// Chunked reading to stop memory issues
// http://ca2.php.net/manual/en/function.readfile.php#54295
function readfile_chunked ($filename,$retbytes=true) { 
   $chunksize = 1*(1024*1024); // how many bytes per chunk 
   $buffer = ''; 
   $cnt =0; 
   // $handle = fopen($filename, 'rb'); 
   $handle = fopen($filename, 'rb'); 
   if ($handle === false) { 
       return false; 
   } 
   while (!feof($handle)) { 
       $buffer = fread($handle, $chunksize); 
       echo $buffer; 
       ob_flush(); 
       flush(); 
       if ($retbytes) { 
           $cnt += strlen($buffer); 
       } 
   } 
    $status = fclose($handle); 
   if ($retbytes && $status) { 
       return $cnt; // return num. bytes delivered like readfile() does. 
   } 
   return $status; 
} 

?>