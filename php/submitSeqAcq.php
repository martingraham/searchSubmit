<?php
session_start();

include('../../vendor/php/utils.php');
ajaxBootOut();

include('../../connectionString.php');

$userID = $_SESSION['user_id'];
$username = $_SESSION['session_name'];

$paramFieldNameMap = array (
	"name" => array ("required" => true),
	"filenames" => array ("required" => true),
);

// Check everything necessary is in the bag
$allGood = true;

foreach ($paramFieldNameMap as $key => $value) {
	$arrval = $_POST[$key];
                if (!is_array ($arrval)) {
                        $arrval = array($arrval);   // single item array
                }
	$count = count($arrval);
	if (($count == 0 || ($count == 1 && strlen($arrval[0]) == 0)) && $value["required"] == true) {
		$allGood = false;
	}

	else if (array_key_exists ("validate", $value)) {
		if (!is_array ($arrval)) {
			$arrval = array($arrval);   // single item array
		}
		foreach ($arrval as $index => $val) {
			$valid = filter_var ($val, $value["validate"]);
			if ($valid === false) {
				$allGood = false;
			}
		}  
	}
}



$filesExist = true;
$uploadTSKey = $_POST["type"]."UploadTimeStamp".$_POST["tabID"];
if ($allGood) {
	// test if files are actually present, and these variables are available outside this bracket scope
	// http://php.net/manual/en/language.variables.scope.php#105925
	$filenames = $_POST["filenames"];
	$saneName = normalizeString1 ($_POST["name"]);   // sanitise user-supplied acq/seq name, same as in clmsupload.php
	$tstampname = $saneName.$_SESSION[$uploadTSKey];
	$normUsername = normalizeString1 ($username);
	$baseDir = $_SESSION["baseDir"];
	$folder = ($_POST["type"] == "acq") ? "xi/users/".$normUsername."/".$tstampname : "xi/sequenceDB/".$tstampname;

	foreach ($filenames as $index => $val) {
		if (!file_exists ($baseDir.$folder."/".$val)) {
			$filesExist = false;
		}
	}
}


//if (false) {    // for error testing
if ($allGood && $filesExist) {
	//open connection
	$dbconn = pg_connect($connectionString)
			or die('Could not connect: ' . pg_last_error());

	// little bobby tables - https://xkcd.com/327/ 
	try {
		pg_query("BEGIN") or die("Could not start transaction\n");

		if ($_SESSION["canAddNewSearch"]) {

			$isPrivateSearch = isset($_POST["isPrivateSearch"]) && ($_POST["isPrivateSearch"] == "true") ? "true" : "false";

			if ($_POST["type"] == "acq") {
				$acqAdd = pg_prepare($dbconn, "acqAdd",
			"INSERT INTO acquisition (uploadedby, name, upload_date, private) VALUES ($1, $2, NOW(), $3) RETURNING id, name AS NAME, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date");
				$result = pg_execute($dbconn, "acqAdd", [$userID, $tstampname, $isPrivateSearch]);
				$returnRow = pg_fetch_assoc ($result); // return the inserted row (or selected parts thereof)
				$returnRow["user"] = $username; // Add the username (will be username as this user added the row)
				$returnRow["files"] = $filenames;
				$acqID = $returnRow["id"];

				 $runAdd = pg_prepare($dbconn, "runAdd",
			"INSERT INTO run (acq_id, run_id, name, file_path) VALUES ($1, $2, $3, $4)");
				foreach ($filenames as $index => $val) {
					$result = pg_execute($dbconn, "runAdd", [$acqID, $index+1, $val, $folder."/".$val]);
				}

				$returnID = $acqID;
			} 
			else if ($_POST["type"] == "seq") {
				$seqAdd = pg_prepare($dbconn, "seqAdd",
			"INSERT INTO sequence_file (uploadedby, name, file_name, file_path, private, upload_date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name AS Name, to_char(upload_date, 'YYYY-MM-DD HH24:MI') AS Date, file_name as file");
				$result = pg_execute($dbconn, "seqAdd", [$userID, $tstampname, $filenames[0], $folder, $isPrivateSearch]);
				$returnRow = pg_fetch_assoc ($result);  // get the newly added row, need it to return to client ui
				$returnRow["user"] = $username; // Add the username (will be username as this user added the row)
			} 

			 pg_query("COMMIT");
			 $_SESSION[$uploadTSKey] = null;
			 //error_log(print_r ($_SESSION, true));
			 echo (json_encode(array ("status"=>"success", "newRow"=>$returnRow)));
		} else {
			 pg_query("ROLLBACK");
			ajaxHistoryRedirect ("Your user role doesn't have the permissions to upload sequence or acquisition files."); // if user not permitted to enter seq/acqs
		}
	} catch (Exception $e) {
		 pg_query("ROLLBACK");
		 $date = date("d-M-Y H:i:s");
		 $_SESSION[$uploadTSKey] = null;
		 echo (json_encode(array ("status"=>"fail", "error"=>"An Error occurred when inserting the new sequences/acquisitions into the database<br>".$date)));
	}

	//close connection
	pg_close($dbconn);
}
else {
	$_SESSION[$uploadTSKey] = null;
	$emsg = $allGood ? "" : "Missing required fields for sequence / acquisition insert<br>";
	$emsg = $filesExist ? $emsg : $emsg."Supposedly uploaded files are not present on the server<br>";
	$etype = $filesExist ? "Parameter Input Error" : "Upload Error";
	$date = date("d-M-Y H:i:s");
	echo (json_encode(array ("status"=>"fail", "error"=> $emsg.$date, "errorType"=>$etype)));
}
?>
