/**
 * Rectangle: represents the location (x,y) and size (width,height) of a container
 */
function Rectangle(x,y,width,height){
	this.x      = x;
	this.y      = y;
	this.width  = width;
	this.height = height;
}

/**
 * The collection of workspaces.
 */
function Workspaces( screens ) {
	var current_workspace = 0;
	var workspaces = [];

	// Create 10 workspaces by default
	for( var i=0; i<10; ++i ) {
		workspaces.push( new Workspace( screens ) );
	}
	workspaces[0].show();

	this.moveTo = function( workspace ) {
		workspaces[current_workspace].hide();
		current_workspace = workspace % workspaces.length;
		workspaces[current_workspace].show();
	}

	this.moveLeft = function() {
		workspaces[current_workspace].hide();
		current_workspace = (current_workspace+workspaces.length-1) % workspaces.length;
		workspaces[current_workspace].show();
	}

	this.moveRight = function() {
		workspaces[current_workspace].hide();
		current_workspace = (current_workspace+1) % workspaces.length;
		workspaces[current_workspace].show();
	}

	this.getCurrentWorkspace = function() {
		return workspaces[current_workspace];
	}
}

/**
 * A workspace in the window manager
 */
function Workspace( screens ) {
	this.screens = [];

	for( var i=0; i<screens.length; ++i ) {
		this.screens.push( new Screen( screens[i] ) );
	}

	// TODO Store a reference to the windows in a map
	// so we can do lookups in ~O(1) via window_id
	//this.window_map = new Map();

	this.addWindow = function(window_id) {
		this.screens[0].addWindow(window_id);
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

/**
 * A physical screen in the window manager
 */
function Screen(screen) {
	this.root_window_id = screen.root;
	this.width          = screen.pixel_width;
	this.height         = screen.pixel_height;
	this.mm_width       = screen.mm_width;
	this.mm_height      = screen.mm_height;

	this.window_tree = null;

	this.addWindow = function( window_id ) {
		if( this.window_tree === null ) {
			this.window_tree = new Window(new Rectangle(0,0,this.width,this.height), window_id, null);
		}
		else {
			this.window_tree.addWindow(window_id);
		}
	}

	this.forEachWindow = function(callback) {
		if( this.window_tree !== null ) {
			this.window_tree.forEachWindow(callback);
		}
	}
}

/**
 * A container
 */
function Container(dimensions, parent) {
	this.dimensions  = dimensions;
	this.tiling_mode = "horizontal";
	this.parent      = parent;
	this.children    = [];

	this.addWindow = function(window_id) {
	}

	this.recalculate = function() {
	}

	this.forEachWindow = function(callback) {
		for( var i=0; i<this.children.length; ++i ) {
			this.children[i].forEachWindow(callback);
		}
	}
}

/**
 * A window
 */
function Window(dimensions, window_id, parent) {
	this.dimensions = dimensions;
	this.parent     = parent;
	this.window_id  = window_id;

	this.addWindow = function(window_id) {
	}

	this.show = function() {
		global.X.MoveResizeWindow( this.window_id, this.dimensions.x, this.dimensions.y, this.dimensions.width, this.dimensions.height);
		global.X.MapWindow( this.window_id );
	}

	this.hide = function() {
		global.X.UnMapWindow( this.window_id );
	}

	this.forEachWindow = function(callback) {
		callback( this );
	}

	// Show this window after creating it
	this.show();
}

// Declare that we want to export the classes defined
// in this file
module.exports.Workspaces = Workspaces;
module.exports.Workspace  = Workspace;
module.exports.Screen     = Screen;
module.exports.Window     = Window;
module.exports.Container  = Container;
