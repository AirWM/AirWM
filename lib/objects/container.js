/**
 * A container
 */
function Container(dimensions, parent, screen) {
	var Window = require('./window').Window

	this.dimensions  = dimensions;
	this.tiling_mode = "horizontal";
	this.parent      = parent;
	this.screen      = screen;
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
		var new_window = new Window(window_id, this, this.screen);
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
			var child_width = parseInt( (this.dimensions.width-(this.children.length-1)*this.screen.margin) / this.children.length);
			for( var i=0; i<this.children.length; ++i ) {
				this.children[i].dimensions.x      = this.dimensions.x + (child_width+this.screen.margin)*i;
				this.children[i].dimensions.y      = this.dimensions.y;
				this.children[i].dimensions.width  = child_width;
				this.children[i].dimensions.height = this.dimensions.height;
				this.children[i].redraw();
			}
		}
		else {
			var child_height = parseInt( (this.dimensions.height-(this.children.length-1)*this.screen.margin) / this.children.length);
			for( var i=0; i<this.children.length; ++i ) {
				this.children[i].dimensions.x      = this.dimensions.x;
				this.children[i].dimensions.y      = this.dimensions.y + (child_height+this.screen.margin)*i;
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
		if( this.parent instanceof Container ) {
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
	 * Try to merge this container upwards.
	 */
	this.merge = function() {
		if( this.parent instanceof Container ) {
			this.parent.children.splice(
				this.parent.children.indexOf(this),
				1,
				this.children[0]);
			this.children[0].parent = this.parent;
			if( this.parent.children.length === 1 ) {
				this.parent.merge();
			}
			else {
				this.parent.redraw();
			}
		}
		else {
			this.redraw();
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

module.exports.Container = Container;
