<?php
session_start();
if (empty ($_SESSION['session_name'])) {
    // from http://stackoverflow.com/questions/199099/how-to-manage-a-redirect-request-after-a-jquery-ajax-call
    echo (json_encode (array ("redirect" => "./login.html")));
}
else {

    include('../../connectionString.php');
    include('utils.php');

    try {
        //open connection
        $dbconn = pg_connect($connectionString);
        
        // Get user rights from database
        $userRights = getUserRights ($dbconn, $_SESSION["user_id"]);
        $_SESSION["canAddNewSearch"] = $userRights["canAddNewSearch"];
        $canSeeAll = $userRights["canSeeAll"];
        
        if (!$userRights["canAddNewSearch"]) {
            echo json_encode (array ("redirect" => 'login.html'));
        } else {
            $possibleValues = array();
        
            $getFieldValues = array (
                "enzymes" => array ("q" => "SELECT id, name from enzyme ORDER by name"),
                "ions" => array ("q" => "SELECT id, name from ion ORDER by name"),
                "xlinkers" => array ("q" => "SELECT id, name from crosslinker ORDER by name"),
                "losses" => array ("q" => "SELECT id, name from loss ORDER by name"),
                "modifications" => array ("q" => "SELECT id, name from modification ORDER by name"),
                "previousAcqui" => $canSeeAll 
                    ? array ("q" => "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User FROM acquisition JOIN users ON (acquisition.uploadedby = users.id) ORDER BY acquisition.id DESC")
                    : array ("q" => "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User FROM acquisition JOIN users ON (users.id = $1 AND acquisition.uploadedby = users.id) ORDER BY acquisition.id DESC",
                                 "params" => [$_SESSION["user_id"]] )
                ,
                "previousSeq" => $canSeeAll 
                    ? array ("q" => "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User, file_name as file FROM sequence_file JOIN users ON (sequence_file.uploadedby = users.id) ORDER BY upload_date DESC")
                    : array ("q" => "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User, file_name as file FROM sequence_file JOIN users ON (users.id = $1 AND sequence_file.uploadedby = users.id) ORDER BY upload_date DESC",
                             "params" => [$_SESSION["user_id"]] )
                ,
                "filenames" => array ("q" => "SELECT acq_id, name FROM run ORDER by acq_id DESC")
            );

            foreach ($getFieldValues as $key => $value) {
                $query = $value["q"];
                $params = isset($value["params"]) ? $value["params"] : array();
                pg_prepare ($dbconn, $key, $query);
                $result = pg_execute ($dbconn, $key, $params);
                $possibleValues[$key] = resultsAsArray($result);
            }
            
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