<?php
session_start();
include('utils.php');

if (empty ($_SESSION['session_name'])) {
    ajaxLoginRedirect();
}
else {

    include('../../connectionString.php');

    try {
        $type = $_POST["type"];
        if ($type !== "seq") {
            throw new Exception ("Acquisiton file download currently disabled.", 403); // this line prevents acquisition file downloading
        }
        //throw new Exception ("Temporary feature embargo until xi3 release.", 403); // this line prevents any file downloading
        //open connection
        $dbconn = pg_connect($connectionString);
        
        // Get user rights from database
        $userRights = getUserRights ($dbconn, $_SESSION["user_id"]);
        $canSeeAll = $userRights["canSeeAll"];
        
        if (!$userRights["canAddNewSearch"]) {
            ajaxHistoryRedirect("You don't have permission to download this file due to your user role.");  // Shouldn't get here, but still... defensive coding
        } else {
            $datum = $_POST["datum"];
            //error_log (print_r ($datum, true));

            if ($type === "seq") {
                 $seqDownload = pg_prepare($dbconn, "seqDown", "SELECT CONCAT (file_path, '/', file_name) as file, uploadedby FROM sequence_file WHERE id = $1");
                 $result = pg_execute($dbconn, "seqDown", [$datum["id"]]);
                 $files = pg_fetch_all ($result);  // get the newly added row, need it to return to client ui
            } else if ($type === "acq") {
                 $acqDownload = pg_prepare($dbconn, "acqDown", "SELECT run.file_path as file, acquisition.uploadedby FROM run JOIN acquisition ON (acquisition.id = $1 AND run.acq_id = acquisition.id)");
                 $result = pg_execute($dbconn, "acqDown", [$datum["id"]]);
                 $files = pg_fetch_all ($result);  // get the newly added row, need it to return to client ui
            }
            
            if ($canSeeAll || $files[0].uploadedby === $_SESSION["user_id"]) {
                foreach ($files as &$file) {    // use & so $file is passed by reference, so modifications stick
                    $file["exists"] = file_exists ($_SESSION["baseDir"].$file["file"]);
                }
                $goodFiles = array_filter ($files, function ($var) { return $var["exists"]; });
                $_SESSION["downloadQueue"] = array_column ($goodFiles, "file");
                //error_log (print_r ($_SESSION["downloadQueue"], true));
                foreach ($files as &$file) {    // wipe out filename data so it doesn't get returned to browser
                    $file["file"] = "";
                }
                echo json_encode ($files);
            } else {
                $date = date("d-M-Y H:i:s");
                echo (json_encode (array ("error" => "You don't have permission to download this file(s)<br>".$date, "errorType" => "Permission Denied")));
            }
        }
        
        //close connection
        pg_close($dbconn);
    }
    catch (Exception $e) {
        //error_log (print_r ($e->getMessage(), true));
        $errorMsg = $e->getCode() === 403 ? $e->getMessage() : "Error when querying database for default values";
        $date = date("d-M-Y H:i:s");
        echo (json_encode (array ("error" => $errorMsg."<br>".$date)));
    }
}

?>