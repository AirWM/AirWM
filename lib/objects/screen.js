/**
 * A physical screen in the window manager
 */
function Screen(screen, parent) {
	var Container = require('./container').Container,
	    Rectangle = require('./rectangle').Rectangle;

	this.root_window_id = screen.root;
	this.width          = screen.pixel_width;
	this.height         = screen.pixel_height;
	this.mm_width       = screen.mm_width;
	this.mm_height      = screen.mm_height;
	this.parent         = parent;

	// The number of pixels between each screen, should be
	// about 10mm
	var margin = parseInt(this.width/this.mm_width * 5);

	this.window_tree = new Container(new Rectangle(margin,margin,this.width-2*margin,this.height-2*margin), this, margin);

	this.toString = function() {
		return "{ Screen " + this.root_window_id + " " + this.window_tree.toString() + " }";
	}

	this.addWindow = function( window_id ) {
		this.window_tree.addWindow(window_id);
	}

	this.switchTilingMode = function(){
		this.window_tree.switchTilingMode();
	}

	this.forEachWindow = function(callback) {
		this.window_tree.forEachWindow(callback);
	}
}

module.exports.Screen = Screen;
