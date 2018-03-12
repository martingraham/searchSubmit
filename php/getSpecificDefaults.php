<?php
    session_start();
    include ('utils.php');
    ajaxBootOut();

	include 'getDefaults.php';
	include('../../connectionString.php');

	$dbconn = pg_connect($connectionString);
	$sidPlusRandom = $_POST["sid"];

	$sindex = strpos($sidPlusRandom, "-");
	//error_log (print_r ($sindex, true));

	if ($sindex !== false){
		$sid = substr ($sidPlusRandom, 0, $sindex);
		$random = substr ($sidPlusRandom, $sindex + 1);
		$trueRandom = getRandomString ($dbconn, $sid);
		if ($trueRandom === $random) {
			$defaults = getDefaults ($dbconn, $sid);
			pg_close($dbconn);
			echo json_encode ($defaults);
		} else {
			pg_close($dbconn);
			$date = date("d-M-Y H:i:s");
			echo json_encode (array("error" => array ("Random string does not match for search ".$sid, $date)));
		}
	} else {
		pg_close($dbconn);
		$date = date("d-M-Y H:i:s");
		echo json_encode (array("error" => array ("Search id ".$sidPlusRandom." not found", $date)));
	}
?>