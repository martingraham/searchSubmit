<?php
    session_start();

    include 'utils.php';

    $defaults = getGlobalDefaults ();
    echo json_encode ($defaults);
?>