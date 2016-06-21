<?php
    session_start();

    if (empty ($_SESSION['session_name'])) {
        // from http://stackoverflow.com/questions/199099/how-to-manage-a-redirect-request-after-a-jquery-ajax-call
        echo (json_encode (array ("redirect" => "./login.html")));
    }
    else {
        include 'getDefaults.php';
        include('../../connectionString.php');
        
        $dbconn = pg_connect($connectionString);
        $defaults = getGlobalDefaults ($dbconn);
        pg_close($dbconn);

        echo json_encode ($defaults);
    }
?>