<?php
    session_start();
    include ('utils.php');
    ajaxBootOut();

	include 'getDefaults.php';
	include('../../connectionString.php');

	$sidPlusRandom = $_GET["sid"];
	//error_log (print_r ($_GET, true));

	$dbconn = pg_connect($connectionString);

 	if ($sidPlusRandom === "global") {
		$defaults = getGlobalDefaults ($dbconn);
		echo json_encode ($defaults);
	}
	else if ($sidPlusRandom === "last") {
		$sid = getLastSearchID ($dbconn);
		if ($sid != null) {
			$defaults = getDefaults ($dbconn, $sid);
			echo json_encode ($defaults);
		} else {
			$date = date("d-M-Y H:i:s");
			echo json_encode (array("error" => array ("You have made no previous searches", $date)));
		}
	}
	else {
		$sindex = strpos($sidPlusRandom, "-");
		$date = date("d-M-Y H:i:s");
		//error_log (print_r ($sindex, true));

		if ($sindex !== false){
			$sid = substr ($sidPlusRandom, 0, $sindex);
			$random = substr ($sidPlusRandom, $sindex + 1);
			$trueRandom = getRandomString ($dbconn, $sid);

			if ($trueRandom !== null) {
				if ($trueRandom === $random) {
					$defaults = getDefaults ($dbconn, $sid);
					echo json_encode ($defaults);
				} else {
					echo json_encode (array("error" => array ("Random key '".$random."' does not match for Search ID ".$sid.".", $date)));
				}
			} else {
				echo json_encode (array("error" => array ("No Search with ID ".$sid." found.", $date), "errorType" => "No Such Search Exists"));
			}
		} else {
			echo json_encode (array("error" => array ("Malformed URL value '".$sidPlusRandom."'. Should be Search ID then random key broken into four sets of five digits, all separated by hyphens. e.g. 10003-47384-43984-12121-23232", $date), "errorType" => "Malformed URL Parameter Error"));
		}
	}

	pg_close($dbconn);
?>