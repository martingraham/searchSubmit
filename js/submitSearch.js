var CLMSUI = CLMSUI || {};

CLMSUI.buildSubmitSearch = function () {
    function canDoImmediately () {
        // Make acquisition and sequence divs via shared template
        var acqSeqTemplateData = [
            {id: "#sequence", fields: {"singleLabel":"Sequence", "pluralLabel":"Sequences", "partialId":"seq", "fileTypes":".fasta,.txt"}},
            {id: "#acquire", fields: {"singleLabel":"Acquisition", "pluralLabel":"Acquisitions", "partialId":"acq", "fileTypes":".mgf,.msm,.apl,.zip"}},
        ];
        acqSeqTemplateData.forEach (function (datum) {
            d3.select(datum.id).html (tmpl("template-acqseq-section", datum.fields));
        });
        
        
        // Make textboxes
        // Those with labeltag h3 can be accordion'ed later
        var textBoxData = [
            {domid: "#paramNotes", niceLabel: "Search Notes", labelTag: "P", placeholderText: "Click here to add notes..."},
            {domid: "#paramCustom", niceLabel: "Custom Settings", labelTag: "H3", placeholderText: "Click here to add custom settings..."},
            {domid: "#paramSearchName", niceLabel: "New Search Name", labelTag: "P", placeholderText: "If left empty, search will use acquisition names", rows: 1, maxLength: 1000},
        ];
        textBoxData.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            elem.append(settings.labelTag).text(settings.niceLabel);
            if (settings.labelTag === "H3") {
                elem = elem.append("div");
            }
            var tid = settings.domid.slice(1)+"Value";
            elem.append("textarea").attr ({
                class: "formPart",
                wrap: "soft",
                maxlength: settings.maxLength || 10000,
                cols: 50,
                rows: settings.rows || 4,
                id: tid,
                name: tid,
                placeholder: settings.placeholderText
            })
            .classed ("ui-widget ui-state-default ui-corner-all", true)
            ;
        });


        // Make number inputs
        var numberInputSettings = [
            {domid: "#paramTolerance", niceLabel: "Ms Tolerance", min: 0, step: "any",},
            {domid: "#paramTolerance2", niceLabel: "Ms2 Tolerance", min: 0, step: "any",},
            {domid: "#paramMissedCleavages", niceLabel: "Missed cleavages", min: 0, step: 1,},
        ];
        numberInputSettings.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            elem.append("p").text(settings.niceLabel);
            var iid = settings.domid.slice(1)+"Value";
            var inputElem = elem.append("input")
                .attr ("type", "number")
                .attr ("min", settings.min)
                .attr ("step", settings.step)
                .attr("name", iid)
                .attr("id", iid)
                .on ("input", function() { 
                    if (!this.checkValidity()) {    // set to min if not a valid entry
                        this.value = settings.min;
                    } 
                })
                .classed("formPart", true)
            ;

            var spinner = $("#"+iid).spinner({
                min: settings.min,
                max: settings.max,
                step: 1,
            });

            elem.selectAll(".ui-spinner")
                .style("vertical-align", "baseline")    // baseline is different to selectmenu, causing vertical offset
                .style("width", "5em")
            ;
        });


        // Make unit drop-downs
        var unitSettings = [
            {domid: "#paramTolerance", units: ["ppm", "Da"],},
            {domid: "#paramTolerance2", units: ["ppm", "Da"],},
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

            $("#"+baseId).selectmenu();

            elem.selectAll(".ui-selectmenu-button").style("width", null);   // calculated width in selectmenu is dodgy, kill it
        });


        // Make accordions
        var accordionSettings = [
            {id: "#acqAccordion", scrollTo: false}, 
            {id: "#seqAccordion", scrollTo: false}, 
            {id: "#paramCustom", scrollTo: true}, 
        ];
        var scrollVisible = [false, false, true];
        accordionSettings.forEach (function (accordionSet,i) {
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
            {id: "#useGlobalDefaults", type: "button"},
            {id: "#useLastSearchDefaults", type: "button"},
        ];
        buttonData.forEach (function (buttonDatum) {
            var buttonID = buttonDatum.id;
            $(buttonID).button();  
            d3.select(buttonID).attr("type", buttonDatum.type);
        });
        
        // Add action for back button
        d3.select("#backButton").on("click", function() { window.history.back(); });
    }

    $(document).ready (function () {
        
        $.ajax ({
            type: "GET",
            url: "./php/populate.php",
            dataType: "json",
            encode: true,
            success: gotChoicesResponse,
            error: function (jqXhr, textStatus, errorThrown) {
                console.log ("db get error", textStatus, errorThrown);    
            },
        });
        
        
        function mergeInFilenamesToAcquistions (acquistions, runNames) {
            console.log ("merge", arguments);
            var nameMap = d3.map();
            runNames.forEach (function(runName) {
                var vals = nameMap.get(runName.acq_id);
                if (!vals) {
                    vals = [];
                    nameMap.set(runName.acq_id, vals);
                }
                vals.push (runName.name);
            });
            console.log ("map", nameMap);
            
            acquistions.forEach (function (acq) {
                //acq.files = nameMap.get(acq.id).sort();
                var filenames = nameMap.get(acq.id);
                acq.files = filenames.sort();
                acq["#"] = filenames.length;
            });
        }
        
        // http://stackoverflow.com/questions/23740548/how-to-pass-variables-and-data-from-php-to-javascript
        function gotChoicesResponse (data, textStatus, jqXhr) {
            console.log ("got", data, textStatus, jqXhr);
            
            

            if (data.redirect) {
                window.location.replace (data.redirect);    // redirect if server php passes this field (should be to login page)    
            }
            else if (data.error) {
                alert ("Error: "+data.error);
            }
            else {
                
                mergeInFilenamesToAcquistions (data.previousAcqui, data.filenames);
                
                var dispatchObj = d3.dispatch ("formInputChanged", "newEntryUploaded");

                // Make combobox and multiple selection elements
                // Multiple Select uses Jquery-plugin from https://github.com/wenzhixin/multiple-select
                // Multiple Selects need [] appended to name attr, see http://stackoverflow.com/questions/11616659/post-values-from-a-multiple-select
                var populateOptionLists = [
                    {data: data.xlinkers, domid: "#paramCrossLinker", niceLabel: "Cross-Linker", filter: true, required: true, multiple: false, placeHolder: "Select A Cross Linker"},
                    {data: data.enzymes, domid: "#paramEnzyme", niceLabel: "Enzyme", filter: true, required: true, multiple: false, placeHolder: "Select An Enzyme",},
                    {data: data.modifications, domid: "#paramFixedMods", niceLabel: "Fixed Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Fixed Modifications",},
                    {data: data.modifications, domid: "#paramVarMods", niceLabel: "Variable Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Var Modifications",},
                    {data: data.ions, domid: "#paramIons", niceLabel: "Ions", required: true, multiple: true, filter: false, placeHolder: "Select At Least One Ion"},
                    {data: data.losses, domid: "#paramLosses", niceLabel: "Losses", required: false, multiple: true, filter: false, placeHolder: "Select Any Losses",},
                ];
                populateOptionLists.forEach (function (poplist) {
                    var elem = d3.select(poplist.domid);
                    elem.append("p").text(poplist.niceLabel);
                    var baseId = poplist.domid.slice(1)+"Select";
                    var selElem = elem.append("select")
                        .attr("id", baseId)
                        .attr("name", baseId + (poplist.multiple ? "[]" : ""))  // magic. Need [] at end of name of elements that can submit multiple values
                        .attr("data-label", poplist.niceLabel)    
                        .classed("formPart", true)
                        .property("multiple", poplist.multiple)
                        .property("required", poplist.required)
                    ;

                    var dataJoin = selElem.selectAll("option")
                        .data(poplist.data, function(d) { return d.id; })
                    ;

                    dataJoin.enter().append("option")
                        .attr("value", function(d) { return d.id; })
                        .text(function(d) { return d.name; })
                    ;

                    $("#"+baseId).multipleSelect({ 
                        single: !poplist.multiple,
                        filter: poplist.filter, 
                        selectAll: false,
                        placeholder: poplist.placeHolder,
                        multiple: true, // this is to show multiple options per row, not to do with multiple selections (that's single)
                        //width: 450,
                        multipleWidth: 200,
                        onClick: function (view) {
                            dispatchObj.formInputChanged();   
                        },
                    });
                    elem.selectAll(".ms-choice")
                        .classed("ui-widget", true)
                        .classed("ui-state-default", true)
                    ;
                    // add tooltips to list items
                    elem.select("ul").selectAll("li")
                        .attr ("title", function() { return d3.select(this).text(); })
                    ;
                    // set widget to a relative rather than pixel width
                    elem.selectAll(".ms-parent")
                        .style ("width", poplist.multiple ? "100%" : "70%")
                    ;
                    
                    // add a clear all option
                    if (poplist.clearOption) {
                        var options = d3.select(poplist.domid).select("ul");
                        options.insert("li", ":first-child")
                            .append("button")
                            .attr ("id", baseId+"ClearAll")
                            .text("Unselect All")
                            .on("click", function() {
                                $(selElem).multipleSelect("uncheckAll");
                                dispatchObj.formInputChanged();   
                            })
                        ;
                        $("#"+baseId+"ClearAll").button();       
                    }
                });



                // Make previous acquisition and sequence tables
                var prevTableClickFuncs = {}; // so we can keep these for later
                // Routine for sorting datatable column of checkboxes via dom element values
                $.fn.dataTable.ext.order['dom-checkbox'] = function ( settings, col ) {
                    return this.api().column(col, {order:'index'}).nodes().map (function (td, i) {
                        return $('input', td).prop('checked') ? '1' : '0';
                    });
                };
                var previousSettings = [
                    {domid: "#acqPrevious", data: data.previousAcqui, niceLabel: "Acquisitions", required: true, selectSummaryid: "#acqSelected",},
                    {domid: "#seqPrevious", data: data.previousSeq, niceLabel: "Sequences", required: true, selectSummaryid: "#seqSelected",},
                ];
                previousSettings.forEach (function (psetting) {
                    var sel = d3.select (psetting.domid);
                    var baseId = psetting.domid.slice(1)+"Table";
                    sel.html ("<TABLE><THEAD><TR></TR></THEAD><TBODY></TBODY></TABLE>");
                    sel.select("table").attr("id", baseId);
                    var hrow = sel.select("tr");
                    var headers = d3.keys(psetting.data[0]);
                    headers.push("selected");
                    hrow.selectAll("th").data(headers).enter().append("th").text(function(d) { return d; });

                    var tbody = sel.select("tbody");
                    var rowJoin = tbody.selectAll("tr").data(psetting.data, function(d) { return d.name; });
                    var newRows = rowJoin.enter().append("tr");

                    var cellJoin = newRows.selectAll("td").data (function(d) { return d3.values(d); });
                    cellJoin.enter().append("td").text(function(d) { return d; });

                    newRows.append ("td").append("input")
                        .attr ("type", "checkbox")
                    ;

                    var table = $("#"+baseId).dataTable ({
                        "paging": true,
                        "jQueryUI": true,
                        "ordering": true,
                        "order": [[ 0, "desc" ]],   // order by first column
                        "columnDefs": [
                            {"orderDataType": "dom-checkbox", "targets": [-1],} // -1 = last column (checkbox column)
                        ]
                    });
    

                    // this stuffs a hidden input field in the main parameter search form
                    d3.select("#parameterForm").append("input")
                        .attr ("class", "formPart")
                        .attr ("type", "hidden")
                        .attr ("name", baseId+"[]") // add [] for php because passed value can/will be an array (tho for a hidden input the array is stringified in the value attr first and we need to split it before submission)
                        .attr ("id", baseId+"Hidden")
                        .attr ("data-label", psetting.niceLabel)   
                        .attr ("value", "")
                        .property ("required", psetting.required)
                    ;

                    // on a selection in the table, we then smuggle the current selection set of ids into the hidden form
                    // where they can be picked up on the parameter form submit, and show the current selection to the user
                    prevTableClickFuncs[baseId] = function () {
                        var dtCells = $("#"+baseId).DataTable().rows().nodes(); // loads of tr dom nodes
                        $(dtCells).removeClass("selected");
                        var checkedCells = $(dtCells).has("input:checked"); // just the ones with a ticked checkbox
                        checkedCells.addClass("selected");
                        var checkedData = d3.selectAll(checkedCells).data();

                        var ids = checkedData.map (function(d) { return +d.id; });
                        d3.select("#"+baseId+"Hidden").property("value", "["+ids.join(",")+"]");  // Put the ids in the hidden form element

                        var names = checkedData.map (function(d) { return d.name+" ("+d.id+")"; });
                        d3.select(psetting.selectSummaryid).html (names.length ? names.length+" Selected: "+names.join("<br>") : null);  // Put names in label
                        console.log ("change form");
                        dispatchObj.formInputChanged();
                    }; 

                    newRows
                        .on("click", function () {
                            d3.select(this).selectAll("input[type=checkbox]")
                                .property ("checked", function() {
                                    return !(d3.select(this).property("checked"));  // toggle checkbox state on row click
                                })
                            ;
                            prevTableClickFuncs[baseId]();
                        })
                        .selectAll("input[type=checkbox]")
                            .on ("click", function() {
                                d3.event.stopPropagation(); // don't let parent tr catch event, or it'll just revert the checked property
                                prevTableClickFuncs[baseId]();
                            }
                        )
                    ; 
                });



                // Make checkbox/radio choice controls - not currently used
                var buttonGroups = [
                    //{domid: "#paramIons", choices: data.ions, type: "radio", nameFunc: function(d) { return d.name; },},
                    //{domid: "#paramLosses", choices: data.losses, type: "radio", nameFunc: function(d) { return d.name; },},
                ];
                buttonGroups.forEach (function (buttonGroup) {
                    var elem = d3.select (buttonGroup.domid);
                    elem.attr ("class", "formPart");
                    var baseId = buttonGroup.domid.slice(1)+"Choice";
                    var choiceJoin = elem.selectAll("input").data(buttonGroup.choices);
                    choiceJoin.enter()
                        .append ("label")
                        .attr ("for", function(d,i) { return baseId+i; })
                        .text (buttonGroup.nameFunc)
                    ;
                    choiceJoin.enter()
                        .append("input")
                        .attr ("type", buttonGroup.type)
                        .attr ("id", function(d,i) { return baseId+i; })
                        .attr ("name", buttonGroup.type === "radio" ? baseId : null)
                    ;

                    $(buttonGroup.domid).buttonset();
                });



                // Sections to control availability of main submit button and explain why disabled if so
                d3.select("#todo").selectAll("span").data(["ui-icon","notice"])
                    .enter()
                    .append("span")
                    .attr ("class", function(d) { return d; })
                ;

                var happyToDo = function (happy) {
                    d3.select("#todo span.ui-icon")
                        .classed ("ui-icon-notice", !happy)
                        .classed ("ui-icon-check", happy)
                    ;
                    d3.select("#todo")
                        .classed ("paramSubmitReady", happy)
                    ;
                };

                var toDoMessage = function (msg) {
                    d3.select("#todo span.notice").html(msg);
                };
                
                dispatchObj.on ("formInputChanged", function () {
                    var todoList = d3.set();
                    d3.select("#parameterForm").selectAll(".formPart[required]").each (function() {
                        // form parts return arrays as strings so need to check for empty array as a string ("[]")
                        if (this.id && (!this.value || this.value == "[]")) {
                            todoList.add (d3.select(this).attr("data-label") || d3.select(this).attr("name"));
                        }
                    });
                    $("#startProcessing").button("option", "disabled", !todoList.empty());
                    happyToDo (todoList.empty());
                    toDoMessage (todoList.empty() ? "Ready to Submit" : "To enable Submit, selections are required for:<br>"+todoList.values().join(", "));
                });
                dispatchObj.formInputChanged();



                // AJAX form submission
                // PITA have to reconstruct form data from all fields (marked them with .formPart class to make it easier)
                $("#parameterForm").submit(function (event) {
                    event.preventDefault();

                    $("#startProcessing").button("option", "disabled", true);   // so user can't press again
                    toDoMessage ("Processing");
                    var formData = {};
                    d3.select("#parameterForm").selectAll(".formPart").each (function() {
                        if (this.id) {
                            var val = this.value;
                            // If one of the multiple select widgets, must get multiple values like this
                            if (this.type === "select-multiple") {
                                val = $("#"+this.id).multipleSelect("getSelects");
                            }   // if a string begin with '[' then is an array string we need to split
                            else if (val.charAt(0) === '[') {
                                val = val.slice(1, -1).split(",");  // split the bit between the square brackets
                            }
                            formData[this.name] = val;
                        }
                    });
                    console.log ("formData", formData);
                    
                    d3.select("body").style("cursor", "wait");

                    $.ajax ({
                        type: "POST",
                        url: "php/submitParams.php",
                        data: formData,
                        dataType: "json",
                        encode: true,
                        success: function (response, textStatus, jqXhr) {
                            console.log ("db params insert success", response, textStatus);
                            if (response.redirect) {
                                window.location.replace (response.redirect);    // redirect if server php passes this field    
                            }
                            else if (response.status == "success") {
                                toDoMessage ("Success, Search ID "+response.newSearch.id+" added.");
                                window.location.assign ("../xi2/history.php");
                            } else {
                                toDoMessage ("Error, "+response.error+".");
                                happyToDo (false);
                                $("#startProcessing").button("option", "disabled", false);
                            }
                        },
                        error: function (jqXhr, textStatus, errorThrown) {
                            console.log ("db params insert error", textStatus, errorThrown);   
                            toDoMessage ("Error, "+errorThrown+".");
                            happyToDo (false);
                            $("#startProcessing").button("option", "disabled", false);
                        },
                        complete: function () {
                            d3.select("body").style("cursor", null);
                        },
                    });
                });


                // initialize blueimp file uploader bits
                console.log ("submitter", submitter);
                uploadOptions = {
                    "seqfileupload": {"fileTypes":"fasta|txt"},
                    "acqfileupload": {"fileTypes":"mgf|msm|apl|zip"}
                };
                submitter.upload (uploadOptions);


                // Function to control actions/consequences of upload/delete buttons in seq/acq upload forms
                // Includes logic to enable/disable buttons if using them makes no sense
                var formActions = function (textinputid, formid, type) {
                    var nonzeroes = {filesAwaiting: 0, namelength: 0,};
                    var enabler = function () {
                        var vals = d3.values (nonzeroes);

                        var submitBlocked = vals.some (function(d) { return d === 0; });
                        console.log (vals, "submitBlocked", submitBlocked, formid, $(formid+" button[type='submit']"));
                        var buttons = $(formid+" button[type='submit']");
                        buttons.button ("option", "disabled", submitBlocked);

                        var resetBlocked = (nonzeroes.filesAwaiting === 0);
                        var buttons = $(formid+" button[type='reset']");
                        buttons.button ("option", "disabled", resetBlocked); 
                    };
                    this.buttonEnabler = enabler;
                    var uploadSuccess = true;
                    var filesUploaded = [];
                    var rowCountFunc = function () { return d3.select(formid).selectAll("tr.template-upload").size(); };   // data.files.length;

                    $(formid).on({
                        "fileuploadstart": function (e, data) {
                            console.log ("started", e, data);
                            uploadSuccess = true;
                        },
                        "fileuploadadded": function (e, data) {
                            nonzeroes.filesAwaiting = rowCountFunc();
                            console.log ("table rows awaiting, ", rowCountFunc());
                            enabler();
                        },
                        "fileuploadprocessfail": function (e, data) {
                             console.log ("wibbly", e, data);
                             data.abort();
                        },
                        "fileuploadfail": function (e, data) {  // called before template rendered   
                            if (data.errorThrown && data.errorThrown.name == "SyntaxError") {
                                // This usually means a html-encoded php error that jquery has tried to json decode
                                data.files[0].error = "from Server, "+$(data.jqXHR.responseText).text().slice(0,40)+"...";
                            }
                            uploadSuccess = false;
                        },
                        "fileuploadfailed": function (e, data) {    // called after template rendered                         
                            console.log ("failed", e, data);
                            if (data.errorThrown === "abort") {
                                nonzeroes.filesAwaiting = rowCountFunc();
                                enabler();
                            }
                            uploadSuccess = false;
                        },
                        "fileuploaddone": function (e, data) {
                            console.log ("done", e, data);
                            filesUploaded.push (data.files[0].name);
                        },
                        "fileuploadstopped": function (e, data) {
                            console.log ("stopped", e, data, uploadSuccess);
                            if (uploadSuccess) {
                                var formData = {
                                    name: d3.select(textinputid).property("value"),
                                    filenames: filesUploaded,
                                    type: type,
                                };
                                $.ajax ({
                                    type: "POST",
                                    url: "php/submitSeqAcq.php",
                                    data: formData,
                                    dataType: "json",
                                    encode: true,
                                    success: function (response, textStatus, jqXhr) {
                                        if (response.redirect) {
                                            window.location.replace (response.redirect);    // redirect if server php passes this field    
                                        } else {
                                            console.log ("db acq/seq insert success", response, textStatus);
                                            dispatchObj.newEntryUploaded (type, response.newRow);    // alert new row has been added to db
                                        }
                                    },
                                    error : function (jqXhr, textStatus, errorThrown) {
                                        console.log ("db acq/seq insert error", textStatus, errorThrown);    
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

                // if new row added, then add it to the correct table of previous results
                dispatchObj.on ("newEntryUploaded", function (type, newRow) {
                    var tableId = type+"PreviousTable";
                    var dataTable = $("#"+tableId).DataTable();
                    newRow.selected = "<input type='checkbox' checked>";    // add a ready selected checkbox as a html string
                    var newRowNode = dataTable.row
                        .add(d3.values(newRow)) // push the newrow as new table row data
                        .draw()                 // redraw the table
                        .node()                 // return the tr dom node for further manipulation
                    ;
                    d3.select(newRowNode)
                        .datum(newRow)  // set the row data on the new tr dom node as a d3 datum
                        .select("input[type=checkbox]")
                        .on ("click", prevTableClickFuncs[tableId])    // so that calling this function works on click
                    ;   
                    prevTableClickFuncs[tableId] ();   // and we call the same func here as the checkbox is set pre-selected
                });

                // Make the two file upload forms
                var seqFormActions = new formActions ("#newseqID", "#seqfileupload", "seq");
                var acqFormActions = new formActions ("#newacqID", "#acqfileupload", "acq");
                [seqFormActions, acqFormActions].forEach (function(formAct) { formAct.buttonEnabler(); });
                
                
                // Make default loader buttons
                var defaultButtonMap = [
                    {id: "#useLastSearchDefaults", php: "getLastDefaults.php"},
                    {id: "#useGlobalDefaults", php: "getGlobalDefaults.php"},
                ];
                defaultButtonMap.forEach (function (defaultButton) {
                    d3.select(defaultButton.id).on("click", function() {
                        $.ajax ({
                            type: "GET",
                            url: "./php/"+defaultButton.php,
                            dataType: "json",
                            encode: true,
                            success: function (data, textStatus, jqXhr) {
                                console.log ("return", data, textStatus, jqXhr);
                                if (!data.error) {
                                    updateFieldsWithValues (data, prevTableClickFuncs);
                                    dispatchObj.formInputChanged();   
                                }
                            },
                            error: function (jqXhr, textStatus, errorThrown) {
                                console.log ("db get error", jqXhr, textStatus, errorThrown);    
                            },
                        });
                    });
                });
                
                // programmatic click on global default button, load fields with those defaults
                $("#useGlobalDefaults").click();
            }
        }
    });

    
    function updateFieldsWithValues (data, prevTableClickFuncs) {
        console.log ("data", data, prevTableClickFuncs);
        var parts = d3.select("#parameterForm").selectAll(".formPart");
        console.log ("parts", parts);
        
        var multiSelectSetFunc = function (domElem, mdata) {
            if (mdata instanceof Array) {
                mdata = mdata.map (function (entry) { return d3.values(entry)[0]; });
            } else {
                mdata = [mdata];
            }
            $(domElem).multipleSelect("setSelects", mdata);
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
        
        var textAreaSetFunc = function (domElem, value) {
            $(domElem).val (value);
        };
        
        var dynamicTableSetFunc = function (domElem, mdata) {
            if (mdata instanceof Array) {
                mdata = mdata.map (function (entry) { return d3.values(entry)[0]; });
            } else {
                mdata = [mdata];
            }
            var mset = d3.set (mdata);
            
            var dataTable = $(domElem).DataTable();  
            /*
            console.log ("rows", dataTable.rows(), dataTable.columns(), dataTable.column(0).data(), mset);
            
            dataTable.rows().every (function () {
                var sel = mset.has(this.data()[0]);
                d3.select(this.node()).select("input[type=checkbox]").property("checked", sel);
            });
            */
            
            // we added the data to the table rows via d3 earlier so we can access it like this too.
            d3.selectAll(dataTable.rows().nodes())
                .selectAll("input[type=checkbox]")
                .property("checked", function(d) {
                    return mset.has(d.id);
                })
            ;
            prevTableClickFuncs[domElem.slice(1)]();
        };
        
        var elementMap = {
            "#paramToleranceValue" : {field : "ms_tol", func: numberSetFunc},
            "#paramTolerance2Value" : {field : "ms2_tol", func: numberSetFunc},
            "#paramMissedCleavagesValue" : {field : "missed_cleavages", func: numberSetFunc},
            "#paramToleranceUnits" : {field : "ms_tol_unit", func: jquerySelectSetFunc},
            "#paramTolerance2Units" : {field : "ms2_tol_unit", func: jquerySelectSetFunc},
            "#paramCrossLinkerSelect" : {field : "crossLinkers", func: multiSelectSetFunc},
            "#paramEnzymeSelect" : {field : "enzyme", func: multiSelectSetFunc},
            "#paramIonsSelect" : {field : "ions", func: multiSelectSetFunc},
            "#paramFixedModsSelect" : {field : "fixedMods", func: multiSelectSetFunc},
            "#paramVarModsSelect" : {field : "varMods", func: multiSelectSetFunc},
            "#paramLossesSelect" : {field : "losses", func: multiSelectSetFunc},
            "#paramNotesValue" : {field : "notes", func: textAreaSetFunc},
            "#paramCustomValue" : {field : "customsettings", func: textAreaSetFunc},
            "#acqPreviousTable" : {field : "acquisitions", func: dynamicTableSetFunc},
            "#seqPreviousTable" : {field : "sequences", func: dynamicTableSetFunc},
        };
        
        d3.entries(elementMap).forEach (function (entry) {
            var exists = d3.select(entry.key);
            var value = data[entry.value.field];
            if (!exists.empty() && value) {
                entry.value.func (entry.key, value);
            }
        });
    }

    
    canDoImmediately();
};