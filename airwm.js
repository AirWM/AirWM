var x11  = require('x11');
var exec = require('child_process').exec;

// Load the objects from objects.js
var Workspaces = require('./objects').Workspaces,
    Workspace  = require('./objects').Workspace,
    Screen     = require('./objects').Screen,
    Window     = require('./objects').Window,
    Container  = require('./objects').Container;

// The workspaces currently available
var workspaces;

// The keys that are currently pressed
var pressed_keys     = [];
// The available key shortcuts that are known
var key_combinations = require("./keys");

x11.createClient(function(err, display) {
	// Set the connection to the X server in global namespace
	// as a hack since almost every file uses it
	global.X = display.client;

	// Create the workspaces object
	workspaces = new Workspaces( display.screen );

	// By adding the substructure redirect you become the window manager.
	// TODO Should we register for all screens?
	global.X.ChangeWindowAttributes(
		display.screen[0].root,
		{
			eventMask: x11.eventMask.SubstructureRedirect |
			           x11.eventMask.SubstructureNotify   |
			           x11.eventMask.KeyPress             |
			           x11.eventMask.KeyRelease
		},
		function(err) {
			if( err.error === 10 ) {
				console.error( "Another window manager is already running" );
			}
			console.error(err);
			process.exit(1);
		}
	);

	// Load the programs that should get started
	// and start them
	var programs = require("./startup");
	programs.forEach(function(curr,ind,arr) { exec(curr) });
}).on('error', function(err) {
	console.error(err);
}).on('event', function(ev) {
	//console.log(ev);
	if( ev.name === "MapRequest" ) {
		workspaces.getCurrentWorkspace().addWindow( ev.wid );
	} else if ( ev.name === "DestroyNotify" ) {
		//window_tree.remove_window( ev.wid );
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
					console.log("Executing command '",curr.program,"'.");
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
