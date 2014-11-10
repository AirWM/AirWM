var x11 = require('x11');

var X;

var windows = [];

x11.createClient(function(err, display) {
	X = display.client;

	// By adding the substructure redirect you become the window manager.
	X.ChangeWindowAttributes(display.screen[0].root, { eventMask: x11.eventMask.SubstructureRedirect }, function(err) {
		console.error(err);
	});
}).on('error', function(err) {
	console.error(err);
}).on('event', function(ev) {
	console.log(ev);
	if( ev.type === 20 ) {
		// Record that this window exists
		windows.push( ev.wid );

		// Tell X to map this window
		X.MapWindow( ev.wid );

		// Update all windows
		for( var i=0; i<windows.length; i++ ) {
			var window_width = parseInt(800.0 / windows.length);
			var margin = 10;
			X.MoveResizeWindow(
				windows[i],
				window_width * i+margin,
				0+margin,
				window_width-2*margin,
				600-2*margin );
		}
	}
});
