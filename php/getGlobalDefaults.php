<?php
    session_start();

    include ('utils.php');
	ajaxBootOut();

	include 'getDefaults.php';
	include('../../connectionString.php');

	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());
	$defaults = getGlobalDefaults ($dbconn);
	pg_close($dbconn);

	echo json_encode ($defaults);
?>