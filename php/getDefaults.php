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
		$defaults = array ();
		
        pg_prepare($dbconn, "getParamSettings", "select parameter_set.*, search.notes, search.xiversion, search.private, search.uploadedby from parameter_set, search where parameter_set.id = search.paramset_id AND search.id = $1");
        $result = pg_execute($dbconn, "getParamSettings", array($searchID));
        $paramSettings = resultsAsArray($result);
        
        //error_log ("SID ".$searchID);
        //error_log (print_r($paramSettings, TRUE));
        //error_log ("PID ".$paramSettings[0]["id"]);

        if (count($paramSettings) > 0) {
            $pSettings = $paramSettings[0];
			//error_log (print_r ($pSettings, true));
            $pid = $pSettings["id"];
			
			$defaults = array (
                "ms_tol" => $pSettings["ms_tol"],
                "ms2_tol" => $pSettings["ms2_tol"],
                "ms_tol_unit" => $pSettings["ms_tol_unit"],
                "ms2_tol_unit" => $pSettings["ms2_tol_unit"],
                "missed_cleavages" => $pSettings["missed_cleavages"],
                "enzyme" => $pSettings["enzyme_chosen"],
                "customsettings" => $pSettings["customsettings"],
				"notes" => $pSettings["notes"],
				"privateSearch" => $pSettings["private"],
				"xiversion" => $pSettings["xiversion"],
				"missedPeaks" => 2, // change from 0 to 2, issue 423 
            );

            $getParamMultiOptions = array (
                "ions" => "SELECT ion_id FROM chosen_ions WHERE paramset_id = $1",
                "crosslinkers" => "SELECT crosslinker_id FROM chosen_crosslinker WHERE paramset_id = $1",
                "losses" => "SELECT loss_id FROM chosen_losses WHERE paramset_id = $1",
                "fixedMods" => "SELECT mod_id FROM chosen_modification WHERE paramset_id = $1 AND fixed = TRUE",
                "varMods" => "SELECT mod_id FROM chosen_modification WHERE paramset_id = $1 AND fixed = FALSE",
            );
            
            $getSearchMultiOptions = array (
                "acquisitions" => "SELECT DISTINCT acq_id FROM search_acquisition WHERE search_id = $1",
                "sequences" => "SELECT seqdb_id FROM search_sequencedb WHERE search_id = $1"
            );

            foreach ($getParamMultiOptions as $key => $value) {
                pg_prepare ($dbconn, $key, $value);
                $result = pg_execute ($dbconn, $key, array($pid));
				$arr = resultsAsArray($result);
				$arrValues = array_map(function($a) { return array_values($a)[0]; }, $arr);
                $defaults[$key] = $arrValues;
            }
            
            foreach ($getSearchMultiOptions as $key => $value) {
                pg_prepare ($dbconn, $key, $value);
                $result = pg_execute ($dbconn, $key, array($searchID));
				$arr = resultsAsArray($result);
				$arrValues = array_map(function($a) { return array_values($a)[0]; }, $arr);
                $defaults[$key] = $arrValues;
            }
        }
		
		// convert 't' and 'f' to true and false
		$pSearch = $defaults["privateSearch"];
		$defaults["privateSearch"] = isTrue($pSearch) ? true : false;
		
		// blank out sequences this user doesn't have permission to reuse
		$userID = $_SESSION['user_id'];
		$isSuperUser = isSuperUser ($dbconn, $userID);
        
        // 02/10/19: If user allowed to base new searches on this search (and if they've got this far, they are), then we now copy that search's non-private acquisition and sequence IDs automatically
		$mySearch = true; //$isSuperUser || (count($paramSettings) > 0 ? $userID === $paramSettings[0]['uploadedby'] : false);
		//error_log (print_r ("superuser ".$isSuperUser.", mysearch ".$mySearch, true));
		
        // Some sequences / acquisitions are still marked as private, so deny them to anyone else but the original user (or a superuser)
		$refuseSeq = refuseAcqSeqPermission ($dbconn, $userID, "sequence_file", $defaults['sequences'], $isSuperUser);
        //error_log (print_r ($defaults['sequences'], true));
		//error_log (print_r ($refuseSeq, true));
		foreach ($defaults['sequences'] as $key=>$value) {
			if (isTrue ($refuseSeq[$key]) || !$mySearch) {
				$defaults['sequences'][$key] = null;
			}
		}
		
		// blank out acquisitions this user doesn't have permission to reuse
		$refuseAcq = refuseAcqSeqPermission ($dbconn, $userID, "acquisition", $defaults['acquisitions'], $isSuperUser);
		foreach ($defaults['acquisitions'] as $key=>$value) {
			if (isTrue ($refuseAcq[$key]) || !$mySearch) {
				$defaults['acquisitions'][$key] = null;
			}
		}
		
        //error_log (print_r($refuseSeq, TRUE));
		//error_log (print_r($refuseAcq, TRUE));

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
			"missedPeaks" => 2,
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