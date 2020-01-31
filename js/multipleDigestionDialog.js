CLMSUI = CLMSUI || {};
CLMSUI.jqdialogs = CLMSUI.jqdialogs || {};

/**
*   @namespace CLMSUI.jqdialogs
*/
(function (obj) {

    obj.errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");

    obj.digestCounter = 0;

    /**
    *   Function to make JQuery-UI dialog containing sequential digestion panel
    *   Currently not used
    *   @memberof CLMSUI.jqdialogs
    *   @function
    *   @param dialogID - domID of dialog element
    *   @param data - data to pass into multipleDigestionInternals
    *   @param defaults - defaults to pass into multipleDigestionInternals
    */
    obj.multipleDigestionDialog = function (dialogID, data, defaults) {
        var dialog = obj.addStuffDialog (dialogID, "", "Define Sequential Digestion", "OK", "Cancel", function() {} /*ajaxSubmit*/);
        dialog.dialog ("option", "width", 600);
        obj.multipleDigestionInternals (d3.select(dialog[0]), data, defaults);
    };

    /**
    *   Function to make JQuery-UI accordion containing sequential digestion panel
    *   @memberof CLMSUI.jqdialogs
    *   @function
    *   @param dialogID - domID of dialog element
    *   @param data - data to pass into multipleDigestionInternals
    *   @param defaults - defaults to pass into multipleDigestionInternals
    */
    obj.makeMultiDigestAccordion = function (containerID, data, defaults, updateFunction) {
        d3.select("#"+containerID)
            .append("div")
            .attr("id", "digestAccordionContainer")
            .attr("class", "digestAccordionContainer")
            .html ("<H3>Sequential Digest Construction</H3><div id='digestAccordionContent'></div>")
        ;
        $("#digestAccordionContainer").accordion ({
            collapsible: true,
            active: false,
            heightStyle: "content",
        });

        var content = d3.select("#digestAccordionContent")
            .classed("digestAccordionContent", true)
            .classed("formPart", true)
        ;

        obj.multipleDigestionInternals (content, data, defaults, updateFunction);
    };


    /**
    *   Function to make sequential digestion panel and widgets
    *   @memberof CLMSUI.jqdialogs
    *   @function
    *   @param container - d3 selection of container to build panel in
    *   @param data - data to pass into makeMultiDigestAccordion
    *   @param defaults - defaults for new digestion step with properties mc, missed cleavages, and enzymeID, the enzyme id
    *   @param extFuncs - object holding external functions to launch at certain points - notably buildMultipleSelect and revertFunc from submitSearch.js
    */
    obj.multipleDigestionInternals = function (container, data, defaults, extFuncs) {

        container.style ("overflow", "visible");

        var model = {
            digests: [],
        };

        function notNullOrES (str) {
            return str !== null && str !== "";
        };

        /**
        *   Add new digest step widget
        *   @memberof CLMSUI.jqdialogs
        *   @function
        *   @param did - id value to distinguish this step from others (usually sequential numbers)
        *   @param enzymeId - id of initial enzyme selection
        *   @param localmc - initial local missed cleavages value for this step
        */
        obj.addNewDigestStep = function (did, enzymeId, localmc) {
            console.log ("mc", localmc, defaults.mc);
            var digestion = digestionList.append("li")
                .attr("id", "digest"+did)
                .attr("class", "ui-state-default digestItem")
                .append("span")
                    .attr("class", "horizontalFlex")
            ;

            digestion.append("span")
                .attr ("class", "ui-icon ui-icon-arrowthick-2-n-s dragSymbol")
            ;

            digestion.append("select")
                .attr("class", "flexExpand")
                .attr("id", "digestSelect"+did)
                    .selectAll("option")
                    .data(data)
                    .enter()
                    .append("option")
                        .property ("value", function (d) { return d.id; })
                        .text (function (d) { return d.name; })
            ;

            var singlePopulateOptionList = {data: data, domid: "#paramEnzyme", niceLabel: "Enzyme", filter: true, required: true, multiple: false, placeHolder: "Select An Enzyme", addNew: false };
            var baseId = "digestSelect"+did;
            extFuncs.buildMultipleSelect (singlePopulateOptionList, baseId);
            $("#"+baseId).multipleSelect("setSelects", [enzymeId]);


            var digestionMissedCleavages = digestion.append("span");
            var mcStateFunc = function () {
                var vis = d3.select(this).property("checked");
                digestionMissedCleavages.select(".ui-spinner").style("visibility", vis ? "visible" : "hidden");
            }

            digestionMissedCleavages
                .append("label")
                .text ("Local MC")
                .append("input")
                    .attr("type", "checkbox")
                    .property ("checked", notNullOrES(localmc))
                    .on ("click", mcStateFunc)
            ;
            digestionMissedCleavages.append("input")
                .attr("type", "number")
                .property ("value", notNullOrES(localmc) ? localmc : defaults.mc || 4)
                .each (function () {
                    $(this).spinner({
                        min: 0,
                        max: undefined,
                        step: 1,
                        classes: {"ui-spinner": "missedCleavages"},
                    });
                })
            ;

            digestionMissedCleavages.selectAll(".ui-icon").style ("background-color", "#fff");

            digestion.append("button")
                .attr("type", "button")
                .attr("class", "remove")
                .attr("title", "Remove this step")
                //.text("Remove")
                .each (function () {
                    $(this).button({icon: "ui-icon-circle-close"});
                })
                .on ("click", function () {
                    d3.select("#digest"+did).remove();
                    cantDeleteWhenOnlyOne();
                })
            ;

            mcStateFunc.call (digestionMissedCleavages.select("input[type='checkbox']").node());
        }

        container.append("button")
            .attr("type", "button")
            .attr("class", "addNewDigestion")
            .text("Add New Digestion Step")
            .on ("click", function () {
                obj.addNewDigestStep (obj.digestCounter++, defaults.enzymeId, defaults.mc);
                cantDeleteWhenOnlyOne();
            })
            .each (function() {
                $(this).button({icon: "ui-icon-plus"});
            })
        ;

        container.append("button")
            .attr("type", "button")
            .attr("class", "revertMultiDigestion")
            .text("Revert to Single Enzyme Choice")
            .on ("click", function () {
                extFuncs.revertFunc();
            })
            .each (function() {
                $(this).button({icon: "ui-icon-arrowreturn-1-n"});
            })
        ;

        var digestionList = container.append("ul").attr("class", "sortable digestionList");
        $(digestionList.node()).sortable({disabled: true}).disableSelection();

        /**
        *   Function to remove delete and sort options when only one digestion step is specified
        *   @memberof CLMSUI.jqdialogs
        *   @function
        */
        var cantDeleteWhenOnlyOne = function () {
            var digestItems = digestionList.selectAll("li.digestItem");
            var isSingleItem = (digestItems.size() === 1);
            digestItems.selectAll("button.remove, span.dragSymbol").style("visibility", isSingleItem ? "hidden" : "visible");
            $(digestionList.node()).sortable("option", "disabled", isSingleItem);
        }

        container.select(".addNewDigestion").node().click();
    };

    /**
    *   Function that generates a xisearch multiple digestion string from the contents of the accordion
    *   @memberof CLMSUI.jqdialogs
    *   @function
    *   @param container - d3 selection of container that sequential digestion widget is in
    *   @returns {string} - digestion string in a format recognisable by xi search
    */
    obj.generateMultipleDigestionString = function (container) {
        var digests = [];
        container.selectAll("li.digestItem").each (function () {
            var multipleSelect = d3.select(this).select("select");
            var enzymeID = $(multipleSelect).multipleSelect("getSelects")[0];
            var enzymeDatum = multipleSelect.selectAll("option").filter(function(d) { return d.id === enzymeID; }).datum();
            var isLocalMissedCleavages = d3.select(this).select("input[type='checkbox']").property("checked");
            var localMissedCleavages = isLocalMissedCleavages ? d3.select(this).select(".ui-spinner input").property("value") : undefined;

            var description = "|S|"+enzymeDatum.description;
            description = description.replace(/(?:NAME=([^|]+))/i, "NAME="+enzymeDatum.name);	// make sure name in description matches enzyme name
            var splitPoint = description.indexOf(";NAME");
            if (splitPoint >= 0 && localMissedCleavages !== undefined) {
                description = description.substring(0, splitPoint) + ";MISSEDCLEAVAGES:" + localMissedCleavages + description.substring (splitPoint);
            }
            digests.push (description);
        })

        var string = digests.length > 1 ? "digestion:MultiStepDigest:consecutive" + digests.join("") : "";	// no point in multistep unless it's 2 or more enzymes
        console.log (string);
        return string;
    };

    /**
    *   Function that constructs a populated multiple digestion widget from a xiDB digestion string
    *   @memberof CLMSUI.jqdialogs
    *   @function
    *   @param container - d3 selection of container to build panel in
    *   @param multiDigestionString  - xiDB/search format digestion string
    *   @param enzymes - array of enzyme objects as returned from xiDB
    */
    obj.populateMultipleDigestion = function (container, multiDigestionString, enzymes) {
        container.selectAll("li.digestItem").remove();

        var digestionStrings = multiDigestionString.split("|S|").slice(1);
        var enzymeNameMap = d3.map (enzymes, function(d) { return d.name; });

        digestionStrings.forEach (function (digest, i) {
            var name = digest.match(/(?:NAME=([^|]+))/i)[1];
            var missedCleavages = digest.match(/(?:MISSEDCLEAVAGES:(\d+))/i);
            if (missedCleavages) {
                missedCleavages = missedCleavages[1];
            }

            var enzymeID = enzymeNameMap.get(name) ? enzymeNameMap.get(name).id : null;
            obj.addNewDigestStep (i, enzymeID, missedCleavages);
        });

        obj.digestCounter = digestionStrings.length;
    };

}(CLMSUI.jqdialogs));
