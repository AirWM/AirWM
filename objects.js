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

	this.forEachWindow = function(callback) {
		for( var i=0; i<workspaces.length; ++i ) {
			workspaces[i].forEachWindow(callback);
		}
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

	// The number of pixels between each screen, should be
	// about 10mm
	var margin = parseInt(this.width/this.mm_width * 5);

	this.window_tree = new Container(new Rectangle(margin,margin,this.width-2*margin,this.height-2*margin), null, margin);

	this.addWindow = function( window_id ) {
		this.window_tree.addWindow(window_id);
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
function Container(dimensions, parent, margin) {
	this.dimensions  = dimensions;
	this.tiling_mode = "horizontal";
	this.parent      = parent;
	this.margin      = margin;
	this.children    = [];

	/**
	 * Add a window to this container.
	 * \param window_id The window id of the window
	 */
	this.addWindow = function(window_id) {
		var new_window = new Window(window_id, this);
		this.children.push( new_window );
		this.redraw();
		new_window.show();
	}

	/**
	 * Recalculate the dimensions of the children in this container
	 * and tell them to also redraw. If a child is a window it re-
	 * positions in X.
	 */
	this.redraw = function() {
		if( this.tiling_mode === "horizontal" ) {
			var child_width = parseInt( (this.dimensions.width-(this.children.length-1)*this.margin) / this.children.length);
			for( var i=0; i<this.children.length; ++i ) {
				this.children[i].dimensions.x      = this.dimensions.x + (child_width+this.margin)*i;
				this.children[i].dimensions.y      = this.dimensions.y;
				this.children[i].dimensions.width  = child_width;
				this.children[i].dimensions.height = this.dimensions.height;
				this.children[i].redraw();
			}
		}
		else {
			var child_height = parseInt( (this.dimensions.height-(this.children.length-1)*this.margin) / this.children.length);
			for( var i=0; i<this.children.length; ++i ) {
				this.children[i].dimensions.x      = this.dimensions.x;
				this.children[i].dimensions.y      = this.dimensions.y + (child_height+this.margin)*i;
				this.children[i].dimensions.width  = this.dimensions.width;
				this.children[i].dimensions.height = child_height;
				this.children[i].redraw();
			}
		}
	}

	/**
	 * Remove this container if possible
	 */
	this.remove = function() {
		if( this.parent !== null && this.children.length === 0 ) {
			this.parent.children.splice(this.parent.children.indexOf(this),1);
			if( this.parent.children.length === 0 ) {
				this.parent.remove();
			}
			else {
				this.parent.redraw();
			}
		}
	}

	/**
	 * Execute a function on all windows in this container.
	 */
	this.forEachWindow = function(callback) {
		for( var i=0; i<this.children.length; ++i ) {
			this.children[i].forEachWindow(callback);
		}
	}

	/**
	 * Switches the tiling mode from vertical to horizontal or vice versa
	 */
	this.switchTilingMode = function (){
		if(this.tiling_mode === "horizontal")
			this.tiling_mode = "vertical";
		else
			this.tiling_mode = "horizontal";

		this.redraw();
	}
}

/**
 * A window
 */
function Window(window_id, parent) {
	this.dimensions = new Rectangle(0,0,1,1);
	this.parent     = parent;
	this.window_id  = window_id;

	/**
	 * Show this window, tell X to draw it.
	 */
	this.show = function() {
		global.X.MapWindow( this.window_id );
		// Make sure the window is in the correct position again.
		this.redraw();
	}

	/**
	 * Hide this window, tell X not to draw it.
	 */
	this.hide = function() {
		global.X.UnMapWindow( this.window_id );
	}

	/**
	 * Tell X where to position this window.
	 */
	this.redraw = function() {
		global.X.MoveResizeWindow(
			this.window_id,
			this.dimensions.x,
			this.dimensions.y,
			this.dimensions.width,
			this.dimensions.height
		);
	}

	/**
	 * Destroy this window.
	 */
	this.destroy = function() {
		global.X.DestroyWindow( this.window_id );
		this.remove();
	}

	/**
	 * Remove this window from the parent container, does not
	 * kill the window process.
	 */
	this.remove = function() {
		this.parent.children.splice(this.parent.children.indexOf(this),1);
		if( this.parent.children.length === 0 ) {
			this.parent.remove();
		}
		else {
			this.parent.redraw();
		}
	}

	/**
	 * Execute a function on this window.
	 */
	this.forEachWindow = function(callback) {
		callback( this );
	}
}

// Declare that we want to export the classes defined
// in this file
module.exports.Workspaces = Workspaces;
module.exports.Workspace  = Workspace;
module.exports.Screen     = Screen;
module.exports.Window     = Window;
module.exports.Container  = Container;
