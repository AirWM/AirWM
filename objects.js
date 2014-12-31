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

/**
 * A physical screen in the window manager
 */
function Screen(screen, parent) {
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

/**
 * A container
 */
function Container(dimensions, parent, margin) {
	this.dimensions  = dimensions;
	this.tiling_mode = "horizontal";
	this.parent      = parent;
	this.margin      = margin;
	this.children    = [];

	this.toString = function() {
		var res = "{ Container " + this.tiling_mode + " [ ";
		for( var i=0; i<this.children.length; ++i ) {
			res += this.children[i].toString() + " ";
		}
		res += "] }";
		return res;
	}

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
		if( this.parent instanceof Container && this.children.length === 0 ) {
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

	this.toString = function() {
		return "{ Window " + window_id + " }";
	}

	/**
	 * Helper function to move a window in a direction.
	 *
	 * \param window The window to move.
	 * \param tiling_mode The tiling mode to move the window in.
	 * \param direction The direction to move the window in the array.
	 */
	function move(window,tiling_mode,direction) {
		// Find the container to add the window to
		var previous_container = window;
		var container          = window.parent;
		// Walk up the tree untill we find the root container or the container
		// in which we need to move the window.
		while(
		        // Stop if the parent container isn't a container, this
		        // means the current container is the root container.
		        container.parent instanceof Container &&
		        // Stop if we find a container with the correct tiling mode
		        !(
		            container.tiling_mode === tiling_mode &&
		            // Continue if the container only has 1 child
		            container.children.length !== 1 &&
		            // But continue if we can't move the window downwards in that container
		            !(direction===-1 && container.children.indexOf(previous_container)===0) &&
		            // And also continue if we can't move the window upwards in that container
		            !(direction===+1 && container.children.indexOf(previous_container)===container.children.length-1)
		        )
		     ) {
			previous_container = container;
			container          = container.parent;
		}
		if( container.tiling_mode !== tiling_mode ) {
			// If there is no container with the correct tiling_mode
			// in the path to the root of the tree try to change the
			// tiling_mode, if not possible without affecting other
			// windows create a new root container.
			if( container.children.length === 1 || container.children.length === 2 && container.children.indexOf(previous_container) !== -1 ) {
				container.tiling_mode = tiling_mode;
			}
			else {
				var new_container = new Container(new Rectangle(container.dimensions.x,container.dimensions.y,container.dimensions.width,container.dimensions.height), container.parent, container.margin );
				new_container.tiling_mode = tiling_mode;
				container.parent.window_tree = new_container;
				new_container.children.push(container);

				previous_container = container;
				container          = new_container;
			}
		}
		// At this point we should have in the container variable a
		// container in the correct tiling mode in which to add the
		// window and in previous_container the container in which the
		// window currently resides OR the window itself in the case
		// that the window should be moved directly in it's parent
		// container

		// Get the index of the previous container
		var index = container.children.indexOf(previous_container) + direction;

		// Remove the window from it's original position, this also
		// removes all containers above it that would otherwise become
		// empty because of this.
		window.remove();

		// If this removes the previous container we have to adjust
		// the index
		if( container.children.indexOf(previous_container)!==-1 && direction===-1 ) ++index;

		// If this move would violate container boundaries fix the
		// index variable and make a note of that in the fixed
		// variable so we know that we are just putting the window
		// back and don't accidentally place it in a container next
		// to it.
		var fixed = false
		if( 0 > index ) { index = 0; fixed = true; }
		if( container.children.length < index ) { index = container.children.length; fixed = true; }

		// The index of the neigbor is different from the insertion index
		// if we are moving further into the array.
		var container_index = direction===+1 ? index-1 : index;
		if( !fixed && container.children[container_index] instanceof Container && previous_container===window ) {
			// If we are moving the window past a container on the same level
			// as the window move the window inside of that container instead
			// of past it.
			container.children[container_index].children.push(window);
			window.parent = container.children[container_index];
		}
		else {
			// Otherwise add the window at the index position
			container.children.splice(index,0,window);
			window.parent = container;
		}

		// Recalculate the container
		container.redraw();
	}

	/**
	 * Move the window in a direction.
	 */
	this.moveLeft  = function() { move(this,"horizontal",-1); }
	this.moveRight = function() { move(this,"horizontal",+1); }
	this.moveUp    = function() { move(this,"vertical",  -1); }
	this.moveDown  = function() { move(this,"vertical",  +1); }

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
		global.X.UnmapWindow( this.window_id );
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
