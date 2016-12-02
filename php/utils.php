<?php
    //include('../../connectionString.php');

    // from http://stackoverflow.com/questions/2021624/string-sanitizer-for-filename
    function normalizeString ($str = '') {
        $str = filter_var ($str, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_LOW);
        $str = preg_replace('/[\"\*\/\:\<\>\?\'\|]+/', ' ', $str);
        $str = html_entity_decode( $str, ENT_QUOTES, "utf-8" );
        $str = htmlentities($str, ENT_QUOTES, "utf-8");
        $str = preg_replace("/(&)([a-z])([a-z]+;)/i", '$2', $str);
        $str = str_replace(' ', '-', $str);
        $str = rawurlencode($str);
        $str = str_replace('%', '-', $str);
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
        pg_prepare($dbconn, "user_rights", "SELECT * FROM users WHERE id = $1");
        $result = pg_execute ($dbconn, "user_rights", [$userID]);
        $row = pg_fetch_assoc ($result);
        //error_log (print_r ($row, true));
        $canSeeAll = (!isset($row["see_all"]) || $row["see_all"] === 't');  // 1 if see_all flag is true or if that flag doesn't exist in the database 
        $canAddNewSearch = (!isset($row["can_add_search"]) || $row["can_add_search"] === 't');  // 1 if can_add_search flag is true or if that flag doesn't exist in the database 
        $isSuperUser = (isset($row["super_user"]) && $row["super_user"] === 't');  // 1 if super_user flag is present AND true
        return array ("canSeeAll"=>$canSeeAll, "canAddNewSearch"=>$canAddNewSearch, "isSuperUser"=>$isSuperUser);
    }

    // restrict user searches to one per day if user is member of 'external_taster' group on top of existing 'can_add_Search' restriction
    function canAddNewSearchToday ($dbconn, $userID) {
        $elapsedSeconds = null;
        if ($_SESSION['canAddNewSearch']) {
            if (isRestrictedUser ($dbconn, $userID)) {
                if (doesColumnExist ($dbconn, "users", "last_search"))
                    pg_prepare ($dbconn, "sinceLastSearch", "SELECT extract(epoch from (now()::timestamp - last_search::timestamp)) AS elapsedseconds FROM users WHERE id = $1");
                    $result = pg_execute ($dbconn, "sinceLastSearch", []);
                    $row = pg_fetch_assoc ($result);
                    $elapsedSeconds = $row['elapsedSeconds'];
                }
            }
        }
        return ($elapsedSeconds == null || $elapsedSeconds < 60*60*24 ) && $_SESSION['canAddNewSearch'];
    }

    // Number of searches by a particular user
    function countUserSearches ($dbconn, $userID) {
        pg_prepare ($dbconn, "activeUserSearches", "SELECT COUNT(id) FROM search WHERE uploadedby = $1");
        $result = pg_execute ($dbconn, "activeUserSearches", [$userID]);
        $row = pg_fetch_assoc ($result);
        return $row["count"];
    }

    function isRestrictedUser ($dbconn, $userID) {
        pg_prepare ($dbconn, "isRestrictedUser", "SELECT COUNT(group_id) FROM user_in_group JOIN user_groups ON user_groups.id = user_in_group.group_id WHERE user_id = $1 AND user_groups.name = 'external_taster'");
        $result = pg_execute ($dbconn, "isRestrictedUser", [$userID]);
        $row = pg_fetch_assoc ($result);
        return ($row["count"] == 1);
    }

    function doesColumnExist ($dbconn, $tableName, $columnName) {
        pg_prepare($dbconn, "doesColExist", "SELECT COUNT(column_name) FROM information_schema.columns WHERE table_name=$1 AND column_name=$2");
        $result = pg_execute ($dbconn, "doesColExist", [$tableName, $columnName]);
        $row = pg_fetch_assoc ($result);
        return ($row["count"] == 1);
    }

    // Turn result set into array of objects
    function resultsAsArray($result) {
        $arr = array();
        while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
            $arr[] = $line;
        }

        // free resultset
        pg_free_result ($result);

        return $arr;
    }

    function ajaxLoginRedirect () {
        // from http://stackoverflow.com/questions/199099/how-to-manage-a-redirect-request-after-a-jquery-ajax-call
         echo (json_encode (array ("redirect" => "../xi3/login.html")));
    }
?>