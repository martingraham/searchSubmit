<?php
    session_start();

    include 'utils.php';

    $sid = getLastSearchID ();
    if ($sid != null) {
        $defaults = getDefaults ($sid);
        error_log (print_r($defaults, TRUE));
        echo json_encode ($defaults);
    } else {
        echo json_encode (array("error" => "no_results_returned"));
    }
?>