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

	var self = this;
	global.X.AllocColor( screen.default_colormap, 0x5E00, 0x9D00, 0xC800, function(err, color) {
		self.focus_color = color.pixel;
	});
	global.X.AllocColor( screen.default_colormap, 0xDC00, 0xF000, 0xF700, function(err, color) {
		self.normal_color = color.pixel;
	});
	global.X.AllocColor( screen.default_colormap, 0x0C00, 0x2C00, 0x5200, function(err, color) {
		self.alert_color = color.pixel;
	});

	// The number of pixels between each screen, currently hardcoded
	// to 3mm
	this.margin       = parseInt(this.width/this.mm_width * 3);
	// The number of pixels of border around each window, currently
	// hardcoded to 1.5mm
	this.border_width = parseInt(this.width/this.mm_width * 1.5);

	this.window_tree = new Container(new Rectangle(this.margin,this.margin,this.width-2*this.margin,this.height-2*this.margin), this, this);

	this.toString = function() {
		return "{ Screen " + this.root_window_id + " " + this.window_tree.toString() + " }";
	}

	this.addWindow = function( window_id ) {
		this.window_tree.addWindow(window_id);
	}

	this.closeAllWindows = function(){
		var windows = this.window_tree.children;
		if(windows==null){
			return;
		}
		while(windows.length!=0){
			windows[0].destroy();
		}
	}

	this.forEachWindow = function(callback) {
		this.window_tree.forEachWindow(callback);
	}
}

module.exports.Screen = Screen;
