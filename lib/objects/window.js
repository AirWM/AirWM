var Rectangle = require('./rectangle').Rectangle;

/**
 * A window
 */
function Window(window_id, parent) {
	this.dimensions = new Rectangle(0,0,1,1);
	this.parent     = parent;
	this.window_id  = window_id;

	/**
	 * Move a window in a direction.
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
		       // Continue while there is a parent container
		       container.parent !== null &&
		       // Continue if the current container only contains 1 child
		       container.children.length !== 1 &&
		       // Continue if the tiling mode isn't correct
		       container.tiling_mode !== tiling_mode &&
		       // Continue if we're moving left and the current window is leftmost in this container
		       !(direction===0 && container.children.indexOf(previous_container)===0) &&
		       // Continue if we're moving right and the current window is rightmost in this container
		       !(direction===1 && container.children.indexOf(previous_container)===container.children.length-1)
		     ) {
			previous_container = container;
			container          = container.parent;
		}
		if( container.tiling_mode !== tiling_mode ) {
			// If there is no container with the correct tiling_mode
			// in the path to the root of the tree try to change the
			// tiling_mode, if not possible without affecting other
			// windows create a new root container.
			if( container.children.length === 1 ) {
				container.tiling_mode = tiling_mode;
			}
			else {
				console.log("No new rooting yet.");
				return;
			}
		}

		// Get the index of the previous container
		var index = container.children.indexOf(previous_container);
		// Remove the window from it's original position
		window.remove();
		// If the previous container doesn't exist anymore
		if( container.children.indexOf(previous_container) === -1 ) {
			if( direction === 0 ) direction = -1;
		}
		index += direction;

		// Correct if the window would move out of the container
		if( index < 0 ) index = 0;
		if( index >= container.children.length ) index = container.children.length;

		// Add the window to the new position
		container.children.splice(index,0,window);
		window.parent = container;

		// Recalculate the container
		container.redraw();
	}

	/**
	 * Move the window in a direction.
	 */
	this.moveLeft  = function() { move(this,"horizontal",0); }
	this.moveRight = function() { move(this,"horizontal",1); }
	this.moveUp    = function() { move(this,"vertical",  0); }
	this.moveDown  = function() { move(this,"vertical",  1); }

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

module.exports.Window = Window;
