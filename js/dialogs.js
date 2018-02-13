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

        var dialog = $("#"+dialogID).dialog({
            modal: true,
            open: function () {
                $('.ui-dialog :button').blur(); // http://stackoverflow.com/questions/1793592/jquery-ui-dialog-button-focus
            },
            buttons: [
                { text: yesText, click: yesAndHardClose },
                { text: noText, click: hardClose }
            ]
        });
		console.log ("dialog", dialog);
		
		var dialogBox = d3.select(dialog[0]);
		dialogBox.style ("user-select", "none");
		
		return dialog;
	},
	
	addLossDialog: function (dialogID) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "Select Items", "Add New Loss", "Add", "Cancel");
	},
	
	addModificationDialog: function (dialogID) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "Select Items", "Add New Modification", "Add", "Cancel");
	},
	
	addCrosslinkerDialog: function (dialogID, data) {
		var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "", "Add New Crosslinker", "Add", "Cancel");
		dialog.dialog ("option", "width", 600);
		var dialogBox = d3.select(dialog[0]);
		
		var submissionReadyOutput = function () {
			
			var crosslinker = {
				name: dialogBox.select(".crosslinkerName").property("value"),
				mass: dialogBox.select(".crosslinkerMass").property("value"),
				is_decoy: dialogBox.select(".isDecoy").property("checked"),
				is_default: false,
			};
			
			var modifications = modDiv.select("tbody").selectAll("tr")
				.filter (function () {
					return d3.select(this).classed("aaSelected");
				})
				.data()
				.map (function (d) {
					return d.longName+","+d.mass;
				})
				.join(",")
			;
			
			var isSym = dialogBox.select("input.isSymmetric").property("checked");
			var outputs = [];
			aminoTable
				.filter (function (d,i) { return i === 0 || !isSym; })
				.each (function () {
					var rows = d3.select(this).selectAll("tr").filter (function () {
						return d3.select(this).classed("aaSelected");	
					});	
					var vals = [];
					var allFlag = false;
					rows.each (function (d) {
						var val = d3.select(this).select("input[type='number']").property("value");
						if (d.aminoAcid === "X") {
							vals = [];
							vals.push (d.aminoAcid);
							allFlag = true;
						}
						else if (!allFlag) {
							vals.push (d.aminoAcid + (val != "" && val !== "1" ? "("+val+")" : ""));
						}
					});
					outputs.push (vals.join(","));
				})
			;
			
			var descriptionParts = [
				"crosslinker:" + (isSym ? "Symetric" : "Asymetric") + "SingleAminoAcidRestrictedCrossLinker:Name:" +dialogBox.select(".crosslinkerName").property("value"),
				"MASS:"+dialogBox.select(".crosslinkerMass").property("value"),
				isSym ? "LINKEDAMINOACIDS:"+outputs[0] : "FIRSTLINKEDAMINOACIDS:"+outputs[0]+";SECONDLINKEDAMINOACIDS:"+outputs[1],
			];
			if (isSym && modifications.length) {
				descriptionParts.push ("MODIFICATIONS:"+modifications);
			}
			crosslinker.description = descriptionParts.join(";");
			
			return crosslinker;
		}
		
		var textOutput = function () {
			var newCrosslinker = submissionReadyOutput();
			console.log ("ncl", newCrosslinker);
			dialogBox.select("input.cloutput").property("value", JSON.stringify(newCrosslinker));
		};
		
		
		
		var pbox = dialogBox.append("div").attr("class", "givens");
		
		pbox.append("label")
			.text("Name")
			.append ("input")
			.attr ("type", "text")
			.attr ("class", "crosslinkerName")
			.attr ("placeholder", "Give a name")
			.attr ("length", 15)
			.attr ("pattern", "^(?!\s*$).+")
			.on ("input", function() {
				textOutput();
			})
		;
		
		pbox.append("label")
			.text("Mass")
			.append ("input")
			.attr ("type", "number")
			.attr ("class", "crosslinkerMass")
			.attr ("placeholder", "Crosslinker Mass")
			.attr ("length", 15)
			.on ("input", function() {
				textOutput();
			})
		;
		
		var pbox2 = dialogBox.append("div").attr("class", "givens");
		pbox2.append("label")
			.text("Cross-Linker is Symmetric")
			.append ("input")
			.attr ("type", "checkbox")
			.attr ("class", "isSymmetric")
			.on ("click", function() {
				var chk = d3.select(this).property("checked");
				// Swap second crosslinker selection and modification selection table dependent on symmetry selection
				dialogBox.selectAll("div.symmetry")
					.filter (function (d,i) {
						return i > 0;
					})
					.style ("display", chk ? "none" : null)
				;
				dialogBox.selectAll("div.mods").style ("display", chk ? null : "none")
				textOutput();
			})
		;
		
		pbox2.append("label")
			.text(", Decoy")
			.append ("input")
			.attr ("type", "checkbox")
			.attr ("class", "isDecoy")
			.on ("click", function() {
				textOutput();
			})
		;
		
		dialogBox.append("div").attr("class", "givens").append("input").attr("type", "text").attr("class", "cloutput");
		
		var symmetries = ["Symmetric", "Asymmetric"];
		var tableDiv = dialogBox.append("div").attr("class", "aminoAcids");
		var symmetryDivs = tableDiv.selectAll("div.symmetry").data(symmetries)
			.enter()
			.append("div")
			.attr("class", "symmetry")
			.html(function(d,i) { 
				return "<table><thead><tr><th colspan='3'>Linkable Acids "+(i+1)+"</th></tr><tr></tr></thead><tbody></tbody></table>"; 
			})
		;
		
		var aminoTable = symmetryDivs
			.select(".aminoAcids table")
			.attr("tabindex", function (d,i) { return i; })
		;
		
		var headers = ["Amino Acid", "Code", "Probability (1 if left empty)"];
		aminoTable.select("thead tr:nth-child(2)").selectAll("th").data(headers).enter().append("th")
			.text(function(d) { return d; })
			.attr("title", function(d) { return d; })
		;
		
		var aa = [
			{"aminoAcid": "X", "monoisotopicMass": undefined, "longName":"Everything"},
			{"aminoAcid": "NTERM", "monoisotopicMass": undefined, "longName":"N-Terminus"},
			{"aminoAcid": "CTERM", "monoisotopicMass": undefined, "longName":"C-Terminus"},
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
		
		var rowHelperFunc = function () {
			var chk = this.checked;
			var row = d3.select(this.parentNode.parentNode.parentNode);
			row.classed ("aaSelected", chk);
			row.select("input[type='number']").property("disabled", !chk).style("display", chk ? null : "none");
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
		
		aminoTable
			.on ("mouseover", function () {
				this.focus();
			})
			.on ("keydown", function () {
				var key = d3.event.key.toLowerCase();
				d3.select(this).selectAll("input[type='checkbox']")
					.filter (function (d,i) {
						return d.aminoAcid.toLowerCase() === key;
					})
					.each (function () {
						this.click();	// simulate click on input checkbox
					})
				;
			})
		;
		
		// Make modification table
		var mods = [
			{"modification": "L", "mass": 0, "longName":"Loop"},
			{"modification": "N", "mass": 17.026549105, "longName":"NH2"},
			{"modification": "O", "mass": 18.0105647, "longName":"OH"},
			{"modification": "T", "mass": 121.073893275, "longName":"TRIS"},
		];
		
		var modDiv = tableDiv
			.append("div")
			.attr("class", "mods")
			.html("<table><thead><tr><th>Modifications</th></tr></thead><tbody></tbody></table>")
			.style ("display", "none")
		;
		
		var rows = modDiv.select("tbody").selectAll("tr").data(mods)
			.enter()
			.append("tr")
			.html(function(d) { 
				return "<td><label><input type='checkbox'></input>"+d.longName+"</label></td>";
			})
		;
		rows.select("input[type='checkbox']")
			.on ("click", function (d) {
				rowHelperFunc.call (this, d);
				textOutput();
			})
			.each (rowHelperFunc)
		;
	}
	
	
};