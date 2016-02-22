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

$preparedStatementTexts = array (
    "paramSet" => "INSERT INTO parameter-set (enzyme_chosen, name, uploadedby, missed_cleavages, ms_tol, ms2_tol, ms_tol_unit, ms2_tol_unit, upload_date, notes)"
        ."VALUES (%1, %2, %3, %4, %5, %6, %7, %8, NOW(), %9)",
    "paramFixedModsSelect" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
    "paramVarModsSelect" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
    "paramVarIonsSelect" => "INSERT INTO chosen_ions (paramset_id, ion_id) VALUES ($1, $2)",
    "paramLossesSelect" => "INSERT INTO chosen_losses (paramset_id, loss_id) VALUES ($1, $2)",
);

$allUserFieldsMap = array_merge ($paramFieldNameMap, $paramLinkTableMap, $searchLinkTableMap);


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


ChromePhp::log(json_encode($allGood));


if (true /*$allGood*/) {
    
    include('../../connectionStringSafe.php');
    //open connection
    $dbconn = pg_connect($connectionString)
            or die('Could not connect: ' . pg_last_error());
    
    // little bobby tables - https://xkcd.com/327/
    $paramid = 1234567890;
    $result = pg_prepare($dbconn, "paramsAdd", $preparedStatementTexts["paramSet"]);
    ChromePhp::log(json_encode(pg_fetch_all($result)));
    //$result = pg_execute($dbconn, "paramsAdd", [$_POST["paramEnzymeSelect"], , $userID, $_POST["paramMissedCleavagesValue"], $_POST["paramToleranceValue"],
    //                                           $_POST["paramTolerance2Value"], $_POST["paramToleranceUnits"], $_POST["paramTolerance2Units"], $_POST["paramNotes"]]);
    // $paramid = pg_fetch_assoc($result)['id'];
    
    foreach ($paramLinkTableMap as $key => $value) {
        $arrval = $_POST[$key];
        $pname = $key."add";
        $result = pg_prepare ($dbconn, $pname, $preparedStatementTexts[$key]);
        // change to multi-insert later? http://php.net/manual/en/mysqli.quickstart.prepared-statements.php
        foreach ($arrval as $mval) {
            $arr = [$paramid, $mval];
            if (array_key_exists ("defaults", $value)) {
                foreach ($value["defaults"] as $dkey => $dval) {
                    $arr[] = $dval; // append $dval to $arr
                }
            } 
            ChromePhp::log(json_encode($arr));
            //$result = pg_execute($dbconn, $pname, $arr);
        }
    }
    
    

    //close connection
    pg_close($dbconn);


    echo (json_encode("woo!"));
}

else {
    echo (json_encode("fail"));
}

?>