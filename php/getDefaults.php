<?php  
    function getLastSearchID ($dbconn) {
        pg_prepare ($dbconn, "getLastSearchID", "SELECT id FROM search WHERE uploadedby = $1 AND (hidden ISNULL or hidden = 'f') ORDER BY id DESC LIMIT 1");
        $result = pg_execute($dbconn, "getLastSearchID", array($_SESSION['user_id']));
        $lastSearchID = resultsAsArray($result);
        
        //error_log (print_r($lastSearchID, TRUE));

        return count($lastSearchID) == 0 ? null : $lastSearchID[0]["id"];
    }

	function getRandomString ($dbconn, $searchID) {
		pg_prepare ($dbconn, "getRandomString", "SELECT id, random_id FROM search WHERE id = $1");
        $result = pg_execute($dbconn, "getRandomString", array($searchID));
        $arr = resultsAsArray($result);
		return count($arr) > 0  ? $arr[0]["random_id"] : null;
	}

    function getDefaults ($dbconn, $searchID) {
        pg_prepare($dbconn, "getParamSettings", "SELECT parameter_set.*, xiversion FROM search join parameter_set on parameter_set.id = search.paramset_id WHERE search.id = $1");
        $result = pg_execute($dbconn, "getParamSettings", array($searchID));
        $paramSettings = resultsAsArray($result);
        $defaults = array ();
        
        //error_log ("SID ".$searchID);
        //error_log (print_r($paramSettings, TRUE));
        //error_log ("PID ".$paramSettings[0]["id"]);

        if (count($paramSettings) > 0) {
            $pSettings = $paramSettings[0];
            $pid = $pSettings["id"];

            $defaults = array (
                "ms_tol" => $pSettings["ms_tol"],
                "ms2_tol" => $pSettings["ms2_tol"],
                "ms_tol_unit" => $pSettings["ms_tol_unit"],
                "ms2_tol_unit" => $pSettings["ms2_tol_unit"],
                "missed_cleavages" => $pSettings["missed_cleavages"],
                "enzyme" => $pSettings["enzyme_chosen"],
				"xiversion" => $pSettings["xiversion"],
                "customsettings" => $pSettings["customsettings"]
            );

            $getParamMultiOptions = array (
                "ions" => "SELECT ion_id FROM chosen_ions WHERE paramset_id = $1",
                "crosslinkers" => "SELECT crosslinker_id FROM chosen_crosslinker WHERE paramset_id = $1",
                "losses" => "SELECT loss_id FROM chosen_losses WHERE paramset_id = $1",
                "fixedMods" => "SELECT mod_id FROM chosen_modification WHERE paramset_id = $1 AND fixed = TRUE",
                "varMods" => "SELECT mod_id FROM chosen_modification WHERE paramset_id = $1 AND fixed = FALSE",
            );
            
            $getSearchSingleResults = array (
                "notes" => "SELECT notes FROM search WHERE id = $1"
            );
            
            $getSearchMultiOptions = array (
				// don't download acquisitions / sequences when loading search defaults
				/*
                "acquisitions" => "SELECT DISTINCT acq_id FROM search_acquisition WHERE search_id = $1",
                "sequences" => "SELECT seqdb_id FROM search_sequencedb WHERE search_id = $1"
				*/
            );

            foreach ($getParamMultiOptions as $key => $value) {
                pg_prepare ($dbconn, $key, $value);
                $result = pg_execute ($dbconn, $key, array($pid));
				$arr = resultsAsArray($result);
				$arrValues = array_map(function($a) { return array_values($a)[0]; }, $arr);
                $defaults[$key] = $arrValues;
            }
            
            foreach ($getSearchSingleResults as $key => $value) {
                pg_prepare ($dbconn, $key, $value);
                $result = pg_execute ($dbconn, $key, array($searchID));
                $defaults[$key] = pg_fetch_row($result)[0];
                //error_log (print_r($result, TRUE));
            }
            
            foreach ($getSearchMultiOptions as $key => $value) {
                pg_prepare ($dbconn, $key, $value);
                $result = pg_execute ($dbconn, $key, array($searchID));
				$arr = resultsAsArray($result);
				$arrValues = array_map(function($a) { return array_values($a)[0]; }, $arr);
                $defaults[$key] = $arrValues;
            }
        }
        
        //error_log (print_r($defaults, TRUE));

        return $defaults;
    }


    function getGlobalDefaults ($dbconn) {

        $defaults = array (
            "ms_tol" => 6,
            "ms2_tol" => 20,
            "ms_tol_unit" => "ppm",
            "ms2_tol_unit" => "ppm",
            "missed_cleavages" => 4,
            "notes" => "",
            "customsettings" => "",
            "acquisitions" => array(),
            "sequences" => array(),
			"privateSearch" => false,
			"searchName" => "",
        );
        
        $getMultiOptions = array (
			"xiversion" => "SELECT id FROM xiversions WHERE isdefault = TRUE", /* different spelling isdefault */
            "enzyme" => "SELECT id FROM enzyme WHERE is_default = TRUE",
            "ions" => "SELECT id FROM ion WHERE is_default = TRUE",
            "crosslinkers" => "SELECT id FROM crosslinker WHERE is_default = TRUE",
            "losses" => "SELECT id FROM loss WHERE is_default = TRUE",
            "fixedMods" => "SELECT id FROM modification WHERE is_default_fixed = TRUE",
            "varMods" => "SELECT id FROM modification WHERE is_default_var = TRUE",
        );
		
		$returnFirst = array ("enzyme" => true, "xiversion" => true);
		
		
            
        foreach ($getMultiOptions as $key => $value) {
            pg_prepare ($dbconn, $key, $value);
            $result = pg_execute ($dbconn, $key, array());
			$arr = resultsAsArray($result);
			$arrValues = array_map(function($a) { return array_values($a)[0]; }, $arr);
			if (array_key_exists ($key, $returnFirst)) {
				$arrValues = $arrValues[0];
			}
            $defaults[$key] = $arrValues;
        }
        
        //error_log (print_r($defaults, TRUE));
        
        return $defaults;
    }
?>