<?php
    session_start();
    include ('utils.php');
    ajaxBootOut();

	include 'getDefaults.php';
	include('../../connectionString.php');

	$dbconn = pg_connect($connectionString);
	$sid = getLastSearchID ($dbconn);

	if ($sid != null) {
		$defaults = getDefaults ($dbconn, $sid);
		pg_close($dbconn);
		echo json_encode ($defaults);
	} else {
		pg_close($dbconn);
		$date = date("d-M-Y H:i:s");
		echo json_encode (array("error" => array ("You have made no previous searches", $date)));
	}
?>