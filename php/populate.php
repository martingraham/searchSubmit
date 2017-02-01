<?php
session_start();
include('utils.php');
if (empty ($_SESSION['session_name'])) {
    ajaxLoginRedirect();
}
else {

    include('../../connectionString.php');

    try {
        //open connection
        $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());
        
        // Get user rights from database
        $userRights = getUserRights ($dbconn, $_SESSION["user_id"]);
        $_SESSION["canAddNewSearch"] = $userRights["canAddNewSearch"];
        $canSeeAll = $userRights["canSeeAll"];
        $isSuperUser = $userRights["isSuperUser"];
        
        if (!$userRights["canAddNewSearch"]) {
            ajaxHistoryRedirect ($userRights["searchDenyReason"]);
        } else {
            $possibleValues = array();
            
            $seeAllCond = $canSeeAll ? "" : "users.id = $1 AND ";   // condition where only stuff for 1 user is returned (i.e. can't see other people's)
            $privacyCond = $canSeeAll && !$isSuperUser ? "WHERE private = 'false' OR users.id = $1 " : "";   // put a condition in where non-superusers don't see other users stuff marked as private
            $pAcquiStr = "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User FROM acquisition JOIN users ON (".$seeAllCond."acquisition.uploadedby = users.id) ".$privacyCond."ORDER BY acquisition.id DESC";
            $pSeqStr = "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User, file_name as file FROM sequence_file JOIN users ON (".$seeAllCond."sequence_file.uploadedby = users.id) ".$privacyCond."ORDER BY upload_date DESC";
        
            $getFieldValues = array (
                "enzymes" => array ("q" => "SELECT id, name from enzyme ORDER by name"),
                "ions" => array ("q" => "SELECT id, name from ion ORDER by name"),
                "xlinkers" => array ("q" => "SELECT id, mass, name from crosslinker ORDER by name"),
                "losses" => array ("q" => "SELECT id, name from loss ORDER by name"),
                "modifications" => array ("q" => "SELECT id, name from modification ORDER by name"),
                "previousAcqui" => $isSuperUser 
                    ? array ("q" => $pAcquiStr)
                    : array ("q" => $pAcquiStr, "params" => [$_SESSION["user_id"]])
                ,
                "previousSeq" => $isSuperUser 
                    ? array ("q" => $pSeqStr)
                    : array ("q" => $pSeqStr, "params" => [$_SESSION["user_id"]])
                ,
                "filenames" => array ("q" => "SELECT acq_id, name FROM run ORDER by acq_id DESC"),
                "username" => array ("q" => "SELECT user_name FROM users WHERE id = $1", "params" => [$_SESSION["user_id"]]),
            );

            foreach ($getFieldValues as $key => $value) {
                $query = $value["q"];
                $params = isset($value["params"]) ? $value["params"] : array();
                pg_prepare ($dbconn, $key, $query);
                $result = pg_execute ($dbconn, $key, $params);
                $possibleValues[$key] = resultsAsArray($result);
            }
            
            // Add user rights so interface can provide appropriate labelling
            $possibleValues["userRights"] = $userRights;
            $possibleValues["username"] = $possibleValues["username"][0]["user_name"];
            
            // Get basedir for file uploads
            $query = "SELECT setting FROM base_setting WHERE name='base_directory_path';";
            $baseDir = pg_fetch_row(pg_query($query))[0];

            // Store this server side 'cos we don't need it client side
            $_SESSION["baseDir"] = $baseDir;
            
            echo json_encode ($possibleValues);
        }
        
        //close connection
        pg_close($dbconn);
    }
    catch (Exception $e) {
        $date = date("d-M-Y H:i:s");
        echo (json_encode (array ("error" => "Error when querying database for default values<br>".$date)));
    }
}

?>