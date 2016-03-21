<?php
session_start();
if (!array_key_exists("session_name", $_SESSION) || !$_SESSION['session_name']) {
    // from http://stackoverflow.com/questions/199099/how-to-manage-a-redirect-request-after-a-jquery-ajax-call
    echo (json_encode (array ("redirect" => "./login.html")));
}
else {

    include('../../connectionString.php');

    try {
        //open connection
        $dbconn = pg_connect($connectionString);

        // Get previous acquisitions from DB - use prepared statement in case somehow $SESSION["user_id"] is dodgy
        //$getAcqs = pg_prepare($dbconn, "getAcqs", "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from acquisition JOIN users ON (acquisition.uploadedby = users.id) where uploadedby = $1 ORDER BY upload_date DESC");
        $getAcqs = pg_prepare($dbconn, "getAcqs", "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User from acquisition JOIN users ON (acquisition.uploadedby = users.id) ORDER BY acquisition.id DESC");
        $result = pg_execute($dbconn, "getAcqs", array());
        //$result = pg_execute($dbconn, "getAcqs", array($_SESSION['user_id']));
        $previousAcqui = resultsAsArray ($result);

        // Get previous sequences from DB - etc etc
        //$getSeqs = pg_prepare($dbconn, "getSeqs", "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from sequence_file JOIN users ON (sequence_file.uploadedby = users.id) where uploadedby = $1 ORDER BY upload_date DESC");
        $getSeqs = pg_prepare($dbconn, "getSeqs", "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, users.user_name AS User from sequence_file JOIN users ON (sequence_file.uploadedby = users.id) ORDER BY upload_date DESC");
        $result = pg_execute($dbconn, "getSeqs", array());
        //$result = pg_execute($dbconn, "getSeqs", array($_SESSION['user_id']));
        $previousSeq = resultsAsArray($result);

        // Get crosslinkers from DB
        //$query = "SELECT id, name, is_default from crosslinker WHERE name NOT LIKE '#%' ORDER by name;";
        $query = "SELECT id, name, is_default from crosslinker ORDER by name;";
        $xlinkers = resultsAsArray(pg_query($query));

        // Get enzymes from DB
        $query = "SELECT id, name, is_default from enzyme ORDER by name;";
        $enzymes = resultsAsArray(pg_query($query));

        // Get modifications from DB
        //$query = "SELECT id, name, is_default_fixed, is_default_var from modification WHERE name NOT LIKE '#%' ORDER by name;";
        $query = "SELECT id, name, is_default_fixed, is_default_var from modification ORDER by name;";
        $mods = resultsAsArray(pg_query($query));

        // Get ions from DB
        //$query = "SELECT id, name, is_default from ion WHERE name NOT LIKE '#%' ORDER by name;";
        $query = "SELECT id, name, is_default from ion ORDER by name;";
        $ions = resultsAsArray(pg_query($query));

        // Get losses from DB
        //$query = "SELECT id, name, is_default from loss WHERE name NOT LIKE '#%' ORDER by name;";
        $query = "SELECT id, name, is_default from loss ORDER by name;";
        $losses = resultsAsArray(pg_query($query));

        // Get basedir for file uploads
        $query = "SELECT setting FROM base_setting WHERE name='base_directory_path';";
        $baseDir = pg_fetch_row(pg_query($query))[0];

        // Store this server side 'cos we don't need it client side
        $_SESSION["baseDir"] = $baseDir;

        //close connection
        pg_close($dbconn);

        echo json_encode (array(
            "xlinkers" => $xlinkers, "enzymes" => $enzymes, "previousAcqui" => $previousAcqui, "previousSeq" => $previousSeq,
            "ions" => $ions, "modifications" => $mods, "losses" => $losses
        ));
    }
    catch (Exception $e) {
        echo (json_encode (array ("error" => $e->getMessage())));
    }
}

// Turn result set into array of objects
function resultsAsArray($result) {
    $arr = array();
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        $arr[] = $line;
    }

    // free resultset
    pg_free_result ($result);

    return $arr;
}

?>