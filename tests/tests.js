function callback () {
	var iframe = $("#searchSubmitPage")[0];
	var iwindow = iframe.contentWindow;
	var iframeDom = $("#searchSubmitPage").contents();
	var model = iwindow.CLMSUI.buildSubmitSearch.model;
	
	
	QUnit.begin (function (details) {
		console.log ("details", details);	
		/*
		var doneLoad = details.async();
		console.log ("waiting for search page sync event");
		model.on ("sync", doneLoad, this);
		*/
	});
	
	QUnit.module ("Base Search", {
		before: function (assert) {
			var doneLoad = assert.async();
			console.log ("waiting for search page sync event");
			model.on ("sync", doneLoad, this);
		}
	});
	
	QUnit.test ("JSON to Model Parsing", function (assert) {
		var expectedModel = {
			"searchName": undefined,
			"ms_tol":"6",
			"ms2_tol":"20",
			"missed_cleavages":"4",
			"ms_tol_unit":"ppm",
			"ms2_tol_unit":"ppm",
			"crosslinkers":["13"],
			"enzyme":"1",
			"ions":["1","2","3"],
			"fixedMods":["1"],
			"varMods":["2","30"],
			"losses":["1","2","4"],
			"xiversion":null,
			"notes":"\nxi-version: 1.6.671",
			"customsettings":"",
			"acquisitions":["2089"],
			"sequences":["203"],
			"privateSearch":false,
			"missedPeaks":"0"
		};
		//console.log (model.toJSON(), expectedModel);
	    assert.propEqual (model.toJSON(), expectedModel, "Expected "+JSON.stringify(expectedModel)+", Passed!");
	});
	
	QUnit.module ("Button Pushing", {
		beforeEach: function (assert) {
			model.set("crosslinkers", ["0"]);
		}
	});
	
	QUnit.test ("Set New Single Crosslinker", function (assert) {
		
		var done = assert.async();
		var expectedCrosslinkers = ["30"];
		console.log ("wheee", iframeDom);
		iframeDom.find("#paramCrossLinker > div > div > button").click();
		setTimeout (function() {
			iframeDom.find("#paramCrossLinker > div > div > div > ul > li:nth-child(5) label").click();
			setTimeout (function () {
				iframeDom.find("#paramCrossLinker > div > div > div > ul > li:nth-child(3) label").click();
				setTimeout (function () {
					assert.deepEqual (model.get("crosslinkers"), expectedCrosslinkers, "Expected "+JSON.stringify(expectedCrosslinkers)+", Passed!");
					done();
				});
			});
		});
	});
	
}

function testSetup (cbfunc) {
	var iframe = $("#searchSubmitPage")[0];
	iframe.onload = cbfunc;
	iframe.src = "../submitSearch.html?base=10003-28709-66718-97705-57359";
}

testSetup (callback);