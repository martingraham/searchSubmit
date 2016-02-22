<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
}

//$pageName = "New Search";
include('../../connectionStringSafe.php');
include './ChromePhp.php';
ChromePhp::log(json_encode($_POST));


$userID = $_SESSION['user_id'];
$username = $_SESSION['session_name'];

$paramFieldNameMap = array (
    "name" => array ("required" => true),
    "filename" => array ("required" => true),
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
    //open connection
    $dbconn = pg_connect($connectionString)
            or die('Could not connect: ' . pg_last_error());

    // little bobby tables - https://xkcd.com/327/
    $arr = [$userID, $_POST["name"], $_POST["filename"], "xi/sequenceDB/".$_POST["name"], "xi/users/".$username."/".$_POST["name"]];
    ChromePhp::log(json_encode($arr));

    $result = "";
    if ($_POST["type"] == "acq") {
        $result = pg_prepare($dbconn, "seqAdd",
		  "INSERT INTO acquistion (uploadedby, name, file_path, upload_date) VALUES ($1, $2, $3, NOW())");
        ChromePhp::log(json_encode(pg_fetch_result($result, 0, 0)));
        //$result = pg_execute($dbconn, "acqAdd", [$userID, $_POST["name"], "xi/users/".$username."/".$_POST["name"]]);
    } 
    else if ($_POST["type"] == "seq") {
        $result = pg_prepare($dbconn, "seqAdd",
		  "INSERT INTO sequence_file (uploadedby, name, file_name, file_path, upload_date) VALUES ($1, $2, $3, $4, NOW())");
         //$result2 = pg_prepare($dbconn, "seqQ", "SELECT * FROM sequence_file WHERE uploadedby = $1");
         $result = pg_execute($dbconn, "seqAdd", [$userID, $_POST["name"], $_POST["filename"], "xi/sequenceDB/".$_POST["name"]]);
         //$result3 = pg_execute($dbconn, "seqQ", [$userID]);
         ChromePhp::log(json_encode(pg_fetch_all($result)));
    } 

    //close connection
    pg_close($dbconn);


    echo (json_encode("woo!"));
}

else {
    echo (json_encode("fail"));
}

?>