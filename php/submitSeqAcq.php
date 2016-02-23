<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
}

//$pageName = "New Search";
include('../../connectionStringSafe.php');
include './ChromePhp.php';
ChromePhp::log(json_encode("data posted"));
ChromePhp::log(json_encode($_POST));


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
    ChromePhp::log(json_encode([$key, $_POST[$key]]));
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


if ($allGood) {
    // Make date-time stamp
    $XITIME = "-H_i_s-d_M_Y";
    $date = new DateTime();
    $dateStr = $date->format($XITIME);
    ChromePhp::log(json_encode($dateStr));
    
    $filenames = $_POST["filenames"];
    $tstampname = $_POST["name"].$dateStr;
    
    //open connection
    $dbconn = pg_connect($connectionString)
            or die('Could not connect: ' . pg_last_error());

    // little bobby tables - https://xkcd.com/327/ 
    $returnID = "";

    
    try {
        pg_query("BEGIN") or die("Could not start transaction\n");
        
        $query = "SELECT setting FROM base_setting WHERE name='base_directory_path';";
        $result = pg_query($query) or die('Query failed: ' . pg_last_error());
        $baseDir = pg_fetch_row($result)[0];
        
        if ($_POST["type"] == "acq") {
            $folder = $baseDir."xi/users/".$username."/".$tstampname;
            $acqAdd = pg_prepare($dbconn, "acqAdd",
        "INSERT INTO acquisition (uploadedby, name, upload_date) VALUES ($1, $2, NOW())");
            $result = pg_execute($dbconn, "acqAdd", [$userID, $tstampname]);
            if ($result) {
                ChromePhp::log(json_encode("good result returned"));
            } else {
                ChromePhp::log(json_encode("bad result returned"));
            }


            $acqIDGet = pg_prepare($dbconn, "acqIDGet", "SELECT id from acquisition WHERE uploadedby = $1 AND name = $2");
            $result =  pg_execute($dbconn, "acqIDGet", [$userID, $tstampname]);
            $acqID = pg_fetch_row($result)[0];
             ChromePhp::log(json_encode($acqID));

             $runAdd = pg_prepare($dbconn, "runAdd",
        "INSERT INTO run (acq_id, run_id, name, file_path) VALUES ($1, $2, $3, $4)");
            foreach ($filenames as $index => $val) {
                ChromePhp::log(json_encode([$index+1, $val]));
                $result = pg_execute($dbconn, "runAdd", [$acqID, $index+1, $val, $folder."/".$val]);
            }

            $returnID = $acqID;
        } 
        else if ($_POST["type"] == "seq") {
            $seqAdd = pg_prepare($dbconn, "seqAdd",
        "INSERT INTO sequence_file (uploadedby, name, file_name, file_path, upload_date) VALUES ($1, $2, $3, $4, NOW())");
             //$result2 = pg_prepare($dbconn, "seqQ", "SELECT * FROM sequence_file WHERE uploadedby = $1");
             $result = pg_execute($dbconn, "seqAdd", [$userID, $tstampname, $filenames[0], "xi/sequenceDB/".$tstampname]);
             //$result3 = pg_execute($dbconn, "seqQ", [$userID]);
            $res = pg_result_status ($result, PGSQL_STATUS_STRING);
             ChromePhp::log(json_encode(pg_fetch_all($result)));
             ChromePhp::log(json_encode($res));
        } 
        
         pg_query("COMMIT");
         echo (json_encode("woo!"));
    } catch (Exception $e) {
         pg_query("ROLLBACK");
         echo (json_encode("fail"));
    }

    //close connection
    pg_close($dbconn);
}
else {
    echo (json_encode("fail"));
}

?>