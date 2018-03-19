CLMSUI.jqdialogs.errorDateFormat = d3.time.format ("%-d-%b-%Y %H:%M:%S %Z");

CLMSUI.jqdialogs.digestCounter = 0;

CLMSUI.jqdialogs.multipleDigestionDialog = function (dialogID, data, defaults, updateFunction) {
	
	console.log ("this2", this, defaults);
	
	var dialog = CLMSUI.jqdialogs.addStuffDialog (dialogID, "", "Define Multiple Digestion", "OK", "Cancel", function() {} /*ajaxSubmit*/);
	dialog.dialog ("option", "width", 600);
	
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
	
	
	var truthy = function (val) {
		return val === 1 || val === 't' || val === 'true' || val === true;
	}
	
	CLMSUI.jqdialogs.multipleDigestionInternals (d3.select(dialog[0]), data, defaults, updateFunction);
};


CLMSUI.jqdialogs.makeMultiDigestAccordion = function (containerID, data, defaults, updateFunction) {
	d3.select("#"+containerID).append("div").attr("id", "digestAccordion")
		.html ("<H3>Multiple Digest Construction</H3><div id='digestAccordionContent'></div>")
	;
	$("#digestAccordion").accordion ({
		collapsible: true,
		heightStyle: "content",
	});
	
	var content = d3.select("#digestAccordionContent").classed("multipleDigestAccordion", true);
	
	CLMSUI.jqdialogs.multipleDigestionInternals (content, data, defaults, updateFunction);
};
	

CLMSUI.jqdialogs.multipleDigestionInternals = function (container, data, defaults, updateFunction) {
	
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
			addNewDigestItem (CLMSUI.jqdialogs.digestCounter++, defaults.enzymeId, defaults.mc);
			cantDeleteWhenOnlyOne();
		})
		.each (function() {
			$(this).button();
		})
	;
	
	var digestionList = container.append("ul").attr("class", "sortable digestionList");
	$(digestionList.node()).sortable().disableSelection();
	
	var cantDeleteWhenOnlyOne = function () {
		var digestItems = digestionList.selectAll("li.digestItem");
		digestItems.selectAll("button.remove").style("visibility", digestItems.size() === 1 ? "hidden" : "visible");
	}
	
	container.select(".addNewDigestion").node().click();
	
	var generateString = function () {
		
	}
	
};