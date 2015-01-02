/**
 * A workspace in the window manager
 */
function Workspace( screens ) {
	var Screen = require('./screen').Screen;

	this.screens = [];

	for( var i=0; i<screens.length; ++i ) {
		this.screens.push( new Screen( screens[i], this ) );
	}

	// TODO Store a reference to the windows in a map
	// so we can do lookups in ~O(1) via window_id
	//this.window_map = new Map();

	this.toString = function() {
		var res = "{ Workspace [ ";
		for( var i=0; i<this.screens.length; ++i ) {
			res += this.screens[i].toString() + " ";
		}
		res += "] }";
		return res;
	}

	this.addWindow = function(window_id) {
		this.screens[0].addWindow(window_id);
	}

	this.switchTilingMode = function(){
		this.screens[0].switchTilingMode();
	}

	this.show = function() {
		this.forEachWindow(function(window) {
			window.show();
		});
	}

	this.hide = function() {
		this.forEachWindow(function(window) {
			window.hide();
		});
	}

	this.forEachWindow = function(callback) {
		for( var i=0; i<this.screens.length; ++i ) {
			this.screens[i].forEachWindow(callback);
		}
	}
}

module.exports.Workspace = Workspace;
