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
    "acqPreviousTable" => array ("table" => "search_acquisition", "sqlname" => "acq_id", "required" => true, "validate" => FILTER_VALIDATE_INT),
    "seqPreviousTable" => array ("table" => "search_sequencedb", "sqlname" => "seqdb_id", "required" => true, "validate" => FILTER_VALIDATE_INT)
);

$preparedStatementTexts = array (
    "paramSet" => "INSERT INTO parameter-set (enzyme_chosen, name, uploadedby, missed_cleavages, ms_tol, ms2_tol, ms_tol_unit, ms2_tol_unit, upload_date, notes)"
        ."VALUES (%1, %2, %3, %4, %5, %6, %7, %8, %9, %10)",
    "paramFixedModsSelect" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
    "paramVarModsSelect" => "INSERT INTO chosen_modification (paramset_id, mod_id, fixed) VALUES ($1, $2, $3)",
    "paramVarIonsSelect" => "INSERT INTO chosen_ions (paramset_id, ion_id) VALUES ($1, $2)",
    "paramLossesSelect" => "INSERT INTO chosen_losses (paramset_id, loss_id) VALUES ($1, $2)",
    "acqPreviousTable" => "SELECT name FROM acquisition WHERE id IN ($1)",
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
    
    $date = new DateTime();
    $timeStamp = $date->format("Y-m-d H:i:s.u");
    
    include('../../connectionStringSafe.php');
    //open connection
    $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());
    
    try {
        pg_query("BEGIN") or die("Could not start transaction\n");

        
        
        // little bobby tables - https://xkcd.com/327/
        $paramid = 1234567890;
        var $acqIds = join(',',$_POST["acqPreviousTable"]);
        ChromePhp::log(json_encode($acqIds));
        $getAcqNames = pg_prepare($dbconn, "getAcqNames", $preparedStatementTexts["acqPreviousTable"]);
        $result = pg_execute($dbconn, "getAcqNames", [$acqIds] );
        $returnAll = pg_fetch_all ($result); // get the newly added row, need it to add runs here and to return to client ui
        ChromePhp::log(json_encode($returnAll));
        $allAcqNames = array_map(function($row) { return $row.name; }, $returnAll);
        ChromePhp::log(json_encode($allAcqNames));
        $paramName = join('-',$allAcqNames);
        ChromePhp::log(json_encode($paramName));
        
        /*
        $result = pg_prepare($dbconn, "paramsAdd", $preparedStatementTexts["paramSet"]);
        $result = pg_execute($dbconn, "paramsAdd", [$_POST["paramEnzymeSelect"], , $userID, $_POST["paramMissedCleavagesValue"], $_POST["paramToleranceValue"],
                                                   $_POST["paramTolerance2Value"], $_POST["paramToleranceUnits"], $_POST["paramTolerance2Units"], 
                                                    $timeStamp, $_POST["paramNotes"]]);
        
        $paramIDGet = pg_prepare($dbconn, "paramIDGet", "SELECT id, name from parameter_set where uploadedby = $1 AND name = $2 AND upload_date = $3");
        $result =  pg_execute($dbconn, "paramIDGet", [$userID, $name, $timeStamp]);
        $returnRow = pg_fetch_assoc ($result); // get the newly added row, need it to add runs here and to return to client ui
        $paramid= $returnRow["id"];
        */
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
        pg_query("COMMIT");
        echo (json_encode(array ("status"=>"success", "newRow"=>$returnRow)));
    } catch (Exception $e) {
        pg_query("ROLLBACK");
        echo (json_encode(array ("status"=>"fail", "error"=>$e)));
    }
    
    //close connection
    pg_close($dbconn);
}

else {
    echo (json_encode(array ("status"=>"fail", "error"=>"missing fields")));
}

?>