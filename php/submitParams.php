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

echo json_encode ($_POST);


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


?>