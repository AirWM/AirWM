/**
 * A workspace in the window manager
 */
function Workspace( screens ) {
	var Screen = require('./screen').Screen;

	this.screens      = [];
	this.focus_window = null;

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

	this.show = function() {
		if( this.focus_window !== null ) {
			this.focus_window.focus();
		}
		else {
			global.X.SetInputFocus(this.screens[0].root_window_id);
		}
		this.forEachWindow(function(window) {
			window.show();
		});
	}

	this.hide = function() {
		this.forEachWindow(function(window) {
			window.hide();
		});
		this.focus_window = global.focus_window;
	}

	this.forEachWindow = function(callback) {
		for( var i=0; i<this.screens.length; ++i ) {
			this.screens[i].forEachWindow(callback);
		}
	}
}

module.exports.Workspace = Workspace;
