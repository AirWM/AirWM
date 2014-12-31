var Container = require('./container').Container;
var Rectangle = require('./rectangle').Rectangle;
/**
 * A physical screen in the window manager
 */
function Screen(screen) {
	this.root_window_id = screen.root;
	this.width          = screen.pixel_width;
	this.height         = screen.pixel_height;
	this.mm_width       = screen.mm_width;
	this.mm_height      = screen.mm_height;

	// The number of pixels between each screen, should be
	// about 10mm
	var margin = parseInt(this.width/this.mm_width * 5);

	this.window_tree = new Container(new Rectangle(margin,margin,this.width-2*margin,this.height-2*margin), null, margin);

	this.addWindow = function( window_id ) {
		this.window_tree.addWindow(window_id);
	}
	
	this.switchTilingMode = function(){
		this.window_tree.switchTilingMode();
	}

	this.forEachWindow = function(callback) {
		if( this.window_tree !== null ) {
			this.window_tree.forEachWindow(callback);
		}
	}
}

module.exports.Screen = Screen;
