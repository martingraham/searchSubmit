<?php
session_start();
if (!array_key_exists("session_name", $_SESSION) || !$_SESSION['session_name']) {
    header("location:login.html");
    exit;
}

$pageName = "New Search";

include('../../connectionStringSafe.php');

try {
    //open connection
    $dbconn = pg_connect($connectionString);

    // Get previous acquisitions from DB
    $query = "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from acquisition JOIN users ON (acquisition.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
    $previousAcqui = resultsAsArray(pg_query($query));

    // Get previous acquisitions from DB
    $query = "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from sequence_file JOIN users ON (sequence_file.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
    $previousSeq = resultsAsArray(pg_query($query));

    // Get crosslinkers from DB
    $query = "SELECT id, name, is_default from crosslinker WHERE name NOT LIKE '#%' ORDER by name;";
    $xlinkers = resultsAsArray(pg_query($query));

    // Get enzymes from DB
    $query = "SELECT id, name, is_default from enzyme ORDER by name;";
    $enzymes = resultsAsArray(pg_query($query));

    // Get modifications from DB
    $query = "SELECT id, name, is_default_fixed, is_default_var from modification WHERE name NOT LIKE '#%' ORDER by name;";
    $mods = resultsAsArray(pg_query($query));

    // Get ions from DB
    $query = "SELECT id, name, is_default from ion WHERE name NOT LIKE '#%' ORDER by name;";
    $ions = resultsAsArray(pg_query($query));

    // Get losses from DB
    $query = "SELECT id, name, is_default from loss WHERE name NOT LIKE '#%' ORDER by name;";
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

// Printing results in HTML, assuming id and name field in result set
function resultsAsArray($result) {
    //echo "<p>".$result."</p>";
    $arr = array();
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        $arr[] = $line;
    }
    
    // free resultset
    pg_free_result ($result);
    
    return $arr;
}

?>