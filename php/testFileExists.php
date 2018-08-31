<?php
	session_start();
    include('../../vendor/php/utils.php');
	//you could comment out the following line and have no login authentication. 
	ajaxBootOut();

	include('../../connectionString.php');

	try {
		//open connection
        // @ suppresses non-connection throwing an uncatchable error, so we can generate our own error to catch
        $dbconn = @pg_connect($connectionString);    //or die('Could not connect: ' . pg_last_error());
		if ($dbconn) {
			// If it's a sequence id...
			if (array_key_exists ("sequences_id", $_GET)) {
				$index = intval ($_GET["sequences_id"]);
				
				pg_prepare ($dbconn, "", "SELECT file_name, file_path from sequence_file where id=$1");
				$result = pg_execute ($dbconn, "", [$index]);
				$resultArr = resultsAsArray($result);
				$firstResult = $resultArr[0];
				//error_log (print_r ($firstResult, true));

				$file = $_SESSION["baseDir"].$firstResult["file_path"].DIRECTORY_SEPARATOR.$firstResult["file_name"];
				//error_log (print_r ($file, true));

				pg_close ($dbconn);

				echo (json_encode (array ("success" => file_exists($file)) ));
			} 
			// If it's an acquisiton id...
			else if (array_key_exists ("acquisitions_id", $_GET)) {
				$index = intval ($_GET["acquisitions_id"]);
				pg_prepare ($dbconn, "", "SELECT file_path from run where acq_id=$1");
				$result = pg_execute ($dbconn, "", [$index]);
				$resultArr = resultsAsArray($result);

				function fileTest ($row) {
					return file_exists($_SESSION["baseDir"].$row["file_path"]);
				}
				$fileExists = array_map ("fileTest", $resultArr);
				//error_log (print_r ($fileExists, true));
				
				pg_close ($dbconn);

				echo (json_encode (array ("success" => ! in_array(0, $fileExists), "details" => $fileExists) ));
			} else {
				throw new Exception ("Incorrect parameters passed to php function");
			}
		} else {
			throw new Exception ("Cannot connect to database");
		}
	}
    catch (Exception $e) {
        if ($dbconn) {
            pg_close ($dbconn);
        }
        $msg = $e->getMessage();
        echo (json_encode(array ("status"=>"fail", "error"=> "Error - ".$msg)));
    }
?>