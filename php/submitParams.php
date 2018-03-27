<?php
session_start();

include('utils.php');
ajaxBootOut();

$userID = $_SESSION['user_id'];
$username = $_SESSION['session_name'];

$paramFieldNameMap = array (
	"missed_cleavages" => array ("required" => true, "validate" => FILTER_VALIDATE_INT),
	"ms_tol" => array ("required" => true, "validate" => FILTER_VALIDATE_FLOAT),
	"ms_tol_unit" => array ("required" => true),
	"ms2_tol" => array ("required" => true, "validate" => FILTER_VALIDATE_FLOAT),
	"ms2_tol_unit" => array ("required" => true),
	"enzyme" => array ("required" => true, "validate" => FILTER_VALIDATE_INT),
	"notes" => array ("required" => false),
	"customsettings" => array ("required" => false),
	"searchName" => array ("required" => false),
	"acquisitions" => array ("required" => true, "validate" => FILTER_VALIDATE_INT),
	"sequences" => array ("required" => true, "validate" => FILTER_VALIDATE_INT),
	"privateSearch" => array ("required" => false, "validate" => FILTER_VALIDATE_BOOLEAN),
	"xiversion" => array ("required" => true)
);

$paramLinkTableMap = array (
	"crosslinkers" => array ("required" => true),
	"fixedMods" => array ("required" => false, "defaults" => array ("fixed" => "true"), "validate" => FILTER_VALIDATE_INT),
	"varMods" => array ("required" => false, "defaults" => array ("fixed" => "false"), "validate" => FILTER_VALIDATE_INT),
	"ions" => array ("required" => true, "validate" => FILTER_VALIDATE_INT),
	"losses" => array ("required" => false, "validate" => FILTER_VALIDATE_INT),
);

$request_method = strtolower($_SERVER['REQUEST_METHOD']);
$data = null;

switch ($request_method) {
    case 'post':
    case 'put':
        $data = json_decode(file_get_contents('php://input'), true);
    break;
}

/*
error_log (print_r (file_get_contents('php://input'), true));
error_log (print_r ($data, true));
*/




$allUserFieldsMap = array_merge ($paramFieldNameMap, $paramLinkTableMap);

$privacy = (isset($data["privateSearch"]) && $data["privateSearch"]) ? 1 : 0;    // convert presence of privacy field into 1 or 0 that can be used in database query as boolean field

// Check everything necessary is in the bag
$allGood = true;

foreach ($allUserFieldsMap as $key => $value) {
	// if no post value for expected variable give it a blank string
	if (!isset($data[$key])) {
		$data[$key] = array_key_exists ($key, $paramLinkTableMap) ? [] : null;
		if ($value["required"]) {
			$allGood = false;
		}
	}
	else {
		$arrval = $data[$key];
		$count = count($arrval);
		if ($value["required"] == true && ($count == 0 || ($count == 1 && strlen($arrval[0]) == 0))) {
			$allGood = false;
		}

		else if (array_key_exists ("validate", $value)) {
			if (!is_array ($arrval)) {
				$arrval = array($arrval);   // single item array
			}
			foreach ($arrval as $index => $val) {
				$valid = ($val === false) || filter_var ($val, $value["validate"]);
				if ($valid === false) {
					//error_log (print_r ("failed validation ".$key." ".$val, true));
					$allGood = false;
				}
			}  
		}
	}
}


//if (false) {  // for error testing
if ($allGood) {

	// make timestamps to use in name fields and in timestamp fields (different format required)
	date_default_timezone_set ('Europe/Berlin');
	//$SQLValidTimeStamp = $date->format("Y-m-d H:i:s");
	$timeStamp = (new DateTime())->format("H_i_s-d_M_Y");

	$preparedStatementTexts = array (
		"paramSet" => "INSERT INTO parameter_set (enzyme_chosen, name, uploadedby, missed_cleavages, ms_tol, ms2_tol, ms_tol_unit, ms2_tol_unit, customsettings, top_alpha_matches, template, synthetic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '10', FALSE, FALSE) RETURNING id",
		"fixedMods" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
		"varMods" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
		"ions" => "INSERT INTO chosen_ions (paramset_id, ion_id) VALUES ($1, $2)",
		"losses" => "INSERT INTO chosen_losses (paramset_id, loss_id) VALUES ($1, $2)",
		"crosslinkers" => "INSERT INTO chosen_crosslinker (paramset_id, crosslinker_id) VALUES ($1, $2)",
		"acquisitions" => "SELECT name FROM acquisition WHERE id = ANY ($1::int[])",
		"getUserGroups" => "SELECT group_id FROM user_in_group WHERE user_id = $1",
		"newSearch" => "INSERT INTO search (paramset_id, visible_group, name, uploadedby, notes, private, xiversion, status, completed, is_executing) VALUES ($1, $2, $3, $4, $5, $6, $7, 'queuing', FALSE, FALSE) RETURNING id",
		"newSearchSeqLink" => "INSERT INTO search_sequencedb (search_id, seqdb_id) VALUES($1, $2)",
		"getRuns" => "SELECT acq_id, run_id FROM run WHERE acq_id = ANY($1::int[])",
		"newSearchAcqLink" => "INSERT INTO search_acquisition (search_id, acq_id, run_id) VALUES($1, $2, $3)"
	);


	include('../../connectionString.php');
	ob_end_clean();	// because otherwise the received data above ^^^ gets echo'ed back out
	//open connection
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

	try {
		pg_query("BEGIN") or die("Could not start transaction\n");

		if ($_SESSION["canAddNewSearch"]) {

			// little bobby tables - https://xkcd.com/327/

			// Get names of acquisitions (via ids) to make parameter name
			$acqIds = "{".join(',',$data["acquisitions"])."}"; // re-use this later to get run data too
			$getAcqNames = pg_prepare($dbconn, "getAcqNames", $preparedStatementTexts["acquisitions"]);
			$result = pg_execute($dbconn, "getAcqNames", array($acqIds));
			$acqNameRows = pg_fetch_all ($result); // get associated acquisition names to make name for parameter
			$allAcqNames = array_map(function($row) { return $row["name"]; }, $acqNameRows);
			$paramName = join('-',$allAcqNames)."-".$timeStamp;

			// Add parameter_set values to db
			$result = pg_prepare($dbconn, "paramsAdd", $preparedStatementTexts["paramSet"]);
			$result = pg_execute($dbconn, "paramsAdd", [$data["enzyme"], $paramName, $userID, $data["missed_cleavages"], $data["ms_tol"], $data["ms2_tol"], $data["ms_tol_unit"], $data["ms2_tol_unit"], $data["customsettings"]]);
			$paramIDRow = pg_fetch_assoc ($result); // get the newly added parameter id
			$paramid = $paramIDRow["id"];

			// Add link tables to connect parameter_set to ions/mods/losses/crosslinkers
			foreach ($paramLinkTableMap as $key => $value) {

				$arrval = $data[$key];
				if (!is_array ($arrval)) {
					$arrval = array($arrval);   // single item array
				}

				$result = pg_prepare ($dbconn, $key, $preparedStatementTexts[$key]);
				// change to multi-insert later? http://php.net/manual/en/mysqli.quickstart.prepared-statements.php
				foreach ($arrval as $mval) {
					$arr = [$paramid, $mval];
					if (array_key_exists ("defaults", $value)) {
						foreach ($value["defaults"] as $dkey => $dval) {
							$arr[] = $dval; // append $dval to $arr
						}
					} 
					$result = pg_execute($dbconn, $key, $arr);
				}
			}

			$getUserGroups = pg_prepare ($dbconn, "getUserGroups", $preparedStatementTexts["getUserGroups"]);
			$result = pg_execute ($dbconn, "getUserGroups", [$userID]);
			$userGroupIdRow = pg_fetch_assoc ($result); // get first user group for this user
			$userGroupId = $userGroupIdRow["group_id"];

			// Add search to db
			// Make search name timestamped list of acquisitions if not explicitly provided
			$searchName = ($data["searchName"] ? $data["searchName"] : $paramName);
			$searchInsert = pg_prepare ($dbconn, "searchInsert", $preparedStatementTexts["newSearch"]);

			$result = pg_execute ($dbconn, "searchInsert", [$paramid, $userGroupId, $searchName, $userID, $data["notes"], $privacy, $data["xiversion"]]);
			$searchRow = pg_fetch_assoc ($result); // get the newly added search id
			$searchid = $searchRow["id"];

			// Add search-to-sequence link table rows
			$searchSeqLink = pg_prepare ($dbconn, "searchSeqLink", $preparedStatementTexts["newSearchSeqLink"]);
			foreach ($data["sequences"] as $key => $seqid) {
				$result = pg_execute ($dbconn, "searchSeqLink", [$searchid, $seqid]);
			}

			// Get run info
			$getRuns = pg_prepare ($dbconn, "getRuns", $preparedStatementTexts["getRuns"]);
			$result = pg_execute ($dbconn, "getRuns", [$acqIds]);
			$runRows = pg_fetch_all ($result);
			// Add search-to-acquisition-and-run link table rows
			$searchAcqLink = pg_prepare ($dbconn, "searchAcqLink", $preparedStatementTexts["newSearchAcqLink"]);
			foreach ($runRows as $key => $run) {
				$result = pg_execute ($dbconn, "searchAcqLink", [$searchid, $run["acq_id"], $run["run_id"]]);
			}

			pg_query("COMMIT");

			echo (json_encode(array ("status"=>"success", "newSearch"=>$searchRow)));
		} else {
			pg_query("ROLLBACK");
			ajaxHistoryRedirect ("Permission to upload a new search has been denied.");    // if user not permitted to enter seq/acqs
		}
	} catch (Exception $e) {
		pg_query("ROLLBACK");
		$date = date("d-M-Y H:i:s");
		echo (json_encode(array ("status"=>"fail", "error"=> "An Error occurred when trying to submit the search to the database<br>".$date)));
	}

	//close connection
	pg_close($dbconn);
}

else {
	$date = date("d-M-Y H:i:s");
	$etype = "Parameter Input Error";
	echo (json_encode(array ("status"=>"fail", "error"=> "Missing or invalid fields were found in the submitted search<br>".$date, "errorType"=>$etype)));
}

?>