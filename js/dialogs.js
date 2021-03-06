var CLMSUI = CLMSUI || {};

CLMSUI.jqdialogs = {
    constructDialogMessage: function (dialogID, msg, title) {
        var dialogParas = d3.select("body").select("#"+dialogID);
        if (dialogParas.empty()) {
            dialogParas = d3.select("body").append("div").attr("id", dialogID);
        }
        dialogParas.selectAll("p").remove();
        dialogParas
            .attr("id", dialogID)
            .attr("title", title)
            .selectAll("p")
            .data(msg.split("<br>"))
            .enter()
                .append("p")
                .html (function(d) { return d; })
        ;
    },
    
    
    waitDialog: function (dialogID, msg, title) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, "", title);
           
        $("#"+dialogID).dialog({
            modal: true,
            dialogClass: "no-close",
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
        }); 
        
        d3.select("#"+dialogID).append("div")
            .attr ("id", dialogID+"progress")
            .append ("div")
                .attr("class", "progressLabel")
                .text (msg)
        ;
        
        return $("#"+dialogID+"progress").progressbar({"value": false});
    },
    
    killWaitDialog: function (waitDialogID) {
        var pbar = $("#"+waitDialogID+"progress");
        pbar.progressbar("destroy");
        $("#"+waitDialogID).dialog("destroy");
        d3.select("#"+waitDialogID).remove();    
    },
    
    redirectDialog: function (dialogID, redirectUrl, why) {
        var msg = why ? "<br>"+why+"<br>": "<br>You need to be logged in to use the Search Submission page.<br>Press 'OK' to access the Login page.<br>";
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, why ? "No New Search Permission" : "Login Required");
        
        function redirectAction () {
             $(this).dialog("close").dialog("destroy").remove();
             window.location.replace (redirectUrl);  
        }
        
        return $("#"+dialogID).dialog({
            modal: true,
            dialogClass: "no-close",
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: [
                {text: "OK", click: redirectAction},
            ]
        });  
    },
    
    errorDialog: function (dialogID, msg, title) {
        msg = msg.concat("<br><A href='https://github.com/Rappsilber-Laboratory/' target='_blank'>Rappsilber Lab GitHub</A>");
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Database Error");

        $("#"+dialogID).dialog({
            modal:true,
        });
        
        return $("#"+dialogID).dialog('option', 'title', title || "Database Error"); // to change existing title
    },
	
	simpleDialog: function (dialogID, msg, title) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Message");

        $("#"+dialogID).dialog({
            modal:true,
			buttons: [{
			  text: "OK",
			  click: function() {
				$(this).dialog("close");
			  }
			}],
        });
        
        return $("#"+dialogID).dialog('option', 'title', title || "Message"); // to change existing title
    },
    
    areYouSureDialog: function (dialogID, msg, title, yesText, noText, yesFunc) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Confirm");
        
        function close () {
             $(this).dialog("close");
        }
        
        function yesAndClose () {
            close.call (this);  // need to do it this way to pass on 'this' context
            yesFunc();
        }

        return $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
			close: function (event, ui) {
				$(this).dialog("destroy").remove();
			},
            buttons: [
                { text: yesText, click: yesAndClose, class: "addButton" },
                { text: noText, click: close }
            ],
			position: { my: "center", at: "top" },
        });
    },
	
	addStuffDialog: function (dialogID, msg, title, yesText, noText, yesFunc) {
		var dialog = CLMSUI.jqdialogs.areYouSureDialog (dialogID, msg, title || "Add", yesText, noText, yesFunc);
		
		var dialogBox = d3.select(dialog[0]);
		dialogBox.classed ("noSelect", true);	// stop text selection in this dialog
		
		return dialog;
	},
	
	addLossDialog: function (dialogID) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "Select Items", "Add New Loss", "Add", "Cancel");
	},
	
	addModificationDialog: function (dialogID) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "Select Items", "Add New Modification", "Add", "Cancel");
	},
};