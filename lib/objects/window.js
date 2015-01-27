/**
 * A window
 */
function Window(window_id, parent, screen) {
	var Rectangle = require('./rectangle').Rectangle,
	    Container = require('./container').Container;

	this.dimensions = new Rectangle(0,0,1,1);
	this.window_id  = window_id;
	this.parent     = parent;
	this.screen     = screen;

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
		        container.parent instanceof Container.constructor &&
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
				var new_container = new Container(new Rectangle(container.dimensions.x,container.dimensions.y,container.dimensions.width,container.dimensions.height), container.parent, container.screen );
				new_container.tiling_mode    = tiling_mode;
				container.parent.window_tree = new_container;
				container.parent             = new_container;
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

	function moveFocus(window, horizontal, vertical) {
		// Do a dumb search for the adjacent window
		var adj = null;
		window.screen.forEachWindow(function(new_window){
			if( new_window === window ) return;
			var hor = 0, ver = 0;
			if( new_window.dimensions.x + new_window.dimensions.width < window.dimensions.x )  hor = -1;
			if( new_window.dimensions.x > window.dimensions.x + window.dimensions.width )      hor = 1;
			if( new_window.dimensions.y + new_window.dimensions.height < window.dimensions.y ) ver = -1;
			if( new_window.dimensions.y > window.dimensions.y + window.dimensions.height )     ver = 1;
			if( horizontal === hor && vertical == ver ) {
				if( adj === null ) {
					adj = new_window;
				} else {
					if(
						ver === 0 && Math.abs(new_window.dimensions.x-window.dimensions.x) < Math.abs(adj.dimensions.x-window.dimensions.x) ||
						hor === 0 && Math.abs(new_window.dimensions.y-window.dimensions.y) < Math.abs(adj.dimensions.y-window.dimensions.y)
					) {
						adj = new_window;
					}
				}
			}
		});
		if( adj !== null ) {
			global.focus_window = adj;
			global.focus_window.redraw();
			window.redraw();
		}
	}

	/**
	 * Move the focux in a direction.
	 */
	this.moveFocusLeft  = function() { moveFocus(this,-1, 0); }
	this.moveFocusRight = function() { moveFocus(this,+1, 0); }
	this.moveFocusUp    = function() { moveFocus(this, 0,-1); }
	this.moveFocusDown  = function() { moveFocus(this, 0,+1); }

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
	 * Tell X where to position this window and set the
	 * border color.
	 */
	this.redraw = function() {
		var color;
		if( this === global.focus_window ) color = this.screen.focus_color;
		else color = this.screen.normal_color;
		global.X.ChangeWindowAttributes(
			this.window_id,
			{
				borderPixel: color
			}
		);
		global.X.ConfigureWindow(
			this.window_id,
			{
				x:           this.dimensions.x,
				y:           this.dimensions.y,
				width:       this.dimensions.width-2*this.screen.border_width,
				height:      this.dimensions.height-2*this.screen.border_width,
				borderWidth: this.screen.border_width
			}
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
		// Remove this window from the parent container
		this.parent.children.splice(this.parent.children.indexOf(this),1);
		// If the parent container is now empty remove it
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

module.exports.Window = Window;
