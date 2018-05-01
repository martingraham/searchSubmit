<?php
    //include('../../connectionString.php');

    // from http://stackoverflow.com/questions/2021624/string-sanitizer-for-filename
    function normalizeString($str = '') {
        $str = filter_var($str, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW);
        $str = preg_replace('/[\"\*\/\:\<\>\?\'\|]+/', ' ', $str);
        $str = html_entity_decode($str, ENT_QUOTES, "utf-8");
        $str = htmlentities($str, ENT_QUOTES, "utf-8");
        $str = preg_replace("/(&)([a-z])([a-z]+;)/i", '$2', $str);
        $str = str_replace(' ', '-', $str);
        //$str = rawurlencode($str);
        //$str = str_replace('%', '-', $str);
        return $str;
    }

	function normalizeString2 ($str = '') {
        $str = filter_var ($str, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW);
        $str = preg_replace('/[\"\/\<\>\?\'\|]+/', ' ', $str);
        $str = html_entity_decode ($str, ENT_QUOTES, "utf-8" );
        $str = htmlentities($str, ENT_QUOTES, "utf-8");
        $str = preg_replace("/(&)([a-z])([a-z]+;)/i", '$2', $str);
        return $str;
    }

    function getNiceDate () {
        return date("d-M-Y H:i:s");
    }

    // database connection needs to be open and user logged in for these functions to work
    function isSuperUser($dbconn, $userID) {
        $rights = getUserRights ($dbconn, $userID);
        return $rights["isSuperUser"];
    }

    function getUserRights ($dbconn, $userID) {
        pg_prepare($dbconn, "", "SELECT * FROM users WHERE id = $1");
        $result = pg_execute ($dbconn, "", [$userID]);
        $row = pg_fetch_assoc ($result);
        
        $canSeeAll = (isset($row["see_all"]) && isTrue($row["see_all"]));  // 1 if see_all flag is present and true
        $canAddNewSearch = (isset($row["can_add_search"]) && isTrue($row["can_add_search"]));  // 1 if can_add_search flag is present and true 
        $isSuperUser = (isset($row["super_user"]) && isTrue($row["super_user"]));  // 1 if super_user flag is present AND true
        $maxAAs = 0; //isset($row["max_aas"]) ? (int)$row["max_aas"] : 0;   // max aas and spectra now decided by user groups table
        $maxSpectra = 0; //isset($row["max_spectra"]) ? (int)$row["max_spectra"] : 0;
        $maxSearchCount = 10000;
        $maxSearchLifetime = 1000;
        $maxSearchesPerDay = 100;
        $searchDenyReason = $canAddNewSearch ? "" : "Your user role is not allowed to add new searches.";
        
        if (doesColumnExist ($dbconn, "user_groups", "max_aas")) {
            pg_prepare($dbconn, "", "SELECT max(user_groups.max_search_count) as max_search_count, max(user_groups.max_spectra) as max_spectra, max(user_groups.max_aas) as max_aas, max(user_groups.search_lifetime_days) as max_search_lifetime, max(user_groups.max_searches_per_day) as max_searches_per_day,
            MAX(CAST(user_groups.see_all as INT)) AS see_all,
            MAX(CAST(user_groups.super_user as INT)) AS super_user,
            MAX(CAST(user_groups.can_add_search as INT)) AS can_add_search
            FROM user_groups
            JOIN user_in_group ON user_in_group.group_id = user_groups.id
            JOIN users ON users.id = user_in_group.user_id
            WHERE users.id = $1");
            $result = pg_execute ($dbconn, "", [$userID]);
            $row = pg_fetch_assoc ($result);
			//pg_query ($dbconn, "DEALLOCATE user_rights2");
            
            $maxSearchCount = (int)$row["max_search_count"];
            $maxSearchLifetime = (int)$row["max_search_lifetime"];
            $maxSearchesPerDay = (int)$row["max_searches_per_day"];
            $maxAAs = max($maxAAs, (int)$row["max_aas"]);
            $maxSpectra = max($maxSpectra, (int)$row["max_spectra"]);
            $canSeeAll = $canSeeAll || (!isset($row["see_all"]) || isTrue($row["see_all"]));
            $canAddNewSearch = $canAddNewSearch || (!isset($row["can_add_search"]) || isTrue($row["can_add_search"]));
            $isSuperUser = $isSuperUser || (isset($row["super_user"]) && isTrue($row["super_user"])); 
            
            if ($canAddNewSearch) {
                $userSearches = countUserSearches ($dbconn, $userID);
                if ($maxSearchCount !== null && $userSearches >= $maxSearchCount) {
                    $canAddNewSearch = false;
                    $searchDenyReason = "You already have ".$maxSearchCount." or more active searches. Consider hiding some of them to allow new searches.";
                }
            }
                  
            if ($canAddNewSearch) {
                $userSearchesToday = countUserSearchesToday ($dbconn, $userID);
                if ($maxSearchesPerDay !== null && $userSearchesToday >= $maxSearchesPerDay) {
                    $canAddNewSearch = false;
                    $searchDenyReason = "Limit met. Your user profile is restricted to ".$maxSearchesPerDay." new search(es) per day.";
                }
            }
        } else {
            $maxAAs = max($maxAAs, 1000);
            $maxSpectra = max($maxSpectra, 1000000);
        }
		
		//pg_query ($dbconn, "DEALLOCATE user_rights");
        
        // Test if searchSubmit exists as a sibling project
        $doesSearchSubmitExist = file_exists ("../../searchSubmit/");
        if ($doesSearchSubmitExist === false) {
            $canAddNewSearch = false;
        }
        
        // Test if userGUI exists as a sibling project
        $doesUserGUIExist = file_exists ("../../userGUI/");
          
        $userRights = array ("canSeeAll"=>$canSeeAll, "canAddNewSearch"=>$canAddNewSearch, "isSuperUser"=>$isSuperUser, "maxAAs"=>$maxAAs, "maxSpectra"=>$maxSpectra, "maxSearchLifetime"=>$maxSearchLifetime, "maxUserSearches"=>$maxSearchCount, "maxUserSearchesToday"=>$maxSearchesPerDay, "searchDenyReason"=>$searchDenyReason, "doesUserGUIExist"=>$doesUserGUIExist);
		
		return $userRights;
    }

    // Number of searches by a particular user performed today
    function countUserSearchesToday ($dbconn, $userID) {
        pg_prepare ($dbconn, "", "SELECT COUNT(id) FROM search WHERE uploadedby = $1 AND (hidden ISNULL or hidden = 'f') AND submit_date::date = now()::date");
        $result = pg_execute ($dbconn, "", [$userID]);
        $row = pg_fetch_assoc ($result);
        return (int)$row["count"];
    }

    // Number of searches by a particular user
    function countUserSearches ($dbconn, $userID) {
        pg_prepare ($dbconn, "", "SELECT COUNT(id) FROM search WHERE uploadedby = $1 AND (hidden ISNULL or hidden = 'f')");
        $result = pg_execute ($dbconn, "", [$userID]);
        $row = pg_fetch_assoc ($result);
        return (int)$row["count"];
    }

    function doesColumnExist ($dbconn, $tableName, $columnName) {
        pg_prepare($dbconn, "", "SELECT COUNT(column_name) FROM information_schema.columns WHERE table_name=$1 AND column_name=$2");
        $result = pg_execute ($dbconn, "", [$tableName, $columnName]);
        $row = pg_fetch_assoc ($result);
        return isTrue($row["count"]);
    }

	function refuseAcqSeqPermission ($dbconn, $userID, $table, $uploadIDArray, $isSuperUser = null) {
		if ($isSuperUser === null) {
			$isSuperUser = isSuperUser ($dbconn, $userID);
		}
		$arrString = "{".join(",", $uploadIDArray)."}"; 
		// table name can't be paramterised - https://stackoverflow.com/questions/11312737
		pg_prepare ($dbconn, "", "SELECT id,private,private and not($2 or uploadedby=$1) as refused from ".$table." where id = ANY($3)");
        $result = pg_execute ($dbconn, "", [$userID, $isSuperUser, $arrString]);
		
		return resultsAsArray ($result);
	}

    // Turn result set into array of objects
    function resultsAsArray($result) {
        $arr = array();
        while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
            $arr[] = $line;
        }

        // free resultset
        pg_free_result($result);

        return $arr;
    }

	function isTrue ($pgBooleanReturn) {
		$trueArray = array ("TRUE", "true", "t", "yes", "y", "1", 1);
		return in_array ($pgBooleanReturn, $trueArray);
	}

 	function checkSufficientDiskSpace () {
        return disk_free_space (".");
    }
    function ajaxHistoryRedirect ($why) {
        // from http://stackoverflow.com/questions/199099/how-to-manage-a-redirect-request-after-a-jquery-ajax-call
         echo (json_encode (array ("redirect" => "../history/history.html", "why" => $why."<br>Press the button below to go to the Xi history page.")));
    }

    function ajaxBootOut () {
        if (!isset($_SESSION['session_name'])) {
            // https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/94
            // Within an ajax call, calling php header() just returns the contents of login.html, not redirect to it.
            // And since we're usually requesting a json object returning html will cause an error anyways.
            // Thus we return a simple json object with a redirect field for the ajax javascript call to handle
            echo json_encode ((object) ['redirect' => '../xi3/login.html']);
            //header("location:../../xi3/login.html");
            exit;
        }
    }
?>