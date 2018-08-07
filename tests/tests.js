function callback () {
	var iframe = $("#searchSubmitPage")[0];
	var iwindow = iframe.contentWindow;
	var iframeDom = $("#searchSubmitPage").contents();
	var model = iwindow.CLMSUI.buildSubmitSearch.model;
	var initialState = model.toJSON(); 
	

	QUnit.start();
	
	QUnit.module ("Base Search Test", {
		beforeEach: function () {
			model.set (initialState);
		}
	});
	
	QUnit.test ("JSON to Model Parsing", function (assert) {
		var expected = {
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
			"noLoading":true,
			"notes":"\nxi-version: 1.6.671",
			"customsettings":"",
			"acquisitions":["2089"],
			"sequences":["203"],
			"privateSearch":false,
			"missedPeaks":"0"
		};
	    assert.propEqual (model.toJSON(), expected, "Expected "+JSON.stringify(expected)+", Passed!");
	});
	
	QUnit.module ("Button Pushing Tests 1", {
		beforeEach: function () {
			model.set (initialState);
		}
	});
	
	QUnit.test ("Set New Single Crosslinker", function (assert) {
		// tests multiple-select widget is the bug-fixed version
		
		var done = assert.async();
		var expected = ["30"];
		iframeDom.find("#paramCrossLinker > div > div > button").click();	// open crosslinker multiple select panel
		setTimeout (function() {
			iframeDom.find("#paramCrossLinker > div > div > div > ul > li[title='AP1_HA ¦ 290'] label").click();
			setTimeout (function () {
				iframeDom.find("#paramCrossLinker > div > div > div > ul > li[title='-1H ¦ -1'] label").click();
				setTimeout (function () {
					assert.deepEqual (model.get("crosslinkers"), expected, "Expected "+JSON.stringify(expected)+", Passed!");
					done();
				});
			});
		});
	});
	
	
	QUnit.test ("Set New Xi Version", function (assert) {
		// tests multiple-select widget is the bug-fixed version
		
		var doneXV = assert.async();
		var expected = "29";
		iframeDom.find("#paramXiVersion > div > div > button").click();	// open crosslinker multiple select panel
		setTimeout (function() {
			iframeDom.find("#paramXiVersion > div > div > div > ul > li[title='1.6.738'] > label").click();
			setTimeout (function () {
				assert.deepEqual (model.get("xiversion"), expected, "Expected "+JSON.stringify(expected)+", Passed!");
				doneXV();
			});
		});
	});
	
	
	QUnit.test ("Clear and Set 2 New Fixed Mods", function (assert) {
		// tests multiple-select widget is the bug-fixed version
		
		var doneMods = assert.async();
		var expected = ["8", "55"].sort();
		iframeDom.find("#paramFixedMods > div > div > button").click();	// open crosslinker multiple select panel
		setTimeout (function() {
			iframeDom.find("#paramFixedMods > div > div > div button.clearAll").click();
			setTimeout (function () {
				iframeDom.find("#paramFixedMods > div > div > div > ul > li[title='BS3Loop'] > label").click();
				setTimeout (function () {
					iframeDom.find("#paramFixedMods > div > div > div > ul > li[title='Arg6'] > label").click();
					setTimeout (function () {
						var actual = model.get("fixedMods").slice().sort();
						assert.deepEqual (actual, expected, "Expected "+JSON.stringify(expected)+", Passed!");
						doneMods();
					});
				});			
			});
		});
	});
	
}

function testSetup (cbfunc) {
		
	var iframe = $("#searchSubmitPage")[0];
	
	var iframeLoaded = function () {
		var iwindow = iframe.contentWindow;
		var model = iwindow.CLMSUI.buildSubmitSearch.model;
		model.on ("sync", cbfunc, this);
	}
	
	iframe.onload = iframeLoaded;
	iframe.src = "../submitSearch.html?base=10003-28709-66718-97705-57359";
}

testSetup (callback);