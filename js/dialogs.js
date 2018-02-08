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
    
    areYouSureDialog: function (dialogID, msg, title, yesText, noText, yesFunc) {
        CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Confirm");
        
        function hardClose () {
             $(this).dialog("close").dialog("destroy").remove();
        }
        
        function yesAndHardClose () {
            hardClose.call (this);  // need to do it this way to pass on 'this' context
            yesFunc();
        }

        return $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: [
                { text: yesText, click: yesAndHardClose },
                { text: noText, click: hardClose }
            ]
        });
    },
	
	addStuffDialog: function (dialogID, msg, title, yesText, noText, yesFunc) {
		CLMSUI.jqdialogs.constructDialogMessage (dialogID, msg, title || "Add");
        
        function hardClose () {
             $(this).dialog("close").dialog("destroy").remove();
        }
        
        function yesAndHardClose () {
            hardClose.call (this);  // need to do it this way to pass on 'this' context
            yesFunc();
        }

        return $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: [
                { text: yesText, click: yesAndHardClose },
                { text: noText, click: hardClose }
            ]
        });
	},
	
	addCrosslinkerDialog: function (dialogID) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "Select Items", "Add New Crosslinker", "Add", "Cancel");
		console.log ("dialog", dialog);
		dialog.dialog ("option", "width", 600);
		
		var dialogBox = d3.select(dialog[0]);
		dialogBox.style ("user-select", "none");
		
		var textOutput = function () {
			var asym = !dialogBox.select("input.isSymmetric").property("checked");
			var outputs = [];
			aminoTable
				.filter (function (d,i) { return i === 0 || asym; })
				.each (function (d,i) {
					var rows = d3.select(this).selectAll("tr").filter (function (d,i) {
						return d3.select(this).classed("aaSelected");	
					});	
					var vals = [];
					rows.each (function (d) {
						var val = d3.select(this).select("input[type='number']").property("value");
						vals.push (d.aminoAcid + (val != "" && val !== "1" ? "("+val+")" : ""));
					});
					outputs.push (vals.join(","));
				})
			;
			dialogBox.select("input.cloutput").property("value", outputs.join(" "));
		};
		
		dialogBox.append("label")
			.text("Symmetric")
			.append ("input")
			.attr ("type", "checkbox")
			.attr ("class", "isSymmetric")
			.on ("click", function() {
				var chk = d3.select(this).property("checked");
				dialogBox.selectAll("div.symmetry")
					.filter (function (d,i) {
						return i > 0;
					})
					.style ("display", chk ? "none" : "flex")
				;
				textOutput();
			})
		;
		
		dialogBox.append("input").attr("type", "text").attr("class", "cloutput");
		
		var symmetries = ["Symmetric", "Asymmetric"];
		var tableDiv = dialogBox.append("div").attr("class", "aminoAcids").style("display", "flex");
		var symmetryDivs = tableDiv.selectAll("div.symmetry").data(symmetries)
			.enter()
			.append("div")
			.attr("class", "symmetry")
			.style("display", "flex")
			.style ("flex-grow", 1)
			.style ("flex-shrink", 1)
			.html("<table><thead><tr></tr></thead><tbody></tbody></table>")
		;
		
		var aminoTable = symmetryDivs.select(".aminoAcids table");
		
		var headers = ["Amino Acid", "Abbv", "Probability (1 if left empty)"];
		aminoTable.select("thead tr").selectAll("th").data(headers).enter().append("th").text(function(d) { return d; });
		
		var aa = [
			{"aminoAcid": "A", "monoisotopicMass": 71.03711, "longName":"Alanine"},
			{"aminoAcid": "R", "monoisotopicMass": 156.10111, "longName":"Arginine"},
			{"aminoAcid": "N", "monoisotopicMass": 114.04293, "longName":"Aspargine"},
			{"aminoAcid": "D", "monoisotopicMass": 115.02694, "longName":"Aspartic Acid"},
			{"aminoAcid": "C", "monoisotopicMass": 103.00919, "longName":"Cysteine"},
			{"aminoAcid": "E", "monoisotopicMass": 129.04259, "longName":"Glutamic Acid"},
			{"aminoAcid": "Q", "monoisotopicMass": 128.05858, "longName":"Glutamine"},
			{"aminoAcid": "G", "monoisotopicMass": 57.02146, "longName":"Glycine"},
			{"aminoAcid": "H", "monoisotopicMass": 137.05891, "longName":"Histidine"},
			{"aminoAcid": "I", "monoisotopicMass": 113.08406, "longName":"Isoleucine"},
			{"aminoAcid": "L", "monoisotopicMass": 113.08406, "longName":"Leucine"},
			{"aminoAcid": "K", "monoisotopicMass": 128.09496, "longName":"Lysine"},
			{"aminoAcid": "M", "monoisotopicMass": 131.04049, "longName":"Methionine"},
			{"aminoAcid": "F", "monoisotopicMass": 147.06841, "longName":"Phenylalanine"},
			{"aminoAcid": "P", "monoisotopicMass": 97.05276, "longName":"Proline"},
			{"aminoAcid": "S", "monoisotopicMass": 87.03203, "longName":"Serine"},
			{"aminoAcid": "T", "monoisotopicMass": 101.04768, "longName":"Threonine"},
			{"aminoAcid": "W", "monoisotopicMass": 186.07931, "longName":"Tryptophan"},
			{"aminoAcid": "Y", "monoisotopicMass": 163.06333, "longName":"Tyrosine"},
			{"aminoAcid": "V", "monoisotopicMass": 99.06841, "longName":"Valine"}
		];
		
		var rowHelperFunc = function (d) {
			console.log ("YYYY", this);
			var chk = this.checked;
			var row = d3.select(this.parentNode.parentNode.parentNode);
			row.classed ("aaSelected", chk);
			row.select("input[type='number']").property("disabled", !chk);
		};
		
		var rows = aminoTable.select("tbody").selectAll("tr").data(aa)
			.enter()
			.append("tr")
			.html(function(d) { 
				return "<td><label><input type='checkbox'></input>"+d.longName+"</label></td>"
					+"<td>"+d.aminoAcid+"</td><td><input type='number' step='0.1' min='0' max='1'></td>"
				;
			})
		;
		rows.select("input[type='checkbox']")
			.on ("click", function (d) {
				rowHelperFunc.call (this, d);
				textOutput();
			})
			.each (rowHelperFunc)
		;
		rows.select("input[type='number']")
			.on ("click", textOutput)
			.on ("input", textOutput)
		;
		
		aminoTable.on ("keydown", function () {
			console.log ("evt", d3.event);
			var key = d3.event.key.toLowerCase();
			d3.select(this).selectAll("input[type='checkbox']")
				.filter (function (d,i) {
					return d.aminoAcid.toLowerCase() === key;
				})
				.each (function () {
					this.click();	// simulate click on input checkbox
				})
			;
		});

	}
	
	
};