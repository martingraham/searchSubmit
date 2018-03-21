CLMSUI = CLMSUI || {};
CLMSUI.jqdialogs = CLMSUI.jqdialogs || {};

(function (obj) {

	obj.errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");

	obj.addCrosslinkerDialog = function (dialogID, data, linkerPoplist, updateFunction) {

		var ajaxSubmit = function () {
			$.ajax ({
				type: "POST",
				url: "./php/addNewCrosslinker.php",
				data: submissionReadyOutput(),
				dataType: "json",
				encode: true,
				success: function (response, textStatus, jqXhr) {
					if (response.error) {
						obj.errorDialog ("popErrorDialog", response.error, response.errorType);
					} else if (response) {
						//console.log ("success response", response);
						var result = response.result;
						obj.simpleDialog ("popErrorDialog", "Success! Crosslinker "+result.name+" (ID: "+result.id+") Added", "Crosslinker Added");

						linkerPoplist.data.push (result);	// linkerPoplist.data IS data.xlinkers
						linkerPoplist.isOpen = false;
						// update the associated multiple select widget 
						updateFunction (linkerPoplist);
					}
				},
				error: function () {
					obj.errorDialog ("popErrorDialog", "Error when adding crosslinker to database<br>"+obj.errorDateFormat (new Date()), "Server Error");
				},
			});
		};

		var dialog = obj.addStuffDialog (dialogID, "", "Add New Crosslinker", "Add", "Cancel", ajaxSubmit);
		dialog.dialog ("option", "width", 600);
		var dialogBox = d3.select(dialog[0]);

		var model = {
			isSym: false,
			isDecoy: false,
			name: "",
			mass: undefined,
			acids1: [],
			acids2: [],
			mods: [],
		};

		var aminoAcids = [
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

		var mods = [
			{"modification": "L", "mass": 0, "longName":"Loop"},
			{"modification": "N", "mass": 17.026549105, "longName":"NH2"},
			{"modification": "O", "mass": 18.0105647, "longName":"OH"},
			{"modification": "T", "mass": 121.073893275, "longName":"TRIS"},
		];


		var tablesAtLeastOneChecked = function (tableElems) {
			tableElems.each (function (d, i) {
				d3.select(this).select("thead").classed ("invalidTableSelection", model["acids"+(i+1)].length === 0);
			})
		};

		var rowHelperFunc = function () {
			var chk = this.checked;
			var row = d3.select($(this).parents("tr")[0]);
			row.classed ("aaSelected", chk);
			row.select("input[type='number']")/*.property("disabled", !chk)*/.style("display", chk ? null : "none");
		};


		var compareCrosslinkers = function () {
		};

		var parseDescription = function (description) {
			var props = {};

			var parts = description.split(";");
			var clink = parts[0].split(":");
			var isSym = (clink[1].substring(0,3).toLowerCase() === "sym")
			props.symmetric = isSym
			props.name = clink[3];
			props.mass = parts[1].split(":")[1];

			var acids1 = parts[2].split(":")[1].split(",");

			var aaRegex = new RegExp ("^([A-Za-z\\*]+)+(\\(\\d*\\.?\\d*\\))?$", "");
			props.acids1 = acids1.map (function (aa) {
				var aaParts = aa.match(aaRegex);
				if (aaParts) {
					return {"AA": aaParts[1], "prob": aaParts[2] ? aaParts[2].slice(1, aaParts[2].length - 1) : undefined};
				}
				return null;
			}).filter (function (aaParts) {
				return aaParts != null;
			});

			if (isSym) {
				if (parts[3]) {
					props.mods = parts[3].split(":")[1].split(",")
						.filter (function (str, i) {
							return i % 2 === 0;
						})
					;

				}
			} else {
				var acids2 = parts[3].split(":")[1].split(",");
				props.acids2 = acids2.map (function (aa) {
					var aaParts = aa.match(aaRegex);
					if (aaParts) {
						return {"AA": aaParts[1], "prob": aaParts[2] ? aaParts[2].slice(1, aaParts[2].length - 1) : undefined};
					}
					return null;
				}).filter (function (aaParts) {
					return aaParts != null;
				});
			}

			// if acids contain a "*" for everything, turn it into an 'X' for simplicity
			[props.acids1, props.acids2].forEach (function (acids) {
				if (acids) {
					var everyAcid = acids.filter (function (aa) {
						return aa.AA === "*";
					});
					if (everyAcid.length) {
						everyAcid[0].AA = "X";
						//acids.push ({"AA":"X", prob: everyAcid[0].prob});
					}
				}
			});

			console.log ("props", props);

			return props;
		};

		var truthy = function (val) {
			return val === 1 || val === 't' || val === 'true' || val === true;
		}

		// Copy an existing crosslinkers attributes to the new crosslinker's model
		var pushValuesToModel = function (xlinker) {
			model.name = "NEW_"+xlinker.name;
			model.mass = xlinker.mass;
			model.isDecoy = truthy(xlinker.is_decoy);

			var descriptionProps = parseDescription (xlinker.description);
			model.isSym = descriptionProps.symmetric;
			model.acids1 = descriptionProps.acids1 || [];
			model.acids2 = descriptionProps.acids2 || [];
			model.mods = descriptionProps.mods || [];
		};


		// copy widespread changes to model (like copying from a crosslinker) to the right inputs
		var pushModelToInputs = function () {
			dialogBox.select(".crosslinkerName").property("value", model.name);
			dialogBox.select(".crosslinkerMass").property("value", model.mass);
			dialogBox.select(".isDecoy").property("checked", truthy(model.isDecoy));

			var descriptionProps = model;
			var curSym = dialogBox.select(".isSymmetric").property("checked");
			if (curSym !== descriptionProps.isSym) {
				dialogBox.select(".isSymmetric").node().click();
			}

			dialogBox.selectAll("div.symmetry").each (function (d,i) {
				var acids = descriptionProps["acids"+(i+1)];
				var acidMap = d3.map (acids, function (aa) { return aa.AA.toLowerCase(); });
				d3.select(this).selectAll("tbody tr").each (function (d) {
					var tr = d3.select(this);
					var hit = acidMap.get (d.aminoAcid.toLowerCase());
					tr.select("input[type='checkbox']").property("checked", hit ? true : false);
					tr.select("input[type='number']").property("value", hit && hit.prob ? hit.prob : "");
					rowHelperFunc.call (tr.select("input[type='checkbox']").node());
				});
			});

			tablesAtLeastOneChecked (dialogBox.selectAll("div.symmetry table"));

			var modSet = d3.set (descriptionProps.mods ? descriptionProps.mods.map (function (str) { return str.toLowerCase(); }) : []);
			dialogBox.select("div.mods").selectAll("tbody tr input[type='checkbox']")
				.each (function (d) {
					d3.select(this).property("checked", modSet.has(d.longName.toLowerCase()) ? true : false);	
					rowHelperFunc.call(this);
				})
			;

			textOutput();
		};


		var isValidCrosslinker = function () {
			return model.name && model.mass && model.acids1.length && (model.isSym || model.acids2.length) ? true : false;
		};

		var submissionReadyOutput = function () {

			var crosslinker = $.extend ({}, model);
			crosslinker.is_default = false;

			var modSet = d3.set (crosslinker.mods.map (function (mod) { return mod.toLowerCase(); }));
			var modifications = mods
				.filter (function (mod) {
					return modSet.has (mod.longName.toLowerCase());
				})
				.map (function (mod) { return mod.longName+","+mod.mass; })
				.join(",")
			;

			var outputs = [crosslinker.acids1, crosslinker.acids2].map (function (acids) {
				if (acids) {
					return acids
						.map (function (acid) {
							return acid.AA + (acid.prob ? "(" + acid.prob + ")" : "");
						})
						.join(",")
					;
				}
				return null;
			});

			var descriptionParts = [
				"crosslinker:" + (crosslinker.isSym ? "Symetric" : "Asymetric") + "SingleAminoAcidRestrictedCrossLinker:Name:" +crosslinker.name,
				"MASS:"+crosslinker.mass,
				crosslinker.isSym ? "LINKEDAMINOACIDS:"+outputs[0] : "FIRSTLINKEDAMINOACIDS:"+outputs[0]+";SECONDLINKEDAMINOACIDS:"+outputs[1],
			];
			if (crosslinker.isSym && modifications.length) {
				descriptionParts.push ("MODIFICATIONS:"+modifications);
			}
			crosslinker.description = descriptionParts.join(";");

			// make submitted name combo of user input name and chosen modifications
			var curMods = crosslinker.mods.slice();
			curMods.unshift (crosslinker.name);
			crosslinker.name = curMods.join("+");

			crosslinker.isValid = isValidCrosslinker ();

			return crosslinker;
		};


		var textOutput = function () {
			$(dialog.parent().find(".addButton")).button({disabled: !isValidCrosslinker()})
		};


		var addCrosslinkerBaseOptions = function (container) {
			var baseBox = container.append("div").attr("class", "givens");
			var baseSelect = baseBox.append("label")
				.text("Base New Crosslinker On")
				.append ("select")
				.attr("id", "newCrosslinkerSelect")
			;

			var linkers = data.xlinkers.slice().filter (function (linker) {
				return linker.description.indexOf ("ymetric") > -1;	// get rid of non standard linkers
			});
			linkers.unshift ({name: "Start from Empty", mass: "", id: "0", description: "c:sym:Name:Empty;MASS:;LAO:;MODS:"});
			baseSelect.selectAll("option").data(linkers)
				.enter()
				.append("option")
				.attr("value", function(d) { return d.id; })
				.text(function (d) { return d.name})
			;
			$("#newCrosslinkerSelect").multipleSelect({ 
				baseid: "#newCrosslinkerSelect",
				single: true,
				selectAll: false,
				placeholder: "Pick a crosslinker to base new linker on",
				multiple: true, // this is to show multiple options per row, not to do with multiple selections (that's 'single')
				multipleWidth: 200,
				onClick: function () {
					var select = $("#newCrosslinkerSelect").multipleSelect("getSelects");
					var selectedLinker = linkers.filter (function (xlinker) {
						return xlinker.id === select[0];
					});
					if (selectedLinker.length) {
						pushValuesToModel (selectedLinker[0]);
						pushModelToInputs ();
					}
				},
				onUncheckAll: function () {
					//selectionChanged (this, poplist.clickFunc);
				},
			});
		}

		addCrosslinkerBaseOptions (dialogBox);


		var pbox = dialogBox.append("div").attr("class", "givens");

		pbox.append("label")
			.text("Name")
			.append ("input")
			.attr ("type", "text")
			.attr ("class", "crosslinkerName")
			.attr ("placeholder", "Need a Name (mods added on submission)")
			.attr ("length", 15)
			.attr ("pattern", "^(?!\s*$).+")
			.attr ("title", "Modifications will be appended to name on final submission")
			.property ("required", true)
			.on ("input", function() {
				model.name = this.value;
				textOutput();
			})
		;

		pbox.append("label")
			.text("Mass")
			.append ("input")
			.attr ("type", "number")
			.attr ("class", "crosslinkerMass")
			.attr ("placeholder", "Need a Mass")
			.attr ("step", "any")
			.property ("required", true)
			.on ("input", function() {
				model.mass = this.value;
				textOutput();
			})
		;

		var pbox2 = dialogBox.append("div").attr("class", "givens");
		pbox2.append("label")
			.text("Cross-Linker is Symmetric")
			.append ("input")
			.attr ("type", "checkbox")
			.attr ("class", "isSymmetric")
			.property ("checked", model.isSym)
			.on ("click", function() {
				var chk = d3.select(this).property("checked");
				model.isSym = chk;
				// Swap second crosslinker selection and modification selection table dependent on symmetry selection
				dialogBox.selectAll("div.symmetry")
					.filter (function (d,i) {
						return i > 0;
					})
					.style ("display", model.isSym ? "none" : null)
				;
				dialogBox.selectAll("div.mods").style ("display", model.isSym ? null : "none")
				textOutput();
			})
		;

		pbox2.append("label")
			.text(" A Decoy")
			.append ("input")
			.attr ("type", "checkbox")
			.attr ("class", "isDecoy")
			.property ("checked", model.isDecoy)
			.on ("click", function() {
				model.isDecoy = this.checked;
				textOutput();
			})
		;

		var tableDiv = dialogBox.append("div").attr("class", "aminoAcids");

		var makeAminoAcidTables = function (container) {
			var symmetries = ["Symmetric", "Asymmetric"];

			var symmetryDivs = container.selectAll("div.symmetry").data(symmetries)
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

			var headers = ["Amino Acid", "Press", "Penalty (0 if left empty)"];
			aminoTable.select("thead tr:nth-child(2)").selectAll("th").data(headers).enter().append("th")
				.text(function (d) { return d; })
				.attr("title", function (d) { return d; })
			;

			var rows = aminoTable.select("tbody").selectAll("tr").data(aminoAcids)
				.enter()
				.append("tr")
				.html(function(d) { 
					return "<td><label><input type='checkbox'></input>"+d.longName+"</label></td>"
						+"<td>"+d.aminoAcid+"</td><td><input type='number' step='0.1' min='0' max='1'></td>"
					;
				})
			;
			rows.select("input[type='checkbox']")
				.on ("click", function (d, i, ii) {
					var ii1 = ii + 1;
					var acidSet = d3.map (model["acids"+ii1], function (o) { return o.AA; });
					var chk = this.checked;
					if (chk) {
						var row = $(this).parents("tr")[0];
						var prob = d3.select(row).select("input[type='number']").property("value");
						var obj = {AA: d.aminoAcid};
						if (prob != "") {
							obj.prob = prob;
						}
						acidSet.set (d.aminoAcid, obj);
					} else {
						acidSet.remove (d.aminoAcid);
					}
					model["acids"+ii1] = acidSet.values();
					//console.log ("model", model);
					rowHelperFunc.call (this, d);
					tablesAtLeastOneChecked (aminoTable);
					textOutput();
				})
				.each (rowHelperFunc)
			;

			var updateProb = function (d,i,ii) {
				var acids = model["acids"+(ii+1)];
				var acidMap = d3.map (acids, function (acid) { return acid.AA; });
				var myAcid = acidMap.get (d.aminoAcid);
				if (myAcid) {
					if (this.value != "") {
						myAcid.prob = this.value;
					} else {
						delete myAcid.prob;
					}
				}
				textOutput();
			};
			rows.select("input[type='number']")
				.on ("click", updateProb)
				.on ("input", updateProb)
			;

			aminoTable
				.on ("mouseover", function () {
					this.focus();
				})
				.on ("mouseleave", function () {
					this.blur();
				})
				.on ("keydown", function () {
					var key = d3.event.key.toLowerCase();
					d3.select(this).selectAll("input[type='checkbox']")
						.filter (function (d) {
							return d.aminoAcid.toLowerCase() === key;
						})
						.each (function () {
							this.click();	// simulate click on input checkbox
						})
					;
				})
			;

			tablesAtLeastOneChecked (aminoTable);
		};
		makeAminoAcidTables (tableDiv);


		// Make modification table
		var makeModTable = function (container) {

			var modDiv = container
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
					var modSet = d3.set(model.mods);
					var chk = this.checked;
					modSet[chk ? "add" : "remove"](d.longName);
					model.mods = modSet.values();
					//console.log ("model", model);
					rowHelperFunc.call (this, d);
					textOutput();
				})
				.each (rowHelperFunc)
			;
		};
		makeModTable (tableDiv);

		textOutput();
	};
}(CLMSUI.jqdialogs));