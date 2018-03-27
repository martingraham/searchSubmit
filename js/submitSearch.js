/*jslint browser: true, white: true, bitwise: true, plusplus: true, stupid: true, maxerr: 150*/
var CLMSUI = CLMSUI || {};

CLMSUI.buildSubmitSearch = function () {
    
    (function (original) {
        console.enableLogging = function () {
            console.log = original;
        };
        console.disableLogging = function () {
            console.log = function () {};
        };
    })(console.log);
    //console.disableLogging();
    
    var errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");
    var integerFormat = d3.format(",.0f");

    function setTabSessionVar () {
        var lastId = window.localStorage.lastId || '0';
        var newId = (parseInt(lastId, 10) + 1) % 10000;
        window.localStorage.lastId = newId;
        window.sessionStorage.setItem ("tab", newId);
    }
    
    function getTabSessionVar () {
        return window.sessionStorage ? window.sessionStorage.getItem ("tab") : "1";
    }
    
    // redirect via explanatory dialog if not logged in
    function redirector (redirectUrl, why) {
        CLMSUI.jqdialogs.redirectDialog ("popErrorDialog", redirectUrl, why);
        //window.location.replace (loginUrl);    
    }
	
	function escapeHtml (html) {
		var fn = function(tag) {
			var charsToReplace = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&#34;',
				"'": '&#27;',
			};
			return charsToReplace[tag] || tag;
		};
		return html ? html.replace(/[&<>"]/g, fn) : html;
	};
    
    setTabSessionVar ();
	
	function switchEnzymeControls (multiOn) {
		d3.select("#paramEnzyme").select(".horizontalFlex .ms-parent.formPart").style("display", multiOn ? "none" : null);
		d3.select("#digestAccordionContainer").style("display", multiOn ? null : "none");
	};
    
	var Submission = Backbone.Model.extend ({
		validate: function () {
			var missing = d3.set();
			var test = ["ions", "acquisitions", "sequences", "crosslinkers", "enzyme", "xiversion"];
			test.forEach (function (field) {
				var val = this.get(field);
				if (!val || ($.isArray(val) && !val.length)) {
					missing.add(field);
				}	
			}, this);
			return !missing.empty() ? missing : undefined;
		}
	});
	var model = new Submission ({
		"searchName": undefined,
		"ms_tol": undefined,
        "ms2_tol": undefined,
        "missed_cleavages": undefined,
        "ms_tol_unit": undefined,
        "ms2_tol_unit": undefined,
        "crosslinkers": undefined,
        "enzyme": undefined,
        "ions": undefined,
        "fixedMods": undefined,
        "varMods": undefined,
        "losses": undefined,
		"xiversion": undefined,
        "notes": undefined,
        "customsettings": undefined,
		"acquisitions": undefined,
		"sequences": undefined,
		"privateSearch": null,
	});
	
    
    // Interface elements that can be built without waiting for database queries to return
    function canDoImmediately () {
        // Make acquisition and sequence divs via shared template
        var acqSeqTemplateData = [
            {id: "#sequence", fields: {"singleLabel":"Sequence", "pluralLabel":"Sequences", "sPronoun":"A", "partialId":"seq", "fileTypes":".fasta,.txt", "tabVal": getTabSessionVar()}},
            {id: "#acquire", fields: {"singleLabel":"Acquisition", "pluralLabel":"Acquisitions", "sPronoun": "An", "partialId":"acq", "fileTypes":".mgf,.msm,.apl,.zip", "tabVal":getTabSessionVar(), multipleUpload: true}},
        ];
        acqSeqTemplateData.forEach (function (datum) {
            d3.select(datum.id)
                .html (tmpl("template-acqseq-section", datum.fields))
                .classed ("uploadTemplate", true)
            ;
        });
        
        
        // Make textboxes
        // Those with labeltag h3 can be accordion'ed later
        CLMSUI.buildSubmitSearch.userAltered = {};
        var textBoxData = [
            {domid: "#paramNotes", niceLabel: "Search Notes", labelTag: "label", placeholderText: "Click here to add notes...", modelKey: "notes"},
            {domid: "#paramCustom", niceLabel: "Custom Settings", labelTag: "H3", placeholderText: "Click here to add custom settings...", modelKey: "customsettings"},
            {domid: "#paramSearchName", niceLabel: "New Search Name", labelTag: "label", placeholderText: "If left empty, the search name will be the acquisition names + timestamp", rows: 1, maxLength: 1000, modelKey: "searchName"},
        ];
        textBoxData.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            var tid = settings.domid.slice(1)+"Value";
            var label = elem.append(settings.labelTag).text(settings.niceLabel);
            
            if (settings.labelTag === "H3") {
                elem = elem.append("div");
            } else {
                label
                    .attr ("class", "plike")
                    .attr ("for", tid)   // for accessibility compliance, https://achecker.ca/checker/suggestion.php?id=95
                ;
            }

            elem.append("textarea")
                .attr ({
                    class: "formPart",
                    wrap: "soft",
                    maxlength: settings.maxLength || 10000,
                    cols: 50,
                    rows: settings.rows || 4,
                    id: tid,
                    name: tid,
                    placeholder: settings.placeholderText,
                })
                .classed ("ui-widget ui-state-default ui-corner-all", true)
                .on ("keypress", function() {
					model.set (settings.modelKey, this.value);	// this sets model for textarea inputs
                    CLMSUI.buildSubmitSearch.userAltered[tid] = true;
                }) 
            ;
        });


        // Make number inputs
        var numberInputSettings = [
            {domid: "#paramTolerance", niceLabel: "Ms Tolerance", min: 0, step: "any", modelKey: "ms_tol"},
            {domid: "#paramTolerance2", niceLabel: "Ms2 Tolerance", min: 0, step: "any", modelKey: "ms2_tol"},
            {domid: "#paramMissedCleavages", niceLabel: "Missed cleavages", min: 0, step: 1, modelKey: "missed_cleavages"},
        ];
        numberInputSettings.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            var iid = settings.domid.slice(1)+"Value";
            elem.append("label")    // label and for attr, for aria compliance, https://achecker.ca/checker/suggestion.php?id=95
                .attr ("for", iid)  
                .attr ("class", "plike")
                .text(settings.niceLabel)
            ;
            elem.append("input")
                .attr ("type", "number")
                .attr ("min", settings.min)
                .attr ("step", settings.step)
                .attr("name", iid)
                .attr("id", iid)
                .classed("formPart", true)
            ;

            $("#"+iid).spinner({
                min: settings.min,
                max: settings.max,
                step: 1,
				change: function () { 
                    if (!this.checkValidity()) {    // set to min if not a valid entry
                        $(this).spinner ("value", settings.min);
                    } 
					model.set (settings.modelKey, this.value);	// this sets model for number inputs
                }
            });
        });


        // Make unit drop-downs
        var unitSettings = [
            {domid: "#paramTolerance", units: ["ppm", "Da"], modelKey: "ms_tol_unit"},
            {domid: "#paramTolerance2", units: ["ppm", "Da"], modelKey: "ms2_tol_unit"},
        ];
        unitSettings.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            var baseId = settings.domid.slice(1)+"Units";
            var selElem = elem.append("select")
                .attr("name", baseId)
                .attr("id", baseId)
                .classed("formPart", true)
            ;
            var optionJoin = selElem.selectAll("option").data(settings.units);
            optionJoin.enter()
                .append("option")
                .text (function(d) { return d; })
            ;

            $("#"+baseId).selectmenu({
				change: function (event, ui) {
					model.set (settings.modelKey, ui.item.value);	// this sets model for unit inputs
				}
			});

            elem.selectAll(".ui-selectmenu-button").style("width", null);   // calculated width in selectmenu is dodgy, kill it
        });


        // Make accordions
        var accordionSettings = [
            {id: "#acqAccordion", scrollTo: false}, 
            {id: "#seqAccordion", scrollTo: false}, 
            {id: "#paramCustom", scrollTo: true}, 
        ];
        //var scrollVisible = [false, false, true];
        accordionSettings.forEach (function (accordionSet) {
            $(accordionSet.id).accordion ({
                collapsible: true,
                active: false,
                heightStyle: "content",
                activate: function () {
                    if (accordionSet.scrollTo) {
                        $('html, body').animate ({
                            scrollTop: $(accordionSet.id).offset().top,
                        }, 1200);
                    }
                },
            });

        });


        // Make buttons
        var buttonData = [
            {id: "#startProcessing", type: "submit"},
            {id: "#backButton", type: "button"},
            {id: "#helpButton", type: "button"},
			{id: "#logoutButton", type: "button"},
            {id: "#useGlobalDefaults", type: "button"},
            {id: "#useLastSearchDefaults", type: "button"},
        ];
        buttonData.forEach (function (buttonDatum) {
            var buttonID = buttonDatum.id;
            $(buttonID).button();  
            d3.select(buttonID).attr("type", buttonDatum.type);
        });
        
        
        // Set checkboxes as form parts
        var checkboxData = [
            {id: "#privacy", type: "checkbox", modelKey: "privateSearch"},
        ];
        checkboxData.forEach (function (checkboxDatum) {
            var checkboxID = checkboxDatum.id;
            d3.select(checkboxID).classed("formPart", true)
				.on ("click", function () {
					model.set (checkboxDatum.modelKey, this.checked);	// set model
				})
			;
        });
        
        
        // Add actions for top-rightbutton
        d3.select("#backButton").on("click", function() { window.history.back(); });
        d3.select("#helpButton").on("click", function() { window.open ("../../xidocs/html/searchSubmit/index.html", "_blank"); });
		d3.select("#logoutButton").on("click", function() { window.location.href = "../../userGUI/php/logout.php"; });
    }

	// populating elements that rely on getting data back from database
    $(document).ready (function () {
        
		var dispatchObj = d3.dispatch ("formInputChanged", "newEntryUploaded", "newFileAdded");
		
        var waitDialogID = "databaseLoading";
        CLMSUI.jqdialogs.waitDialog (waitDialogID, "Please Wait...", "Populating Fields");
		
        $.ajax ({
            type: "GET",
            url: "./php/populate.php",
            dataType: "json",
            encode: true,
            complete: function () {
                CLMSUI.jqdialogs.killWaitDialog (waitDialogID);
            },
            success: gotChoicesResponse,
            error: function (jqXhr, textStatus, errorThrown) {
                CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "An Error occurred when trying to access the database for form choices<br>"+errorDateFormat (new Date()), "Connection Error");
            },
        });
        
        // Do this client side to stop thrashing the server with it
        function mergeInFilenamesToAcquistions (acquistions, runNames) {
            var nameMap = d3.map();
            runNames.forEach (function(runName) {
                var vals = nameMap.get(runName.acq_id);
                if (!vals) {
                    vals = [];
                    nameMap.set(runName.acq_id, vals);
                }
                vals.push (runName.name);
            });
            
            acquistions.forEach (function (acq) {
                var filenames = nameMap.get(acq.id);
                acq.files = filenames ? filenames.sort() : [];
                acq["#"] = acq.files.length;
            });
        }
		
		
		// This rebuilds a multiple selection widget from scratch
		// Needed if switching between single and multiple selection capabilities
		function relaunchMultipleSelectionWidget (poplist, elem, selElem) {
			// remove current multiple select, remove jquery data gubbins, add new multiple select with amended details for crosslinker selection
			elem.select(".ms-parent").remove();
			$(selElem.node()).removeData();
			makeMultipleSelectionWidget (selElem.attr("id"), poplist);	
		};
        
		
		// Make just the multiple-select.js widget portion of a select mechanism
		function makeMultipleSelectionWidget (baseId, singlePopulateOptionList) {
			var poplist = singlePopulateOptionList;
			var elem = d3.select(poplist.domid);
			var selElem = d3.select("#"+baseId);
			
			var singleSelect = !poplist.multiple || poplist.maskAsSingle;
			
			$("#"+baseId).multipleSelect({ 
				baseid: "#"+baseId,
				single: singleSelect,
				filter: poplist.filter, 
				selectAll: false,
				placeholder: poplist.placeHolder,
				multiple: true, // this is to show multiple options per row, not to do with multiple selections (that's 'single')
				//width: 450,
				multipleWidth: 200,
				isOpen: poplist.isOpen,
				onClick: function () {
					var selects = $("#"+baseId).multipleSelect("getSelects");	// single number for single select, array for multiple select
					model.set (poplist.modelKey, poplist.multiple ? selects : selects[0]);
				},
				onUncheckAll: function () {
					model.set (poplist.modelKey, poplist.multiple ? [] : undefined);
				},
			});

			elem.selectAll(".ms-choice")
				.classed("ui-widget", true)
				.classed("ui-state-default", true)
			;
			// add tooltips to list items
			elem.select("ul").selectAll("li:not(.ms-no-results)")
				.attr ("title", function() { return d3.select(this).text(); })
			;

			var options = d3.select(poplist.domid).select("ul");
			
			// add a clear all option
			if (poplist.clearOption) {
				var clearButton = options.insert("li", ":first-child")
					.append("button")
					.text ("Unselect All")
					.attr ("type", "button")
					.attr ("class", "clearAll")
					.style ("display", singleSelect ? "none" : null)
					.on ("click", function() {
						$(selElem).multipleSelect("uncheckAll");
					})
				;
				$(clearButton).button();       
			}
			
			if (poplist.maskAsSingle) {
				var switchToMultiple = poplist.multipleButton;
				var multSwitchButton = options.insert("li", ":first-child")
					.append("button")
					.text (switchToMultiple.text || "Allow Multiple Selections")
					.attr ("type", "button")
					.on ("click", function () {
						poplist.maskAsSingle = false;
						switchToMultiple.func (poplist, elem, selElem)
					})
				;
				$(multSwitchButton.node()).button({icon: switchToMultiple.icon});
			}
		}
		
		// this updates the options found under a poplist's id with the data items in that poplist
		function updateOptionList (poplist, autoSelectNewItems) {
			var selElem = d3.select(poplist.domid).select("select");

			var dataJoin = selElem.selectAll("option")
				.data(poplist.data, function(d) { return d.id; })
			;
			dataJoin.enter().append("option")
				.attr("value", function(d) { return d.id; })
				.html(function(d) { return poplist.textFunc ? poplist.textFunc(d) : d.name; })
				.property ("selected", autoSelectNewItems)
			;	
		};
		
		// construct select elements and then make multiple select dropdowns (using multiple-select.js) from supplied data (populationOptionLists)
		// Multiple Select elements need [] appended to name attr, see http://stackoverflow.com/questions/11616659/post-values-from-a-multiple-select
		function makeMultipleSelectionElements (populateOptionLists, newButtonsShouldBeVisible) {
			populateOptionLists.forEach (function (poplist) {
				var elem = d3.select(poplist.domid);
				elem.append("p").attr("class", "dropdownLabel").html(poplist.niceLabel);
				var flexBox = elem.append("div").attr("class", "horizontalFlex");

				var baseId = poplist.domid.slice(1)+"Select";
				var selElem = flexBox.append("select")
					.attr("id", baseId)
					.attr("name", baseId + (poplist.multiple ? "[]" : ""))  // magic. Need [] at end of name of elements that can submit multiple values
					.attr("data-label", poplist.niceLabel)    
					.classed("formPart", true)
					.classed("flexExpand", true)
					.property("multiple", poplist.multiple)
					.property("required", poplist.required)
					.each (function() {
						if (poplist.required) {
							d3.select(this).attr("required", poplist.required);
						}
					})

				;
				
				updateOptionList (poplist, false);
				
				makeMultipleSelectionWidget (baseId, poplist);

				if (poplist.addNew) {
					var newButton = flexBox.append("button")
						.attr("type", "button")
						.attr("class", "newButton flexRigid")
						.text ("+ New")
						.on ("click", function () {
							if (poplist.addNew !== true) {
								poplist.addNew();
							}
						})
					;

					$(newButton.node()).button();
				}
			});
			
			d3.selectAll(".newButton").style ("display", newButtonsShouldBeVisible ? null : "none");
		}
		
		
		/* this updates an array in a backbone model, replacing old array with new so events are triggered if attached on that property */
		function setModelFromAcc (modelKey, add, id) {
			var curVals = model.get (modelKey);
			console.log ("cur", curVals, modelKey);
			var set = d3.set (curVals);
			set[add ? "add" : "remove"](id);
			model.set (modelKey, set.values());
			console.log ("model", model);
		};
		
		
		// this updates options in a select element (calls function above) and then rebuilds the multiple selection widget
		// data, dom id etc taken from poplist object
		// Generally used in the add dialog functions when just added a new crosslinker, modification etc
		function newPopListDataAdded (popList, newItem) {
			updateOptionList (popList, true);
			var elem = d3.select(popList.domid);
			var selElem = elem.select("select");
			
			if (popList.maskAsSingle !== undefined) {
				popList.maskAsSingle = selElem.selectAll("option:checked").size() <= 1;
			}
			
			relaunchMultipleSelectionWidget (popList, elem, selElem);
			setModelFromAcc (popList.modelKey, true, newItem.id);
		}
		
		
		var delegateModel = new Backbone.Model({});
		// any change to model results in form input being validated for enabling/disabling of submit button
		// this gets fired after any named "change:" events
		delegateModel.listenTo (model, "change", function () {
			//console.log ("firing general change");
			dispatchObj.formInputChanged();
		});
		
        // http://stackoverflow.com/questions/23740548/how-to-pass-variables-and-data-from-php-to-javascript
        function gotChoicesResponse (data, textStatus, jqXhr) {
            console.log ("got", data, textStatus, jqXhr);
            
            if (data.redirect) {
                redirector (data.redirect, data.why);    // redirect if server php passes this field (should be to login page)      
            }
            else if (data.error) {
                CLMSUI.jqdialogs.errorDialog ("popErrorDialog", data.error);
            }
            else {     
                // Add username
                d3.select("#username").text(data.username);
				d3.selectAll("#logoutButton").style("display", data.userRights["doesUserGUIExist"] ? null : "none")
                
                // initialize blueimp file uploader bits. moved here cos we need userRights info
                console.log ("submitter", submitter);	// submitter is defined in main.js in blueimp folder
                var uploadOptions = {
                    "seqfileupload": {"fileTypes":"fasta|txt", "maxFileSize": data.userRights.maxAAs || 1024, maxNumberOfFiles: 1},
                    "acqfileupload": {"fileTypes":"mgf|msm|apl|zip", "maxFileSize": (data.userRights.maxSpectra * 2) || 100000}
                };
                // This was easier than waiting to initialise the acq/seq templates because of one extra bit of info
                var uFormat = d3.format(".2s");
                d3.selectAll(".maxFile").data(d3.keys(uploadOptions).reverse()).text(function(d) { return uFormat (uploadOptions[d].maxFileSize); });
                submitter.upload (uploadOptions);
                
                mergeInFilenamesToAcquistions (data.previousAcqui, data.filenames);

				
                // Make combobox and multiple selection elements
                // Multiple Select uses Jquery-plugin from https://github.com/wenzhixin/multiple-select
                var populateOptionLists = [
                    {data: data.xlinkers, domid: "#paramCrossLinker", 
					 	niceLabel: "Cross-Linker <span class='xlinkerMassHead'>¦ Mass</span><span class='beAware'></span>", 
					 	filter: true, required: true, multiple: true, maskAsSingle: true, placeHolder: "Select one or more Cross Linkers", 
					 	multipleButton: {
							text: "Select Multiple Cross-Linkers",
							func: function (poplist, elem, selElem) {
								poplist.isOpen = true;
								relaunchMultipleSelectionWidget (poplist, elem, selElem)
								setTimeout (function () {
									elem.select("button.ms-choice").node().click();	// open it by click in a timeout, cos neither isOpen nor immediate click() seemed to work
								}, 0);
							},
						},
					 	textFunc: function(d) { return escapeHtml(d.name)+" <span class='xlinkerMassNote'>¦ "+integerFormat(d.mass)+"</span>"; }, 
					 	addNew: function () { CLMSUI.jqdialogs.addCrosslinkerDialog ("popErrorDialog", data, populateOptionLists[0], newPopListDataAdded); },
					 	clearOption: true,
					 	modelKey: "crosslinkers",
					},
                    {data: data.enzymes, domid: "#paramEnzyme", niceLabel: "Enzyme", filter: true, required: true, multiple: false, placeHolder: "Select An Enzyme",
					 	maskAsSingle: true, 
					 	multipleButton: {
							text: "Construct Sequential Digestion",
							icon: "ui-icon-wrench",
							func: function (poplist, elem, selElem) {
								switchEnzymeControls (true);
								$("#digestAccordionContainer").accordion({active: 0});
							},
						},
					 	modelKey: "enzyme",
					},
                    {data: data.modifications, domid: "#paramFixedMods", niceLabel: "Fixed Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Fixed Modifications", clearOption: true, modelKey: "fixedMods"},
                    {data: data.modifications, domid: "#paramVarMods", niceLabel: "Variable Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Var Modifications", addNew: false, clearOption: true, modelKey: "varMods"},
                    {data: data.ions, domid: "#paramIons", niceLabel: "Ions", required: true, multiple: true, filter: false, placeHolder: "Select At Least One Ion", clearOption: true, modelKey: "ions"},
                    {data: data.losses, domid: "#paramLosses", niceLabel: "Losses", required: false, multiple: true, filter: false, placeHolder: "Select Any Losses", addNew: false, clearOption: true, modelKey: "losses"},
					{data: data.xiversions, domid: "#paramXiVersion", niceLabel: "Xi Version", required: true, multiple: false, filter: true, placeHolder: "Select Xi Version", addNew: false, clearOption: false, modelKey: "xiversion"}
                ];
				makeMultipleSelectionElements (populateOptionLists, data.userRights.canSeeAll);	// call the function that does the multiple select setting-up
				
				
				// Make multi-digest accordion
				var curSelect = $("#paramEnzymeSelect").multipleSelect("getSelects")[0];
				CLMSUI.jqdialogs.makeMultiDigestAccordion ("paramEnzyme", data.enzymes, {mc: d3.select("#paramMissedCleavagesValue").property("value"), enzymeId: curSelect}, {revertFunc: switchEnzymeControls, buildMultipleSelect: makeMultipleSelectionWidget});
				switchEnzymeControls (false);
				
				// listen to crosslinker selection changes
				delegateModel.listenTo (model, "change:crosslinkers", function () {
					var crossLinkerCount = model.get("crosslinkers").length;
					d3.select("#paramCrossLinker").select(".beAware")
						.text("! "+crossLinkerCount+" Cross-Linkers selected !")
						.style ("display", crossLinkerCount > 1 ? null : "none")
					;
					var jqClearAllButton = $(d3.select("#paramCrossLinker").select(".clearAll").node());
					jqClearAllButton.button (crossLinkerCount > 0 ? "enable" : "disable");
				});
				
				
                // Make previous acquisition and sequence tables
                
                // Helper functions
				var d3Tables = {};
				
                // Maintains labels that appear next to sequence / acquisition headers to show state of current selection. Removeable by clicking close icon.
                var makeRemovableLabels = function (domid, baseId, modelKey) {
					var oids = model.get(modelKey);
					var oidSet = d3.set (oids);
					var tdata = d3Tables[baseId].getData();
					var ftdata = tdata.filter (function (d) { return oidSet.has(d.id); });
					
                    var labels = d3.select(domid).selectAll("span.removable").data(ftdata, function(d) { return d.id; });
                    labels.exit().remove();
                    var buts = labels.enter()
                        .append("span")
                        .attr("class", "removable")
                        .text(function(d) { return d.name+ " (" + d.id + ")"; })
                            .append ("button")
                            .text (function(d) { return "De-select "+d.id; })
                            .on ("click", function(d) {
                                d.selected = false;
								setModelFromAcc (modelKey, false, d.id);
                            })
                    ;
                    // make close buttons jquery-ui buttons
                    buts.each (function() {
                        $(this).button ({
                            icons: { primary: "ui-icon-circle-close"},
                            text: false,    // jquery-ui will use existing text as tooltip
                        });
                    });
					
					d3.select(domid).select("span.noneChosen").style("display", labels.empty() ? null : "none");	
                };
   
                // Mouse listeners; listens to mouse click on table rows and on checkbox within those rows to (un)select seqs/acqs
				// need base id as well so can't send as eventHooks to d3 table	
				var addWholeRowListeners = function (rowSel, modelKey) {
					rowSel
                        .on("click", function (d) {
                            d.selected = !!!d.selected;
							d3.select(this)
								.select("input[type=checkbox]")
								.property ("checked", function (d) { return d.selected; })
							;
							setModelFromAcc (modelKey, d.selected, d.id);
                        })
                    ;
				};
				
				var addSelectionListeners = function (rowSel, modelKey) {
					rowSel.select("input[type=checkbox]")
						.property ("checked", function (d) { return d.selected; })
						.classed ("verticalCentred", true)
                        .on ("click", function(d) {
                            d3.event.stopPropagation(); // don't let parent tr catch event, or it'll just revert the checked property
                            d.selected = !!!d.selected;
							d3.select(this)
								.property ("checked", function (d) { return d.selected; })
							;
							setModelFromAcc (modelKey, d.selected, d.id);
                        })
                    ; 
				};
				
				
				/* Faster to set button classes directly, 20x faster in fact - 3840ms for makeJQUIButtons, 190ms for this routine */
				/* 6/3/18: above applied when table was made for entire dataset, not just a few rows */
                var styleSingleDownloadButton = function () {
                    var sel = d3.select(this);
                    sel
                        .attr("class", "download ui-button ui-widget ui-corner-all ui-state-default ui-button-icon-only")
                        // hide button if no files (shouldn't happen but it can)
                        .style("display", function(d) { 
							if (d.value) { d = d.value; };
							return !d.files || d.files.length > 0 ? null : "none"; 
						})
                    ;
                    sel.append("span").attr("class", "ui-button-icon-primary ui-icon ui-icon-arrowthickstop-1-s");
                    sel.append("span").attr("class", "ui-button-text");
                };
				
				var addDownloadListeners = function (rowSel) {
					rowSel.select("button.download")
						.each (styleSingleDownloadButton)
                        .on ("click", function(d) {
                            d3.event.stopPropagation(); // don't let parent tr catch event, or it'll just revert the checked property
							if (d.value) { d = d.value; };	// if selection based on cells rather than rows then format will be d:{key:k,value:data} not d:data
						
                            if (d) {
                                var fdata = {type: d.files ? "acq" : "seq", datum: d};

                                $.ajax ({
                                    type: "POST",
                                    url: "./php/getFileDetails.php",
                                    data: fdata,
                                    dataType: "json",
                                    encode: true,
                                    success: function (response, textStatus, jqXhr) {
                                        if (response.error) {
                                            CLMSUI.jqdialogs.errorDialog ("popErrorDialog", response.error, response.errorType);
                                        } else if (response) {
                                            if (response.badFileCount) {
                                                CLMSUI.jqdialogs.errorDialog ("popErrorDialog", response.badFileCount+" of the requested files cannot be found on the server<br>"+errorDateFormat (new Date()), "File Error");
                                            }
                                            for (var goodIndex = 0; goodIndex < response.goodFileCount; goodIndex++) {
                                                // rather than bring back the file name to the server and send them to a php page, which could be well dodgy
                                                // (cos people could try filenames they shouldn't have access to, or get to know the filesystem setup etc)
                                                // we now build a queue of files server side in getFileDetails.php and call them by index
                                                //var url = "./php/downloadSeqAcq.php?relPath="+fileData.file;
                                                var url = "./php/downloadSeqAcq.php?queueIndex="+goodIndex;
                                                if (goodIndex === 0) {
                                                    window.location = url;
                                                } else {
                                                    window.open(url, "_blank");
                                                }
                                            }
                                        }
                                    },
                                    error: function () {
                                        CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "This feature is embargoed until xi3 release<br>"+errorDateFormat (new Date()), "Feature Embargo");
                                        //CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "An Error occurred when trying to access these files<br>"+errorDateFormat (new //Date()), "File Error");
                                    },
                                });
                            }
                        })
                    ;
				}
                
                var addToolTipListeners = function (cellSel) {
                    function enumerateText (arr) {
                        var enumArr = arr.map (function (d) {
                           return "<span class='acqTooltipDetails'>"+d+"</span>";   // acqNumber style does automatic css numbering, cool!
                        });
                        return enumArr.join("");
                    }
                    
                    cellSel
                        .on ("mouseover", function(d) {
							var datum = d.value[d.key];
                            var text = $.isArray(datum) ? enumerateText(datum) : datum;
                            CLMSUI.tooltip
                                .updateText (d.key, text)
                                .updatePosition (d3.event)
                            ;
                        })
                        .on ("mouseleave", CLMSUI.tooltip.setToFade)
                    ;
                };
				
				
				var applyHeaderStyling = function (headerSel, autoWidths) {
					var vcWidth = Math.floor (100.0 / Math.max (1, autoWidths.size() + 1))+"%";
                    
                    headerSel
						.classed ("ui-state-default", true)
                        .filter (function(d) { return autoWidths.has(d.key); })
                        .classed ("varWidthCell", true)
                        .style ("width", vcWidth)
                    ;
				};
                
				var cellD3Hooks = {
					file: addToolTipListeners,
					files: addToolTipListeners,
					name: addToolTipListeners,
					download: addDownloadListeners,
				};
				
				
				// for sorting / filtering column of multiple acquisitions
				var alphaArrayTypeSettings = {
					preprocessFunc: function (filterVal) {
						return this.typeSettings("alpha").preprocessFunc (filterVal);
					},
					filterFunc: function (datum, processedFilterVal) {
						var basicFilterFunc = this.typeSettings("alpha").filterFunc;
						var pass = false;
						if (Array.isArray(datum)) {
							// just need 1 element in array to not be filtered out to pass
							for (var m = 0; m < datum.length; m++) {
								if (basicFilterFunc (datum[m], processedFilterVal)) {
									pass = true;
									break;
								}
							}
						} else {
							pass = basicFilterFunc (datum, processedFilterVal);
						}
						return pass;
					},
					comparator: function (a, b) {
						var comparator = this.typeSettings("alpha").comparator;
						var minlen = Math.min (a.length, b.length);
						for (var n = 0; n < minlen; n++) {
							var diff = comparator (a[n], b[n]);
							if (diff !== 0) {
								return diff;
							}
						}

						var z = a.length - b.length;
						return z;
					}
				};
				
				
                // Settings for tables of previous acquisitions / sequences
                var previousSettings = {
                    acq: {domid: "#acqPrevious", 
						  data: data.previousAcqui, 
						  niceLabel: "Acquisitions", 
						  required: true, 
						  selectSummaryid: "#acqSelected", 
						  columns: ["id", "name", "date", "user", "files", "#", "download", "selected"], 
						  autoWidths: d3.set(["files", "name"]), 
						  hide: {download: false},
						  types: {id: "numeric", "#": "numeric", selected: "boolean", download: "none", files: "alphaArray"},
						  modelKey: "acquisitions",
					},
                    seq: {domid: "#seqPrevious", 
						  data: data.previousSeq, 
						  niceLabel: "Sequences", 
						  required: true, 
						  selectSummaryid: "#seqSelected", 						  
						  columns: ["id", "name", "date", "user", "file", "download", "selected"], 
						  autoWidths: d3.set(["file", "name"]), 
						  hide: {},
						  types: {id: "numeric", "#":"numeric", selected: "boolean", download: "none"},
						  modelKey: "sequences",
					},
                };
                d3.values(previousSettings).forEach (function (psetting) {
                    var sel = d3.select (psetting.domid);
					var baseId = psetting.domid.slice(1)+"Table";
					
					//console.log ("pd", psetting);
					
					var names = {selected: "chosen"};
					var columnMetaData = psetting.columns.map (function (field) {
						var visible = psetting.hide[field] !== undefined ? psetting.hide[field] : true;
						return {name: names[field] || field, id: field, type: psetting.types[field] || "alpha", visible: visible, removable: true, tooltip: ""}
					});
					
					var cellStyles = {selected: "centreContent", download: "centreContent"};
					psetting.autoWidths.values().forEach (function (key) {
						cellStyles[key] = "varWidthCell";
					});
					
					var modifiers = {
						selected: function () {
							return "<input type='checkbox'></input>"
						},
						download: function () {
							return "<button class='download'></button";
						}
					};
					
					var headerEntries = columnMetaData.map (function (cmd) { return {key: cmd.id, value: cmd}; });
					var d3tab = sel.append("div").attr("class", "d3tableContainer")
						.datum({
							data: psetting.data, 
							headerEntries: headerEntries, 
							cellStyles: cellStyles,
							cellD3Hooks: cellD3Hooks,
							columnOrder: headerEntries.map (function (hentry) { return hentry.key; }),
						})
					;
					var table = CLMSUI.d3Table ();
					d3Tables[baseId] = table;
					table (d3tab);
					d3tab.select("table").classed("previousTable", true);
					applyHeaderStyling (table.getHeaderCells(), psetting.autoWidths);
					//console.log ("table", table);

					// set initial filters
					var keyedFilters = {};
					headerEntries.forEach (function (hentry) {
						keyedFilters[hentry.key] = {value: "", type: hentry.value.type}	
					});

					var empowerRows = function (rowSelection) {
						addWholeRowListeners (rowSelection, psetting.modelKey);
						addSelectionListeners (rowSelection, psetting.modelKey);
					};
					
					
					table
						.typeSettings ("alphaArray", alphaArrayTypeSettings)
						.filter (keyedFilters)
						.dataToHTML (modifiers)
						.postUpdate (empowerRows)
						.pageSize(10)
						.update()
					;
					
					delegateModel.listenTo (model, "change:"+psetting.modelKey, function () {
                        // make removable labels outside of accordion area for selected rows
						console.log ("modelKey", psetting.modelKey);
                        makeRemovableLabels (psetting.selectSummaryid, baseId, psetting.modelKey);
						
						var d3table = d3Tables[baseId];
						var itemSet = d3.set(model.get(psetting.modelKey));
						d3table.getData().forEach (function(d) {
							d.selected = itemSet.has(d.id);
						});
						d3table.refilter().update();
						
						addSelectionListeners (d3table.getAllRowsSelection(), psetting.modelKey);
					});
                });
                
                // dragover effect for drag'n'dropping files
                // adapted from https://github.com/blueimp/jQuery-File-Upload/wiki/Drop-zone-effects
                d3.select("body").on ("dragover", function () {
                     var dropZones = $('.fileupload'),
                        timeout = window.dropZoneTimeout;
                    if (timeout) {
                        // cancel any previous timeout if dragging still ongoing
                        clearTimeout(timeout);
                    } else {
                        // otherwise highlight droppable areas on first go
                        dropZones.addClass('in');
                    }
                    
                    var hoveredDropZone = $(d3.event.target).closest(dropZones);
                    dropZones.not(hoveredDropZone).removeClass('hover');
                    hoveredDropZone.addClass('hover');
                    // this clears the hover class once the drag action is no longer in effect
                    window.dropZoneTimeout = setTimeout(function () {
                        window.dropZoneTimeout = null;
                        dropZones.removeClass('in hover');
                    }, 100);                 
                });

                // Sections to control availability of main submit button and explain why disabled if so
                d3.select("#todo").selectAll("span").data(["ui-icon", "todoStatus", "todoMissing"])
                    .enter()
                    .append("span")
                    .attr ("class", function(d) { return d; })
                ;

                var happyToDo = function (happy) {
                    d3.select("#todo .ui-icon")
                        .classed ("ui-icon-notice", !happy)
                        .classed ("ui-icon-check", happy)
                    ;
                    d3.select("#todo")
                        .classed ("paramSubmitReady", happy)
                    ;
                };

                var toDoMessage = function (msg, missing) {
                    d3.select("#todo .todoStatus").text(msg);
					d3.select("#todo .todoMissing").text(missing);
                };
                
                dispatchObj.on ("formInputChanged", function () {
					var missingFields = model.validate();
					var missingList = missingFields ? missingFields : d3.set();
					var noneMissing = missingList.empty();
					
                    $("#startProcessing").button("option", "disabled", !noneMissing || (data.noSearchAllowed === true));
                    happyToDo (noneMissing);
                    toDoMessage (noneMissing ? "Ready to Submit" : "To enable Submit, selections are required for:", missingList.values().join(", "));
                });
                dispatchObj.formInputChanged();



                // AJAX form submission
                // PITA have to reconstruct form data from all fields (marked them with .formPart class to make it easier)
                $("#parameterForm").submit(function (event) {
                    event.preventDefault();

                    $("#startProcessing").button("option", "disabled", true);   // so user can't press again
                    toDoMessage ("Processing");
					
					function submitFailSets () {
                        toDoMessage ("Error, search submit failed.");
                        happyToDo (false);
                        $("#startProcessing").button("option", "disabled", false);
                    }
					
					finaliseModel ();
					d3.select("body").style("cursor", "wait");
					model.save (undefined,
						{
							success: function (model, response, options) {
								console.log ("db params insert success", response, textStatus);
								if (response.redirect) {
									redirector (response.redirect);    // redirect if server php passes this field (should be to login page)     
								}
								else if (response.status === "success") {
									toDoMessage ("Success, Search ID "+response.newSearch.id+" added.");
									window.location.assign ("../history/history.html");
								} else {
									CLMSUI.jqdialogs.errorDialog ("popErrorDialog", response.error, response.errorType);
									submitFailSets();
								}
							},
							error: function (model, response, options) {
								CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "Submit failed on the server before reaching the database<br>"+errorDateFormat (new Date()), "Connection Error");
								submitFailSets();
								d3.select("body").style("cursor", null);
							},
							url: "php/submitParams.php",
						}
					);
                });


                // Function to control actions/consequences of upload/delete buttons in seq/acq upload forms
                // Includes logic to enable/disable buttons if using them makes no sense
                var formActions = function (textinputid, formid, type) {
                    var nonzeroes = {filesAwaiting: 0, namelength: 0,};
                    var enabler = function () {
                        var vals = d3.values (nonzeroes);

                        var submitBlocked = vals.some (function(d) { return d === 0; });
                        //console.log (vals, "submitBlocked", submitBlocked, formid, $(formid+" button[type='submit']"));
                        var buttons = $(formid+" button[type='submit']");
                        buttons.button ("option", "disabled", submitBlocked);

                        var resetBlocked = (nonzeroes.filesAwaiting === 0);
                        buttons = $(formid+" button[type='reset']");
                        buttons.button ("option", "disabled", resetBlocked); 
                        
                        // disable single file upload inputs if a file is waiting to upload i.e. already selected
                        // this is trickier because it's not a button, it's an input wrapped in a span with a button role
                        var singleFileUploadOnly = !resetBlocked;
                        buttons = $(formid+" input[name='files']");
                        buttons.prop ("disabled", singleFileUploadOnly);
                        var spans = buttons.parents(".fileinput-button");
                        spans
                            .toggleClass ("ui-button-disabled ui-state-disabled", singleFileUploadOnly)   // force span to look disabled
                            .removeClass ("ui-state-hover")   // dunno why hover state doesn't switch off by itself, maybe because the button gets disabled?
                        ;
                        
                    };
                    this.buttonEnabler = enabler;
                    var uploadSuccess = true;
                    var filesUploaded = [];
                    var rowCountFunc = function () { return d3.select(formid).selectAll("tr.template-upload").size(); };   // data.files.length;

                    $(formid).on({
                        "fileuploadstart": function (e, data) {
                            console.log ("file upload started", e, data);
                            uploadSuccess = true;
                        },
                        "fileuploadadded": function (e, data) {
                            nonzeroes.filesAwaiting = rowCountFunc();
                            enabler();
                            dispatchObj.newFileAdded (type, data.files[0].name);
                        },
                        "fileuploadprocessfail": function (e, data) {
                             console.log ("file upload process fail", e, data);
                             if (data.files && data.files[0]) {
                                //data.files[0].error = "A file upload process failed<br>"+errorDateFormat (new Date());
                                data.files[0].error = (data.files[0].error || "") + "<br>" +errorDateFormat (new Date());
                             }
                             CLMSUI.jqdialogs.errorDialog ("popErrorDialog", data.files[0].error, "File Upload Error");
                             uploadSuccess = false;
                             data.abort();
                        },
                        "fileuploadfail": function (e, data) {  // called before template rendered   
                            if (data.errorThrown && data.errorThrown.name == "SyntaxError") {
                                // This usually means a html-encoded php error that jquery has tried to json decode
                                if (data.files && data.files[0]) {
                                    console.log ("ddd", data, data.files[0].error);
                                    data.files[0].error = "A file upload failed<br>"+errorDateFormat (new Date());
                                }
                                //console.log ("ferror", data, $(data.jqXHR.responseText).text(), e);
                                CLMSUI.jqdialogs.errorDialog ("popErrorDialog", data.files[0].error, "File Upload Error");
                            }
                            uploadSuccess = false;
                        },
                        "fileuploadfailed": function (e, data) {    // called after template rendered                         
                            console.log ("file upload failed", e, data);
                            if (data.errorThrown === "abort") {
                                nonzeroes.filesAwaiting = rowCountFunc();
                                if (!nonzeroes.filesAwaiting) {
                                    enabler();
                                    dispatchObj.newFileAdded (type, "");
                                }
                            }
                            uploadSuccess = false;
                        },
                        "fileuploaddone": function (e, data) {
                            console.log ("file upload done", e, data);
                            filesUploaded.push (data.files[0].name);
                        },
                        "fileuploadstopped": function (e, data) {
                            console.log ("file upload stopped", e, data, uploadSuccess);
                            dispatchObj.newFileAdded (type, "");
                            if (uploadSuccess) {
                                var privateElem = d3.select(formid).select(".privacy");
                                var private = privateElem.empty() ? false : privateElem.property("checked");
                                var formData = {
                                    name: d3.select(textinputid).property("value"),
                                    filenames: filesUploaded,
                                    type: type,
                                    tabID: getTabSessionVar(),
                                    private: private,
                                };
                                
                                $.ajax ({
                                    type: "POST",
                                    url: "php/submitSeqAcq.php",
                                    data: formData,
                                    dataType: "json",
                                    encode: true,
                                    success: function (response, textStatus, jqXhr) {
                                        if (response.redirect) {
                                            redirector (response.redirect);    // redirect if server php passes this field (should be to login page)       
                                        } else if (response.error) {
                                            CLMSUI.jqdialogs.errorDialog ("popErrorDialog", response.error, response.errorType);
                                        } else {
                                            var newRow = response.newRow;
                                            
                                            console.log ("db acq/seq insert success", response, textStatus);
                                            if (newRow && newRow.files) {
                                                newRow["#"] = newRow.files.length;
                                            }
                                            console.log ("newRow", newRow);
                                            dispatchObj.newEntryUploaded (type, newRow);    // alert new row has been added to db
                                        }
                                    },
                                    error: function (jqXhr, textStatus, errorThrown) {
                                        CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "Cannot reach database to insert "+type+" details<br>"+errorDateFormat (new Date()), "Connection Error");
                                    },
                                });
                                
                                filesUploaded.length = 0;
                            }
                            nonzeroes.filesAwaiting = rowCountFunc();
                            enabler();
                        },
                    });
                    d3.select(textinputid).on("input", function () {
                        nonzeroes.namelength = this.value.length;
                        enabler();
                    });

                    return this;
                };
                
                // when a new file added for possible upload, check previous tables to see if the same name is there already
                // which may indicate user can re-use old data
                dispatchObj.on ("newFileAdded", function (type, fileName) {
                    var uploadPanel = d3.select("#"+type+"Upload");
					var psetting = previousSettings[type];
                    var data = psetting.data;
					var sel = d3.select (psetting.domid);
					var baseId = psetting.domid.slice(1)+"Table";
                    var hits = 0;
                    
                    if (fileName) {
						var d3table = d3Tables[baseId];
						var oldFilter = d3table.filter();
						// true = deep copy, 'cos elements in oldFilter are objects themselves that will be directly changed otherwise (and thus oldfilter won't work)
						var newFilter = $.extend (true, {}, oldFilter);
						$.each (newFilter, function (key) {
							newFilter[key].value = "";
						});
						newFilter[type === "seq" ? "file" : "files"] = {value: fileName, type: "alpha"};
						d3table.filter (newFilter);
                        hits = d3table.getFilteredSize();
						
                        if (hits > 0) { // alert user if possible matches in linked previous table
                            uploadPanel.select(".dynamicFileExistsInfo").text("Filename "+fileName+" is present in "+hits);
                        } else { // restore old search if no hits
                            d3table.filter(oldFilter);
                        }
						d3table.update();
                    } 
                    uploadPanel.select(".fileNameExists").style("display", hits ? "inline" : null);
                });

                // if new row added, then add it to the correct table of previous results
                dispatchObj.on ("newEntryUploaded", function (type, newRow) {
                    var tableId = type+"PreviousTable";
					var modelKeyMap = {
						"acq" : "acquisitions",
						"seq" : "sequences",
					};
					var d3table = d3Tables[tableId];
					d3table.getData().push (newRow);
					
					// this will poke model to update removableLabels and d3table views
					setModelFromAcc (modelKeyMap[type], true, newRow.id);
                });

                // Make the two file upload forms
                var seqFormActions = new formActions ("#newseqID", "#seqfileupload", "seq");
                var acqFormActions = new formActions ("#newacqID", "#acqfileupload", "acq");
                [seqFormActions, acqFormActions].forEach (function(formAct) { formAct.buttonEnabler(); });
                
                
				// function to return default settings from php (global, lastSearch, or specificSearch)
				var loadDefaults = function (postData, isGlobalDefaults, buttonName) {
					model.fetch({
						data: postData,
						success: function (model, response, options) {
							console.log ("fetch succ response", model, response, options);
							if (response.redirect) {	// success but redirect to other page
								redirector (response.redirect);    // redirect if server php passes this field (should be to login page)        
							}
							else if (response.error) {	// success error (i.e. one we've identified, not a php/data format error)
								CLMSUI.jqdialogs.errorDialog ("popErrorDialog", response.error[0]+"<br>"+response.error[1], response.errorType || "No Last Search Exists");
								if (!isGlobalDefaults) {
									$("#useGlobalDefaults").click();
								}
							} else {	// success success, what we want to happen
								updateFieldsWithValues (response, data);
							}
						},
						error: function (model, response, options) {
							console.log ("fetch err response", model, response, options);
							CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "An Error occurred when trying to access the database for "+buttonName+"<br>"+errorDateFormat (new Date()), "Connection Error");
							if (!isGlobalDefaults) {
								$("#useGlobalDefaults").click();
							}
						},
						url: "php/getSpecificDefaults.php"
					});
				};
				
                // Make default loader buttons
                var defaultButtonMap = [
                    {id: "#useLastSearchDefaults", data: "last", isGlobal: false},
                    {id: "#useGlobalDefaults", data: "global", isGlobal: true},
                ];
                defaultButtonMap.forEach (function (defaultButton) {
                    d3.select(defaultButton.id).on("click", function() {
						loadDefaults ({sid: defaultButton.data}, defaultButton.isGlobal, d3.select(defaultButton.id).text());
                    });
                });
                

				// load in search params according to url 'base' parameter or, if not present, load in global defaults
				var urlParams = {};
				location.search.substr(1).split("&").forEach (function (item) {
					var keyValue = item.split("=");
					urlParams[keyValue[0]] = keyValue[1];
				});
				console.log (urlParams);
				if (urlParams.base) {
					loadDefaults ({sid: urlParams.base}, false, "Specific Defaults");
				} else {
					// programmatic click on global default button, load fields with those defaults
                	$("#useGlobalDefaults").click();
				}
            }
        }
    });


    
    function updateFieldsWithValues (searchSettings, possibleValues) {
        console.log ("search settings", searchSettings);
        
        var multiSelectSetFunc = function (domElem, mdata, options) {
            if (!(mdata instanceof Array)) {
                mdata = [mdata];
            }
            $(domElem).multipleSelect("setSelects", mdata);
			if (options && options.postFunc) {
				options.postFunc ($(domElem));
			}
        };
        
        var numberSetFunc = function (domElem, value) {
            $(domElem).spinner("value", value);
        };
        
        var jquerySelectSetFunc = function (domElem, value) {
            $(domElem)
                .val(value)
                .selectmenu("refresh")
                .selectmenu({width: "auto"})
            ;
        };
		
		var checkboxSetFunc = function (domElem, value) {
			console.log ("dd", domElem, "v", value);
			d3.select(domElem).property ("checked", value ? true : false);	
		};
        
        var textAreaSetFunc = function (domID, newValue, options) {
            var hashlessDomID = domID.slice(1);
            var userAltered = CLMSUI.buildSubmitSearch.userAltered[hashlessDomID];
            var currentValue = $(domID).val();
            // console.log ("user altered", domID, userAltered, currentValue);
            // overwrite logic:
            // Happens When
            // 1. The new value is non-falsey OR if the emptyOverwrite option is set (so "" can be passed in)
            // AND
            // 2. We haven't registered user input in the textfield since the last overwrite OR the current value is empty
            if ((newValue || options.emptyOverwrite) && (!userAltered || !currentValue)) {
                $(domID).val (newValue);
                CLMSUI.buildSubmitSearch.userAltered[hashlessDomID] = false;    // reset to no user input having occurred
                if (options.postFunc && currentValue != newValue) {
                    options.postFunc (domID, newValue);
                }
            }
        };
        
        var elementMap = {
            "#paramToleranceValue" : {field : "ms_tol", func: numberSetFunc},
            "#paramTolerance2Value" : {field : "ms2_tol", func: numberSetFunc},
            "#paramMissedCleavagesValue" : {field : "missed_cleavages", func: numberSetFunc},
            "#paramToleranceUnits" : {field : "ms_tol_unit", func: jquerySelectSetFunc},
            "#paramTolerance2Units" : {field : "ms2_tol_unit", func: jquerySelectSetFunc},
            "#paramCrossLinkerSelect" : {field : "crosslinkers", func: multiSelectSetFunc},
            "#paramEnzymeSelect" : {field : "enzyme", func: multiSelectSetFunc},
            "#paramIonsSelect" : {field : "ions", func: multiSelectSetFunc},
            "#paramFixedModsSelect" : {field : "fixedMods", func: multiSelectSetFunc},
            "#paramVarModsSelect" : {field : "varMods", func: multiSelectSetFunc},
            "#paramLossesSelect" : {field : "losses", func: multiSelectSetFunc},
			"#paramXiVersionSelect": {field : "xiversion", func: multiSelectSetFunc},
            "#paramNotesValue" : {field : "notes", func: textAreaSetFunc, options: {emptyOverwrite: false},},
            "#paramCustomValue" : {field : "customsettings", func: textAreaSetFunc, 
				options: {
					emptyOverwrite: true, 
					postFunc: function (domID, value) {
						$("#paramCustom").accordion("option", "active", 0); 
						
						var multiDigestionLineRegex = new RegExp ("^\s*digestion:MultiStepDigest.*NAME=.*$", "gmi");
						var multiDigestionLine = value.match (multiDigestionLineRegex);
						if (multiDigestionLine) {
							CLMSUI.jqdialogs.populateMultipleDigestion (d3.select("#digestAccordionContent"), multiDigestionLine[0], possibleValues.enzymes, searchSettings);
							value = value.replace (multiDigestionLineRegex, "");
							model.set ("customsettings", value);
							$(domID).val(value);	// new new value
						}
						switchEnzymeControls (multiDigestionLine ? true : false);
					},
				},
            },
			"#privacy" : {field: "privateSearch", func: checkboxSetFunc}
			// acq/seq table selections aren't updated by search params
            //"#acqPreviousTable" : {field : "acquisitions", func: dynamicTableSetFunc},
            //"#seqPreviousTable" : {field : "sequences", func: dynamicTableSetFunc},
        };
        
        d3.entries(elementMap).forEach (function (entry) {
            var exists = d3.select(entry.key);
            var evalue = entry.value;
            if (!exists.empty()) {
                evalue.func (entry.key, searchSettings[evalue.field], evalue.options);
            }
        });
    }
	
	
	function finaliseModel () {
		var custom = model.get("customsettings");
		var digestAccordionSel = d3.select("#digestAccordionContainer");
		var customMultiDigest = digestAccordionSel.style("display") !== "none" ? CLMSUI.jqdialogs.generateMultipleDigestionString (digestAccordionSel) : ""; 
		if (customMultiDigest) {
			model.set("customsettings", custom + "\n" + customMultiDigest);
		}
	}

    canDoImmediately();
};