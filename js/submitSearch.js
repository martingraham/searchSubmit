/*jslint browser: true, white: true, bitwise: true, plusplus: true, stupid: true, maxerr: 150*/
var CLMSUI = CLMSUI || {};

/**
* Function that builds and populates the submit search page and associated controls.
* @namespace CLMSUI.buildSubmitSearch
*/
CLMSUI.buildSubmitSearch = function () {

    // enable/disable console logging
    (function (original) {
        console.enableLogging = function () {
            console.log = original;
        };
        console.disableLogging = function () {
            console.log = function () {};
        };
    })(console.log);
    console.disableLogging();

    CLMSUI.testForFileExistence = true;

    var errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");
    var integerFormat = d3.format(",.0f");

    /**
    * Function that sets an incrementing counter for this page in session storage.
    * This is to handle people doing concurrent uploads on multiple tabs.
    * @memberof CLMSUI.buildSubmitSearch
    */
    function setTabSessionVar () {
        var lastId = window.localStorage.lastId || '0';
        var newId = (parseInt(lastId, 10) + 1) % 10000;
        window.localStorage.lastId = newId;
        window.sessionStorage.setItem ("tab", newId);
    }

    /**
    * Function that gets the current counter for this page from session storage
    * This is to handle people doing concurrent uploads on multiple tabs.
    * @memberof module:buildSubmitSearch
    * @returns counter
    */
    function getTabSessionVar () {
        return window.sessionStorage ? window.sessionStorage.getItem ("tab") : "1";
    }

    // redirect via explanatory dialog if not logged in
    function redirector (redirectUrl, why) {
        CLMSUI.jqdialogs.redirectDialog ("popErrorDialog", redirectUrl, why);
        //window.location.replace (loginUrl);
    }

    /**
    * Function that escapes common html characters
    * @param html string
    * @returns escaped html string
    */
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

    /**
    * Flick between single and multiple step digestion controls
    * @param multiOn - true to shop multiple step digestion controls
    */
    function switchEnzymeControls (multiOn) {
        d3.select("#paramEnzyme").select(".horizontalFlex .ms-parent.formPart").style("display", multiOn ? "none" : null);
        d3.select("#digestAccordionContainer").style("display", multiOn ? null : "none");
    };

    /**
    *  Backbone model type to hold submission data, includes validate function
    */
    var Submission = Backbone.Model.extend ({
        validate: function () {
            var missing = d3.set();
            var test = ["ions", "acquisitions", "sequences", "crosslinkers", "enzyme", "xiversion", "noLoading"];
            test.forEach (function (field) {
                var val = this.get(field);
                if (!val || ($.isArray(val) && !val.length)) {
                    missing.add(field);
                }
            }, this);
            return !missing.empty() ? missing : undefined;
        }
    });

    /**
    *   Instance of Submission backbone model use throughout rest of script
    */
    var model = new Submission ({
        searchName: undefined,
        ms_tol: undefined,
        ms2_tol: undefined,
        missed_cleavages: undefined,
        ms_tol_unit: undefined,
        ms2_tol_unit: undefined,
        crosslinkers: undefined,
        enzyme: undefined,
        ions: undefined,
        fixedMods: undefined,
        varMods: undefined,
        losses: undefined,
        xiversion: undefined,
        notes: undefined,
        customsettings: undefined,
        acquisitions: undefined,
        sequences: undefined,
        privateSearch: null,
        missedPeaks: undefined,	// unused at the moment, but there for future reference
        noLoading: true,	// flag thats set false when uploading starts and reset when ends. Used to disable submit button.
    });

    this.buildSubmitSearch.model = model;	// expose for testing


    /**
    *   Interface elements that can be built without waiting for database queries to return
    *   Mainly all the layout and empty widgets that make up the page
    */
    function canDoImmediately () {
        // Make acquisition and sequence divs via shared template
        var acqSeqTemplateData = [
            {id: "#sequence", fields: {"singleLabel":"Sequence", "pluralLabel":"Sequences", "sPronoun":"A", "partialId":"seq", "fileTypes":".fasta,.txt", "tabVal": getTabSessionVar()}, modelAttr: "sequences"},
            {id: "#acquire", fields: {"singleLabel":"Acquisition", "pluralLabel":"Acquisitions", "sPronoun": "An", "partialId":"acq", "fileTypes":".mgf,.msm,.apl,.zip", "tabVal":getTabSessionVar(), multipleUpload: true}, modelAttr: "acquisitions"},
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

            function setAreaValue (val) {
                model.set (settings.modelKey, val);	// this sets model for textarea inputs
                CLMSUI.buildSubmitSearch.userAltered[tid] = true;
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
                    setAreaValue (this.value)
                })
                .on ("input", function() {
                    setAreaValue (this.value)
                })
                .on ("paste", function() {
                    setAreaValue (this.value)
                })
            ;
        });


        // Make number inputs
        var numberInputSettings = [
            {domid: "#paramTolerance", niceLabel: "Ms Tolerance", min: 0, step: "any", modelKey: "ms_tol"},
            {domid: "#paramTolerance2", niceLabel: "Ms2 Tolerance", min: 0, step: "any", modelKey: "ms2_tol"},
            {domid: "#paramMissedCleavages", niceLabel: "Missed Cleavages", min: 0, step: 1, modelKey: "missed_cleavages"},
            {domid: "#paramMissedPeaks", niceLabel: "Missing Mono-Isotopic Peaks", min: 0, max: 6, step: 1, modelKey: "missedPeaks"},
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
            {selector: "#startProcessing", type: "submit"},
            {selector: "#backButton", type: "button"},
            {selector: "#helpButton", type: "button"},
            {selector: "#logoutButton", type: "button"},
            {selector: "#useGlobalDefaults", type: "button"},
            {selector: "#useLastSearchDefaults", type: "button"},
            {selector: ".removeAllButton", type: "button"},
        ];
        buttonData.forEach (function (buttonDatum) {
            var buttonSelector = buttonDatum.selector;
            $(buttonSelector).button();
            d3.selectAll(buttonSelector).attr("type", buttonDatum.type);
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

        acqSeqTemplateData.forEach (function (datum) {
            d3.select(datum.id).select(".removeAllButton").on("click", function() {
                model.set (datum.modelAttr, []);	//	empty the model field on remove all click
            });
        });

        // Add actions for top-rightbutton
        d3.select("#backButton").on("click", function() { window.history.back(); });
        d3.select("#helpButton").on("click", function() { window.open ("../../xidocs/html/searchSubmit/index.html", "_blank"); });
        d3.select("#logoutButton").on("click", function() { window.location.href = "../../userGUI/php/logout.php"; });
    }

    /**
    *   Populating elements that rely on getting data back from database
    */
    $(document).ready (function () {

        var dispatchObj = d3.dispatch ("formInputChanged", "newEntryUploaded", "newFileAdded");
        function setNotLoadingFlag (booleanValue) {
            // if noloading flag set to false i.e. uploading is occurring, then model will not validate
            // and forminputchanged will disable submit button (needed for long uploads to stop risk of user
            // submitting halfway through)
            model.set ("noLoading", booleanValue);
            dispatchObj.formInputChanged();
        }

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

        /**
        *   Merge run data filenames into acquisition data.
        *   Do this client side to stop bothering the server with it.
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param acquisitions - the acquisition objects as returned from the DB
        *   @param runNames - the runnames to attach to the acquisition objects
        */
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


        /**
        *   This rebuilds a multiple selection widget from scratch.
        *   Needed if switching between single and multiple selection capabilities.
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param singlePopulateOptionList - the multiple select information object
        *   @param elem - the container object for the multiple select (above both the plain select element and multiple select widget)
        *   @param selElem - the basic SELECT element
        */
        function relaunchMultipleSelectionWidget (singlePopulateOptionList, elem, selElem) {
            // remove current multiple select, remove jquery data gubbins, add new multiple select with amended details for crosslinker selection
            elem.select(".ms-parent").remove();
            $(selElem.node()).removeData();
            makeMultipleSelectionWidget (singlePopulateOptionList, selElem.attr("id"));
        };


        /**
        *   Make just the multiple-select.js widget portion of a select mechanism
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param baseId - id of DOM element to house multiple select widget in
        *   @param singlePopulateOptionList - the multiple select information object
        */
        function makeMultipleSelectionWidget (singlePopulateOptionList, baseId) {
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

        /**
        *   This updates the option elements found under a single populateOptionList's DOM id reference with the data items in that object
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param singlePopulateOptionList - the multiple select information object
        *   @param autoSelectNewItems - automatically select new options
        */
        function updateOptionList (singlePopulateOptionList, autoSelectNewItems) {
            var selElem = d3.select(singlePopulateOptionList.domid).select("select");

            var dataJoin = selElem.selectAll("option")
                .data(singlePopulateOptionList.data, function(d) { return d.id; })
            ;
            dataJoin.enter().append("option")
                .attr("value", function(d) { return d.id; })
                .html(function(d) { return singlePopulateOptionList.textFunc ? singlePopulateOptionList.textFunc(d) : d.name; })
                .property ("selected", autoSelectNewItems)
            ;
        };

        /**
        *   Construct select elements and then make multiple select dropdowns (using multiple-select.js) from supplied data (populateOptionLists).
        *   Multiple Select elements need [] appended to name attr, see http://stackoverflow.com/questions/11616659/post-values-from-a-multiple-select.
        *   Basically loops through the populationOptionLists and calls makeMultipleSelectionWidget for each one.
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param multiplePopulateOptionLists - the multiple select information objects
        *   @param newButtonsShouldBeVisible - should the widgets show "New" buttons? i.e. to add new options to the widgets.
        */
        function makeMultipleSelectionElements (multiplePopulateOptionLists, newButtonsShouldBeVisible) {
            multiplePopulateOptionLists.forEach (function (poplist) {
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

                makeMultipleSelectionWidget (poplist, baseId);

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


        /**
        *   This updates an array in the backbone model, replacing old array with new so events are triggered if attached on that property.
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param modelKey - model attribute name
        *   @param add - add or remove element from array, add = true
        *   @param value - value to add or remove
        */
        function setModelFromAcc (modelKey, add, value) {
            var curVals = model.get (modelKey);
            var set = d3.set (curVals);
            set[add ? "add" : "remove"](value);
            model.set (modelKey, set.values());
            console.log ("cur", curVals, modelKey, model);
        };



        /**
        *   This updates options in a select element (calls function above) and then rebuilds the multiple selection widget
        *   data, dom id etc taken from a single PopulateOptionList object. Used solely by the crosslinker dialog.
        *   Generally used in the add dialog functions when just added a new crosslinker, modification etc.
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param singlePopulateOptionList - the multiple select information object
        *   @param newItem - the item to be added to the single PopulateOptionList
        */
        function newPopListDataAdded (singlePopulateOptionList, newItem) {
            updateOptionList (singlePopulateOptionList, true);
            var elem = d3.select(singlePopulateOptionList.domid);
            var selElem = elem.select("select");

            if (singlePopulateOptionList.maskAsSingle !== undefined) {
                singlePopulateOptionList.maskAsSingle = selElem.selectAll("option:checked").size() <= 1;
            }

            relaunchMultipleSelectionWidget (singlePopulateOptionList, elem, selElem);
            setModelFromAcc (singlePopulateOptionList.modelKey, true, newItem.id);
        }


        /**
        *   Any change to model results in form input being validated for enabling/disabling of submit button. This gets fired after any named "change:" events
        */
        var delegateModel = new Backbone.Model({});
        delegateModel.listenTo (model, "change", function () {
            //console.log ("firing general change");
            dispatchObj.formInputChanged();
        });

        /**
        *   Build portions of the interface that depend on database response.
        *   This includes enzyme / crosslinker / modification values, user data, and base search values
        *   @memberof CLMSUI.buildSubmitSearch
        *   @param data - data returned from DB
        *   @param textStatus - response status
        *   @param jqXhr - the xhr object
        */
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

                mergeInFilenamesToAcquistions (data.previousAcqui || [], data.filenames);


                // Make combobox and multiple selection elements
                // Multiple Select uses Jquery-plugin from https://github.com/wenzhixin/multiple-select

                /**
                *   These are the population option lists for building selection widgets.
                *   Include data, labels, dom and model ids, whether multiple selection allowed etc
                *   @memberof CLMSUI.buildSubmitSearch
                */
                var populateOptionLists = [
                    {data: data.xlinkers, domid: "#paramCrossLinker",
                         niceLabel: "Cross-Linker <span class='xlinkerMassHead'>¦ Mass</span><span class='beAware'></span>",
                         filter: true, required: true, multiple: true, maskAsSingle: true, placeHolder: "Select one or more Cross Linkers",
                         multipleButton: {
                            text: "Select Multiple Cross-Linkers",
                            func: function (singlePopulateOptionList, elem, selElem) {
                                singlePopulateOptionList.isOpen = true;
                                relaunchMultipleSelectionWidget (singlePopulateOptionList, elem, selElem)
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
                            func: function (singlePopulateOptionList, elem, selElem) {
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

                /**
                *   Maintains labels that appear next to sequence / acquisition headers to show state of current selection. Removeable by clicking close icon.
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param domid - id of DOM element to put labels in
                *   @param baseId - id of DOM element holding d3table to get selection info from
                *   @param modelKey - the model attribute to change on selection / removal
                */
                var makeRemovableLabels = function (domid, baseId, modelKey) {
                    var oids = model.get(modelKey);
                    var oidSet = d3.set (oids);
                    var tdata = d3Tables[baseId].getData();
                    var ftdata = tdata.filter (function (d) { return oidSet.has(d.id); });

                    var labels = d3.select(domid+" .removables").selectAll("span.removable").data(ftdata, function(d) { return d.id; });
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
                    d3.select(domid).select("span.clearAllRemovables").style("display", labels.size() > 1 ? "inline-block" : "none");
                };


                /**
                *   Test for existence of file reference in table row (stop user assuming it's available when selected as that will cause problems in xisearch)
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param modelKey - the model attribute type which will be either acquisitions or sequences
                *   @param d - data object containing file id and name
                */
                var fileExists = function (modelKey, d) {
                    if (CLMSUI.testForFileExistence) {
                        if (d.selected) {
                            var data = {};
                            data[modelKey+"_id"] = d.id;
                            $.ajax ({
                                type: "GET",
                                url: "./php/testFileExists.php",
                                data: data,
                                dataType: "json",
                                encode: true,
                                complete: function () {

                                },
                                success: function (response, textStatus, jqXhr) {
                                    //console.log ("response", response);
                                    if (response.success === false) {
                                        d.selected = false;
                                        d.badFiles = true;
                                        setModelFromAcc (modelKey, d.selected, d.id);
                                    }
                                },
                                error: function (jqXhr, textStatus, errorThrown) {
                                    console.log (arguments);
                                    CLMSUI.jqdialogs.errorDialog ("popErrorDialog", errorThrown+"<br>"+errorDateFormat (new Date()), "Connection Error");
                                },
                            });
                        }
                    }
                }

                /**
                *   Add row listeners for d3tables. Adds selected/unselected rows to appropriate model attribute and tests for file existence.
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param rowSel - d3 row selection
                *   @param modelKey - the model attribute type which will be either acquisitions or sequences
                */
                var addWholeRowListeners = function (rowSel, modelKey) {
                    rowSel
                        .classed ("rowBadFiles", function (d) { return d.badFiles ? true : false; })
                        .on("click", function (d) {
                            d.selected = !!!d.selected;
                            d3.select(this)
                                .select("input[type=checkbox]")
                                .property ("checked", function (d) { return d.selected; })
                            ;
                            setModelFromAcc (modelKey, d.selected, d.id);
                            fileExists (modelKey, d);
                        })
                    ;
                };

                /**
                *   Add row listeners for d3tables that listen specifically for changes on checkbox selection, but otherwise does the same as the previous function.
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param rowSel - d3 row selection
                *   @param modelKey - the model attribute type which will be either acquisitions or sequences
                */
                var addSelectionListeners = function (rowSel, modelKey) {
                    rowSel.select("input[type=checkbox]")
                        .property ("checked", function (d) { return d.selected; })
                        .property ("disabled", function (d) { return d.badFiles ? true : false; })
                        .classed ("rowBadFiles", function (d) { return d.badFiles ? true : false; })
                        .classed ("verticalCentred", true)
                        .on ("click", function(d) {
                            d3.event.stopPropagation(); // don't let parent tr catch event, or it'll just revert the checked property
                            d.selected = !!!d.selected;
                            d3.select(this)
                                .property ("checked", function (d) { return d.selected; })
                            ;
                            setModelFromAcc (modelKey, d.selected, d.id);
                            fileExists (modelKey, d);
                        })
                    ;
                };



                /**
                *   Style a single download button, which is obtained from the called context (the 'this').
                *   Faster to set button classes directly, 20x faster in fact - 3840ms for makeJQUIButtons, 190ms for this routine
                *   6/3/18: above applied when table was made for entire dataset, not just a few rows
                *   @memberof CLMSUI.buildSubmitSearch
                */
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

                /**
                *   Add listeners via a d3 row selection to a download file button which will download the file referenced by the table row if permitted
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param rowSel - d3 row selection
                */
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

                /**
                *   Add tooltips via mouse listeners on a d3 table cell selection. Array objects are enumerated in tooltip.
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param cellSel - d3 table cell selection
                */
                var addToolTipListeners = function (cellSel) {
                    function enumerateText (arr) {
                        var enumArr = arr.map (function (d) {
                           return "<span class='acqTooltipDetails'>"+d+"</span>";   // acqNumber style does automatic css numbering, cool!
                        });
                        return enumArr.join("");
                    }

                    cellSel
                        .on ("mouseover", function(d) {
                            var datum = d.value ? d.value[d.key] : undefined;
                            var text = $.isArray(datum) ? enumerateText(datum) : datum;
                            CLMSUI.tooltip
                                .updateText (d.key, text)
                                .updatePosition (d3.event)
                            ;
                        })
                        .on ("mouseleave", CLMSUI.tooltip.setToFade)
                    ;
                };


                /**
                *   Apply header and width styling to d3table header cells.
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param headerSel - d3 selection of table header cells
                *   @param autoWidths - array of flags deciding if column has variable width
                */
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


                /**
                *   Settings for tables of previous acquisitions / sequences
                *   @memberof CLMSUI.buildSubmitSearch
                */
                var previousSettings = {
                    acq: {domid: "#acqPrevious",
                          data: data.previousAcqui || [],
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
                          data: data.previousSeq || [],
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

                /**
                *   Make a d3table for each of the previousSettings entries
                *   @memberof CLMSUI.buildSubmitSearch
                */
                d3.values(previousSettings).forEach (function (psetting) {
                    var sel = d3.select (psetting.domid);
                    var baseId = psetting.domid.slice(1)+"Table";
                    //console.log ("pd", psetting);

                    var names = {selected: "chosen"};
                    var columnSettings = {};
                    psetting.columns.forEach (function (field) {
                        var visible = psetting.hide[field] !== undefined ? psetting.hide[field] : true;
                        columnSettings[field] = {columnName: names[field] || field, type: psetting.types[field] || "alpha", visible: visible, removable: true, headerTooltip: ""}
                    });

                    columnSettings.selected.cellStyle = "centreContent";
                    columnSettings.download.cellStyle = "centreContent";
                    psetting.autoWidths.values().forEach (function (key) {
                        columnSettings[key].cellStyle = "varWidthCell";
                    });

                    columnSettings.selected.dataToHTMLModifier = function () {
                        return "<input type='checkbox'></input>"
                    };
                    columnSettings.download.dataToHTMLModifier = function () {
                        return "<button class='download'></button>";
                    };

                    d3.entries(cellD3Hooks).forEach (function (hookEntry) {
                        var csetting = columnSettings[hookEntry.key];
                        if (csetting) {
                            csetting.cellD3EventHook = hookEntry.value;
                        }
                    });

                    var d3tab = sel.append("div")
                        .datum({
                            data: psetting.data,
                            columnSettings: columnSettings,
                            columnOrder: d3.keys(columnSettings),
                        })
                    ;
                    var table = CLMSUI.d3Table ();
                    d3Tables[baseId] = table;
                    table (d3tab);
                    d3tab.select("table").classed("previousTable", true);
                    applyHeaderStyling (table.getHeaderCells(), psetting.autoWidths);
                    // allows css trick to highlight filter inputs with content so more visible to user
                     d3.selectAll(".d3table-filterInput").property("required", true);
                    //console.log ("table", table);

                    // set initial filters
                    var keyedFilters = {};
                    d3.keys(columnSettings).forEach (function (columnKey) {
                        keyedFilters[columnKey] = "";
                    });

                    var empowerRows = function (rowSelection) {
                        addWholeRowListeners (rowSelection, psetting.modelKey);
                        addSelectionListeners (rowSelection, psetting.modelKey);
                    };


                    table
                        .typeSettings ("alphaArray", alphaArrayTypeSettings)
                        .filter (keyedFilters)
                        .postUpdate (empowerRows)
                        .pageSize(10)
                        .update()
                    ;

                    delegateModel.listenTo (model, "change:"+psetting.modelKey, function () {
                        // make removable labels outside of accordion area for selected rows
                        console.log ("TABLE modelKey", psetting.modelKey, model);
                        makeRemovableLabels (psetting.selectSummaryid, baseId, psetting.modelKey);

                        var d3table = d3Tables[baseId];
                        var itemSet = d3.set(model.get(psetting.modelKey));
                        d3table.getData().forEach (function(d) {
                            d.selected = itemSet.has(d.id);
                        });
                        // on changing the model attributes for seqs/acqs, refilter the data (to include new)
                        // set to the old page (to avoid going back to page 1) - https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/295
                        // and update the table view
                        var page = d3table.page();
                        d3table.refilter().page(page).update();

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

                    //console.error ("CHECK", missingFields, noneMissing, data.noSearchAllowed, CLMSUI.submitting, !noneMissing || (data.noSearchAllowed === true) || CLMSUI.submitting || false);

                    $("#startProcessing").button("option", "disabled", !noneMissing || (data.noSearchAllowed === true) || CLMSUI.submitting || false);
                    happyToDo (noneMissing);
                    toDoMessage (noneMissing ? "Ready to Submit" : "To enable Submit, selections are required for:", missingList.values().join(", "));
                });
                dispatchObj.formInputChanged();




                /**
                *   AJAX form submission
                *   PITA have to reconstruct form data from all fields (marked them with .formPart class to make it easier)
                *   @memberof CLMSUI.buildSubmitSearch
                */
                $("#parameterForm").submit(function (event) {
                    event.preventDefault();
                    console.log ("SUBMITTING");

                    if (!CLMSUI.submitting) {   // extra avoid double click flag 'cos disabled occasionally borks
                        CLMSUI.submitting = true;
                        $("#startProcessing").button("option", "disabled", true);   // so user can't press again
                        toDoMessage ("Processing");

                        function submitFailSets () {
                            CLMSUI.submitting = false;
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
                    }
                });


                /**
                *   Function to control actions/consequences of upload/delete buttons in seq/acq upload forms
                *   Includes logic to enable/disable buttons if using them makes no sense
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param textinputid - DOM id of text input widget
                *   @param formid - DOM id of HTML form element
                *   @param type - type of form i.e. acquisitions or sequences
                */
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

                            // suspend submit button for duration of loading and subsequent db activity
                            setNotLoadingFlag (false);
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
                                var isPrivateSearch = privateElem.empty() ? false : privateElem.property("checked");
                                var formData = {
                                    name: d3.select(textinputid).property("value"),
                                    filenames: filesUploaded,
                                    type: type,
                                    tabID: getTabSessionVar(),
                                    isPrivateSearch: isPrivateSearch,
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
                                            setNotLoadingFlag (true);
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
                            } else {
                                setNotLoadingFlag (true);
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

                /**
                *   When a new file added for possible upload, check previous tables to see if the same name is there already
                *   which may indicate user can re-use old data.
                *   @memberof CLMSUI.buildSubmitSearch
                */
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
                        newFilter[type === "seq" ? "file" : "files"] = fileName;
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

                /**
                *   If new row added, then add it to the correct table of previous results.
                *   @memberof CLMSUI.buildSubmitSearch
                */
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

                    // Allow showing of submit button (if all other conditions met)
                    setNotLoadingFlag (true);
                });

                // Make the two file upload forms
                var seqFormActions = new formActions ("#newseqID", "#seqfileupload", "seq");
                var acqFormActions = new formActions ("#newacqID", "#acqfileupload", "acq");
                [seqFormActions, acqFormActions].forEach (function(formAct) { formAct.buttonEnabler(); });


                /**
                *   Function to return default or base search settings from php (global, lastSearch, or specificSearch)
                *   @memberof CLMSUI.buildSubmitSearch
                *   @param postData - small object with property 'sid' indication search id to base new search properties on
                *   @param isGlobalDefaults - use global defaults, not a specific search as base
                *   @param defaultsLabel - label indicating type of default to be loaded (sometimes a button text)
                */
                var loadDefaults = function (postData, isGlobalDefaults, defaultsLabel) {
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
                                // Update notes value with base search number
                                if (response.notes && postData && postData.sid) {
                                    var baseSearchID = postData.sid.match("\\d*")[0];
                                    if (baseSearchID) {
                                        response.notes += "\r\nBased on search: "+baseSearchID;
                                    }
                                }

                                // update fields with loaded values
                                updateFieldsWithValues (response, data);    // data is lists of possible crosslinker/loss/mods/seqs/acqs etc from original DB request
                            }
                        },
                        error: function (model, response, options) {
                            console.log ("fetch err response", model, response, options);
                            CLMSUI.jqdialogs.errorDialog ("popErrorDialog", "An Error occurred when trying to access the database for "+defaultsLabel+"<br>"+errorDateFormat (new Date()), "Connection Error");
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
                    model
                        .set("acquisitions", [])
                        .set("sequences", [])
                    ;
                }
            }
        }
    });



    /**
    * Function to populate controls with contents of database results. Probably should have done this via a backbone model-view link.
    * @param searchSettings - settings taken from base search (or global defaults)
    * @param possibleValues - values taken from DB for all possible cross-linkers, enzymes, losses, modifications etc
    */
    function updateFieldsWithValues (searchSettings, possibleValues) {

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
            $(domElem).spinner( "option", "step", 0.01 ).spinner("value", value);
        };

        var jquerySelectSetFunc = function (domElem, value) {
            $(domElem)
                .val(value)
                .selectmenu("refresh")
                .selectmenu({width: "auto"})
            ;
        };

        var checkboxSetFunc = function (domElem, value) {
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

        var elementModelMap = [
            {id: "#paramToleranceValue", field : "ms_tol", func: numberSetFunc},
            {id: "#paramTolerance2Value", field : "ms2_tol", func: numberSetFunc},
            {id: "#paramMissedCleavagesValue", field : "missed_cleavages", func: numberSetFunc},
            {id: "#paramToleranceUnits", field : "ms_tol_unit", func: jquerySelectSetFunc},
            {id: "#paramTolerance2Units", field : "ms2_tol_unit", func: jquerySelectSetFunc},
            {id: "#paramCrossLinkerSelect", field : "crosslinkers", func: multiSelectSetFunc},
            {id: "#paramEnzymeSelect", field : "enzyme", func: multiSelectSetFunc},
            {id: "#paramIonsSelect", field : "ions", func: multiSelectSetFunc},
            {id: "#paramFixedModsSelect", field : "fixedMods", func: multiSelectSetFunc},
            {id: "#paramVarModsSelect", field : "varMods", func: multiSelectSetFunc},
            {id: "#paramLossesSelect", field : "losses", func: multiSelectSetFunc},
            {id: "#paramXiVersionSelect", field : "xiversion", func: multiSelectSetFunc},
            {id: "#paramNotesValue", field : "notes", func: textAreaSetFunc, options: {emptyOverwrite: false},},
            {id: "#paramCustomValue", field : "customsettings", func: textAreaSetFunc,
                options: {
                    emptyOverwrite: true,
                    postFunc: function (domID, value) {
                        $("#paramCustom").accordion("option", "active", 0);

                        var multiDigestionLineRegex = new RegExp ("^\\s*digestion:MultiStepDigest.*NAME=.*$", "gmi");
                        var multiDigestionLine = value.match (multiDigestionLineRegex);
                        if (multiDigestionLine) {
                            CLMSUI.jqdialogs.populateMultipleDigestion (d3.select("#digestAccordionContent"), multiDigestionLine[0], possibleValues.enzymes, searchSettings);
                            value = value.replace (multiDigestionLineRegex, "");
                            model.set ("customsettings", value);
                            $(domID).val(value);	// new new value
                        }
                        switchEnzymeControls (multiDigestionLine ? true : false);

                        // check for missing monoisotopic peak declaration in custom settings
                        var missedPeaksRegex = new RegExp ("^\\s*missing_isotope_peaks:(\\d+)$", "gmi");
                        value = model.get ("customsettings");
                        var missedPeaksLine = value.match (missedPeaksRegex);
                        if (missedPeaksLine) {
                            value = value.replace (missedPeaksRegex, "");	// remove missing_isotope_peaks line from custom settings for now
                            model.set ("customsettings", value);
                            $(domID).val(value);	// new new new value

                            var mpv = missedPeaksLine[0].match (new RegExp("\\d+"), "g");
                            // set the missed peaks widget with the custom settings missed peaks value
                            if (mpv && mpv[0] && +mpv[0]) {
                                model.set ("missedPeaks", +mpv[0]);
                                searchSettings.missedPeaks = +mpv[0];
                            }
                        }
                    },
                },
            },
            {id: "#privacy", field: "privateSearch", func: checkboxSetFunc},
            {id: "#paramMissedPeaksValue", field : "missedPeaks", func: numberSetFunc},	// do last to pick up changes made in custom settings above
            // acq/seq table selections aren't updated by search params
            //{id: "#acqPreviousTable", field : "acquisitions", func: dynamicTableSetFunc},
            //{id: "#seqPreviousTable", field : "sequences", func: dynamicTableSetFunc},
        ];

        elementModelMap.forEach (function (entry) {
            var exists = d3.select (entry.id);
            if (!exists.empty()) {
                entry.func (entry.id, searchSettings[entry.field], entry.options);
            }
        });

        var splitAcqs = _.partition (searchSettings.acquisitions, function (d) { return d === null; });
        var splitSeqs = _.partition (searchSettings.sequences, function (d) { return d === null; });  //[0] = null, [1] = not null

        // Fire a warning pop-up if some sequences / acquisitions asked for are restricted
        var acqNullCount = splitAcqs[0].length;
        var seqNullCount = splitSeqs[0].length;
        if (acqNullCount || seqNullCount) {
            var counts = [{count: acqNullCount, label: acqNullCount+" Acquisition(s)"}, {count: seqNullCount, label: seqNullCount+" Sequence(s)"}];
            var messageStr = counts
                .filter(function(d) { return d.count > 0;})
                .map(function(d) { return d.label; })
                .join (" and ")
            ;
            CLMSUI.jqdialogs.simpleDialog (
                "popErrorDialog",
                "Sorry, but you do not have permission to re-use "+messageStr+" associated with this search. All others have been loaded.",
                "Access Restriction"
            );
        }

        model
            .set ("acquisitions", splitAcqs[1] || [])
            .set ("sequences", splitSeqs[1] || [])
        ;
    }

    /**
    * Finalise some details before submitting search. Generally adding stuff to customsettings field.
    */
    function finaliseModel () {
        var digestAccordionSel = d3.select("#digestAccordionContainer");
        var customMultiDigest = digestAccordionSel.style("display") !== "none" ? CLMSUI.jqdialogs.generateMultipleDigestionString (digestAccordionSel) : "";
        if (customMultiDigest) {
            model.set("customsettings", model.get("customsettings") + "\n" + customMultiDigest);
        }

        var missingPeaksSel = d3.select("#paramMissedPeaksValue");
        var missingPeaks = +missingPeaksSel.property("value");
        var custom = model.get("customsettings");
        if (missingPeaks) {
            custom += "\nmissing_isotope_peaks:" + missingPeaks;
            // The following are defaults assumed by XiSearch so no need to add them here - issue 422
            /*
            var fuRegex = new RegExp ("^\\s*FRAGMENTTREE:FU$", "gmi");
            if (!custom.match(fuRegex)) {
                custom += "\nFRAGMENTTREE:FU";
            }
            var xiClassRegex = new RegExp ("^\\s*XICLASS:SimpleXiProcessMultipleCandidates$", "gmi");
            if (!custom.match(xiClassRegex)) {
                custom += "\nXICLASS:SimpleXiProcessMultipleCandidates";
            }
            */
            model.set("customsettings", custom);
        }
    }

    canDoImmediately();
};
