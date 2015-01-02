/**
 * A window
 */
function Window(window_id, parent) {
	var Rectangle = require('./rectangle').Rectangle,
	    Container = require('./container').Container;

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
				var new_container = new Container(new Rectangle(container.dimensions.x,container.dimensions.y,container.dimensions.width,container.dimensions.height), container.parent, container.margin );
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

module.exports.Window = Window;
