<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
}

//$pageName = "New Search";

include './ChromePhp.php';
ChromePhp::log(json_encode($_POST));


$userID = $_SESSION['user_id'];
$username = $_SESSION['session_name'];

$paramFieldNameMap = array (
    "paramMissedCleavagesValue" => array ("sqlname" => "missed_cleavages", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "paramToleranceValue" => array ("sqlname" => "ms_tol", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "paramToleranceUnits" => array ("sqlname" => "ms_tol_unit", "required" => true),
    "paramTolerance2Value" => array ("sqlname" => "ms2_tol", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "paramTolerance2Units" => array ("sqlname" => "ms2_tol_unit", "required" => true),
    "paramEnzymeSelect" => array ("sqlname" => "enzyme_chosen", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "paramNotes" => array ("sqlname" => "notes", "required" => false)
);

$paramLinkTableMap = array (
    //"paramCrossLinkerSelect" => array ("table" => "chosen_crosslinker", "sqlname" => "crosslinker_id", "required" => true),
    "paramFixedModsSelect" => array ("table" => "chosen_modification", "sqlname" => "mod_id", "required" => true, "defaults" => array ("fixed" => "true"), "validate" => FILTER_VALIDATE_INT),
    "paramVarModsSelect" => array ("table" => "chosen_modification", "sqlname" => "mod_id", "required" => true, "defaults" => array ("fixed" => "false"), "validate" => FILTER_VALIDATE_INT),
    "paramIonsSelect" => array ("table" => "chosen_ions", "sqlname" => "ion", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "paramLossesSelect" => array ("table" => "chosen_losses", "sqlname" => "loss_id", "required" => true, "validate" => FILTER_VALIDATE_INT),
);

$searchLinkTableMap = array (
    "previousAcquiTable" => array ("table" => "search_acquisition", "sqlname" => "acq_id", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "previousSeqTable" => array ("table" => "search_sequencedb", "sqlname" => "seqdb_id", "required" => true, "validate" => FILTER_VALIDATE_INT)
);

$allUserFieldsMap = array_merge ($paramFieldNameMap, $paramLinkTableMap, $searchLinkTableMap);

$paramInsert = array (
    "uploadedby" => $userID
);

// Check everything necessary is in the bag
$allGood = true;

foreach ($allUserFieldsMap as $key => $value) {
    $arrval = $_POST[$key];
    $count = count($arrval);
    if (($count == 0 || ($count == 1 && strlen($arrval[0]) == 0)) && $value["required"] == true) {
        $allGood = false;
    }
    
    else if (array_key_exists ("validate", $value)) {
        $t = is_array ($arrval);
        if (!$t) {
            $arrval = array($arrval);   // single item array
        }
        foreach ($arrval as $index => $val) {
            $valid = filter_var ($val, $value["validate"]);
            ChromePhp::log($valid);
            if ($valid === false) {
                $allGood = false;
            }
        }  
    }

}


ChromePhp::log(json_encode($paramInsert));
ChromePhp::log(json_encode($allGood));


if (true /*$allGood*/) {
    
    $sqlInserts = array ();
    
    $sqlStr = "INSERT INTO parameter_set (uploadedby";
    foreach ($paramFieldNameMap as $key => $value) {
        $sqlStr .= ",".$value["sqlname"];
    }
    $sqlStr .= ") VALUES (";
    $sqlStr .= $userID;
    foreach ($paramFieldNameMap as $key => $value) {
        $sqlStr .= ",".$_POST[$key];
    }
    $sqlStr .= ")";
    ChromePhp::log(json_encode($sqlStr));
    $sqlInserts[] = $sqlStr;


    

    


    include('../../connectionString.php');
    //open connection
    $dbconn = pg_connect($connectionString)
            or die('Could not connect: ' . pg_last_error());

    // little bobby tables - https://xkcd.com/327/
    pg_prepare($dbconn, "my_query",
		"INSERT INTO sequence_file (uploadedby, name, file_name, upload_data) VALUES ($1, $2, $2, now())");
    //$result = pg_execute($dbconn, "my_query", [$username, $_POST["name"]]);
    //$result = pg_query($query) or die('Query failed: ' . pg_last_error());  // old way


    //close connection
    pg_close($dbconn);


    echo (json_encode("woo!"));
}

else {
    echo (json_encode("fail"));
}

?>