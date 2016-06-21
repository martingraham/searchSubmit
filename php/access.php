<?php
    session_start();
    $backTo = isset ($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : "../login.html";
    if (empty ($_SESSION['session_name'])) {
        error_log (print_r ($_SERVER, true));
        header("Location: ".$backTo);
    }
    else {
        include('../../connectionString.php');
        include 'utils.php';
        $dbconn = pg_connect($connectionString)
                or die('Could not connect: ' . pg_last_error());
        $userRights = getUserRights ($dbconn, $_SESSION['user_id']);
        error_log (print_r ($userRights, true));
        if ($userRights["canAddNewSearch"]) {
            header("Location: ../submitSearch.html");
        } else {
             header("Location: ".$backTo);
        }
    }
?>