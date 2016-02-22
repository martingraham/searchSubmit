<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
}

$pageName = "New Search";

include('../../connectionString.php');

//open connection
$dbconn = pg_connect($connectionString)
       or die('Could not connect: ' . pg_last_error());

// Get previous acquisitions from DB
$query = "SELECT acquisition.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from acquisition JOIN users ON (acquisition.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$previousAcqui = resultsAsArray($result);

// Get previous acquisitions from DB
$query = "SELECT sequence_file.id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from sequence_file JOIN users ON (sequence_file.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$previousSeq = resultsAsArray($result);

// Get crosslinkers from DB
$query = "SELECT id, name from crosslinker WHERE name NOT LIKE '#%' ORDER by name;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$xlinkers = resultsAsArray($result);

// Get enzymes from DB
$query = "SELECT id, name from enzyme ORDER by name;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$enzymes = resultsAsArray($result);

// Get modifications from DB
$query = "SELECT id, name from modification WHERE name NOT LIKE '#%' ORDER by name;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$mods = resultsAsArray($result);

// Get ions from DB
$query = "SELECT id, name from ion WHERE name NOT LIKE '#%' ORDER by name;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$ions = resultsAsArray($result);

// Get losses from DB
$query = "SELECT id, name from loss WHERE name NOT LIKE '#%' ORDER by name;";
$result = pg_query($query) or die('Query failed: ' . pg_last_error());
$losses = resultsAsArray($result);


//close connection
pg_close($dbconn);

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

echo json_encode (array(
    "xlinkers" => $xlinkers, "enzymes" => $enzymes, "previousAcqui" => $previousAcqui, "previousSeq" => $previousSeq,
    "ions" => $ions, "modifications" => $mods, "losses" => $losses
));

?>