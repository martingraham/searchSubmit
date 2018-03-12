<?php
session_start();
include('utils.php');

ajaxBootOut ();

include('../../connectionString.php');
//open connection
$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

try {
	pg_query("BEGIN") or die("Could not start transaction\n");

	$userID = $_SESSION['user_id'];
	$username = $_SESSION['session_name'];

	$newPOST = array_map ('normalizeString2', $_POST);
	//error_log (print_r ($newPOST, true));

	$preparedStatementTexts = array (
		"addCrosslinker" => "INSERT INTO crosslinker (name, mass, is_decoy, description, is_default) VALUES ($1, $2, $3, $4, FALSE) RETURNING id",
	);

	if ($_SESSION["canSeeAll"]) {
		// little bobby tables - https://xkcd.com/327/
		// Add parameter_set values to db
		$result = pg_prepare($dbconn, "crosslinkerAdd", $preparedStatementTexts["addCrosslinker"]);
		$result = pg_execute($dbconn, "crosslinkerAdd", [$newPOST["name"], $newPOST["mass"], $newPOST["isDecoy"], $newPOST["description"]]);
		$crosslinkerIDRow = pg_fetch_assoc ($result); // get the newly added parameter id
		$crosslinkerID = $crosslinkerIDRow["id"];

		pg_query("COMMIT");

		echo (json_encode (array ("status"=>"success", "result"=>array("name" => $newPOST["name"], "mass" => $newPOST["mass"], "id" => $crosslinkerID, "is_decoy" => $newPOST["isDecoy"], "description" => $newPOST["description"]))));
	} else {
		pg_query("ROLLBACK");
		echo (json_encode(array ("status"=>"fail", "error"=> "You don't have permission to add a new crosslinker.<br>".$date)));
		ajaxHistoryRedirect ("");    // if user not permitted to enter seq/acqs
	}
} catch (Exception $e) {
	pg_query("ROLLBACK");
	$date = date("d-M-Y H:i:s");
	echo (json_encode(array ("status"=>"fail", "error"=> "An Error occurred when trying to submit the crosslinker to the database<br>".$date)));
}

//close connection
pg_close($dbconn);


?>