var x11  = require('x11');
var exec = require('child_process').exec;

// The number of pixels between each window and the border
var margin = 10;

// Our connection to the X server
var X;

/**
 * Create a new container in the window tree.
 */
function Container( horizontal, x, y, width, height ) {
	this.horizontal = horizontal;
	this.x          = x;
	this.y          = y;
	this.width      = width;
	this.height     = height;
	this.windows    = [];

	/**
	 * Add a window to this container.
	 * \param wid The window id of the window to add.
	 */
	this.add_window = function(wid) {
		this.windows.push(wid);
		this.recalculate();
	};

	/**
	 * Remove a window from this container.
	 * \param wid The window id of the window to remove.
	 */
	this.remove_window = function(wid) {
		for( var i=0; i<this.windows.length; ++i ) {
			if( typeof this.windows[i] === "number" ) {
				if( this.windows[i] === wid ) {
					this.windows.splice(this.windows.indexOf(wid),1);
					this.recalculate();
				}
			}
			else {
				this.windows[i].remove_window(wid);
				if( this.windows[i].windows.length === 0 ) {
					this.windows.splice(i,1);
					this.recalculate();
				}
			}
		}
	};

	/**
	 * Add a container to this container.
	 * \param horizontal If the new container tiles windows horizontally
	 *                   or vertically.
	 * \param wid The window id to turn into a new container.
	 */
	this.add_container = function(horizontal,wid) {
		for( var i=0; i<this.windows.length; ++i ) {
			if( this.windows[i] === wid ) {
				this.windows[i] = new Container( horizontal, 0, 0, 1, 1 );
				this.windows[i].add_window( wid );
				this.recalculate();
				break;
			}
		}
	};

	/**
	 * Recalculate and move all windows of this and all containers
	 * below it to the correct place.
	 */
	this.recalculate = function() {
		if( this.horizontal ) {
			// The width of a window after removing the margins
			var window_width = parseInt((this.width-(this.windows.length-1)*margin) / this.windows.length);
			for( var i=0; i<this.windows.length; ++i ) {
				if( typeof this.windows[i] === "number" ) {
					X.MoveResizeWindow(
						this.windows[i],
						this.x + i*(margin+window_width),
						this.y,
						window_width,
						this.height );
				}
				else {
					this.windows[i].x      = this.x + i*(margin+window_width);
					this.windows[i].y      = this.y;
					this.windows[i].width  = window_width;
					this.windows[i].height = this.height;
					this.windows[i].recalculate();
				}
			}
		}
		else {
			// The height of a window after removing the margins
			var window_height = parseInt((this.height-(this.windows.length-1)*margin) / this.windows.length);
			for( var i=0; i<this.windows.length; ++i ) {
				if( typeof this.windows[i] === "number" ) {
					X.MoveResizeWindow(
						this.windows[i],
						this.x,
						this.y + i*(margin+window_height),
						this.width,
						window_height);
				}
				else {
					this.windows[i].x      = this.x;
					this.windows[i].y      = this.y + i*(margin+window_width);
					this.windows[i].width  = this.width;
					this.windows[i].height = window_height;
					this.windows[i].recalculate();
				}
			}
		}
	};
}

// The container tree with all the windows in it
var window_tree;

var events           = x11.eventMask.SubstructureRedirect|x11.eventMask.SubstructureNotify | x11.eventMask.KeyPress|x11.eventMask.KeyRelease;

var counter          = 0;

// The keys that are currently pressed
var pressed_keys     = [];
// The available key shortcuts that are known
var key_combinations = require("./keys");

x11.createClient(function(err, display) {
	X = display.client;

	window_tree = new Container( true, margin, margin, display.screen[0].pixel_width-2*margin, display.screen[0].pixel_height-2*margin );

	// By adding the substructure redirect you become the window manager.
	X.ChangeWindowAttributes(display.screen[0].root, { eventMask: events }, function(err) {
		if( err.error === 10 ) {
			console.error( "Another window manager is already running" );
		}
		console.error(err);
		process.exit(1);
	});

	// Load the programs that should get started
	// and start them
	var programs = require("./startup");
	programs.forEach(function(curr,ind,arr) { exec(curr) });
}).on('error', function(err) {
	console.error(err);
}).on('event', function(ev) {
	//console.log(ev);
	if( ev.name === "MapRequest" ) {
		// To show that the container works change the second
		// created window into a vertical container and add
		// future windows to that contaner.
		++counter;

		if( counter <= 2 ) {
			// Record that this window exists
			window_tree.add_window( ev.wid );

			if( counter == 2 ) {
				window_tree.add_container( false, ev.wid );
			}
		}
		else {
			window_tree.windows[1].add_window( ev.wid );
		}

		// Tell X to map this window
		X.MapWindow( ev.wid );
	} else if ( ev.name === "DestroyNotify" ) {
		window_tree.remove_window( ev.wid );
		//X.DestroyWindow( ev.wid );
	} else if ( ev.name === "ConfigureRequest" ) {
		// Don't allow them window to resize, we decide
		// how large the window is going to be!
		//X.ResizeWindow(ev.wid, ev.width, ev.height);
	} else if ( ev.name === "KeyPress" ) {
		// Add the pressed key to the list of pressed keys
		pressed_keys.push( ev.keycode );
		console.log( pressed_keys );

		// Foreach known key combination
		key_combinations.forEach( function(curr,ind,arr) {
			// Check if all the needed keys are currently pressed
			if( curr.keys.every(function(curr,ind,arr){
					return pressed_keys.indexOf(curr) !== -1;
				}) ) {
				// Execute the program linked to this shortkey
				if( curr.program ) {
					exec( curr.program );
				}
				if( curr.command ) {
					if( curr.command === "Shutdown" ) {
						console.log( "Shutting down" );
						process.exit(0);
					}
				}
			}
		} );
	} else if ( ev.name === "KeyRelease" ) {
		// Remove the key from list of pressed keys
		pressed_keys.splice(pressed_keys.indexOf(ev.keycode),1);
	}
});
