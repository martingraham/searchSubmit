CLMSUI = CLMSUI || {};
CLMSUI.jqdialogs = CLMSUI.jqdialogs || {};

(function (obj) {

	obj.errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");

	obj.digestCounter = 0;

	obj.multipleDigestionDialog = function (dialogID, data, defaults, updateFunction) {

		console.log ("this2", this, defaults);

		var dialog = obj.addStuffDialog (dialogID, "", "Define Multiple Digestion", "OK", "Cancel", function() {} /*ajaxSubmit*/);
		dialog.dialog ("option", "width", 600);

		var truthy = function (val) {
			return val === 1 || val === 't' || val === 'true' || val === true;
		}

		objs.multipleDigestionInternals (d3.select(dialog[0]), data, defaults, updateFunction);
	};


	obj.makeMultiDigestAccordion = function (containerID, data, defaults, updateFunction) {
		d3.select("#"+containerID)
			.append("div")
			.attr("id", "digestAccordionContainer")
			.attr("class", "digestAccordionContainer")
			.html ("<H3>Multiple Digest Construction</H3><div id='digestAccordionContent'></div>")
		;
		$("#digestAccordionContainer").accordion ({
			collapsible: true,
			heightStyle: "content",
		});

		var content = d3.select("#digestAccordionContent")
			.classed("digestAccordionContent", true)
			.classed("formPart", true)
		;

		obj.multipleDigestionInternals (content, data, defaults, updateFunction);
	};


	obj.multipleDigestionInternals = function (container, data, defaults, updateFunction) {

		container.style ("overflow", "visible");

		var model = {
			digests: [],
		};

		var addNewDigestItem = function (did, enzymeId, localmc) {
			var digestion = digestionList.append("li")
				.attr("id", "digest"+did)
				.attr("class", "ui-state-default digestItem")
				.append("span")
					.attr("class", "horizontalFlex")
			;

			digestion.append("span")
				.attr ("class", "ui-icon ui-icon-arrowthick-2-n-s dragSymbol")
			;

			var digestionOptions = digestion.append("select")
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
			var poplist = singlePopulateOptionList;
			var elem = d3.select(poplist.domid);
			var selElem = d3.select("#"+baseId);

			var selectionChanged = function () {};
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
						selectionChanged ($(selElem.node()), poplist.clickFunc);
					},
					onUncheckAll: function () {
						selectionChanged ($(selElem.node()), poplist.clickFunc);
					},
				})
			;
			$("#"+baseId).multipleSelect("setSelects", [enzymeId]);


			var digestionMissedCleavages = digestion.append("span");
			digestionMissedCleavages
				.append("label")
				.text ("Local MC")
				.append("input")
					.attr("type", "checkbox")
					.each (function () {
						//$(this).checkboxradio({
						//	label: "Local MC"
						//});
					})
					.on ("click", function () {
						var vis = d3.select(this).property("checked");
						digestionMissedCleavages.select(".ui-spinner").style("visibility", vis ? "visible" : "hidden");
					})
			;
			digestionMissedCleavages.append("input")
				.attr("type", "number")
				.property ("value", defaults.mc)
				//.attr("class", "missedCleavages")
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
		}

		var self = this;
		container.append("button")
			.attr("type", "button")
			.attr("class", "addNewDigestion")
			.text("Add New Digestion Step")
			.on ("click", function () {
				addNewDigestItem (obj.digestCounter++, defaults.enzymeId, defaults.mc);
				cantDeleteWhenOnlyOne();
			})
			.each (function() {
				$(this).button();
			})
		;

		var digestionList = container.append("ul").attr("class", "sortable digestionList");
		$(digestionList.node()).sortable({disabled: true}).disableSelection();

		var cantDeleteWhenOnlyOne = function () {
			var digestItems = digestionList.selectAll("li.digestItem");
			var isSingleItem = (digestItems.size() === 1);
			digestItems.selectAll("button.remove, span.dragSymbol").style("visibility", isSingleItem ? "hidden" : "visible");
			$(digestionList.node()).sortable("option", "disabled", isSingleItem);
			//obj.generateMultipleDigestionString (container, data);
		}

		container.select(".addNewDigestion").node().click();
	};
	
	obj.generateMultipleDigestionString = function (container) {
		var digests = [];
		container.selectAll("li.digestItem").each (function () {
			var multipleSelect = d3.select(this).select("select");
			var enzymeID = $(multipleSelect).multipleSelect("getSelects")[0];
			var enzymeDatum = multipleSelect.selectAll("option").filter(function(d) { return d.id === enzymeID; }).datum();
			var isLocalMissedCleavages = d3.select(this).select("input[type='checkbox']").property("checked");
			var localMissedCleavages = isLocalMissedCleavages ? d3.select(this).select(".ui-spinner input").property("value") : undefined;
			
			var description = "|S|"+enzymeDatum.description;
			var splitPoint = description.indexOf(";NAME");
			if (splitPoint >= 0 && localMissedCleavages !== undefined) {
				description = description.substring(0, splitPoint) + ";MISSEDCLEAVAGES:" + localMissedCleavages + description.substring (splitPoint);
			}
			digests.push (description);
		})
		
		var string = digests.length > 1 ? "digestion:MultiStepDigest:consecutive" + digests.join("") : "";	// no point in multistep unless it's 2 or more enzymes
		console.log (string);
		return string;
	}
}(CLMSUI.jqdialogs));