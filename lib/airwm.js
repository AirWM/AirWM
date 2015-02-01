var x11     = require('x11');
var exec    = require('child_process').exec;
var keysym  = require('keysym');
var conversion = require('./conversion');
var logger = require('./logger').logger;

// Load the objects from objects.js
var Workspaces = require('./objects/workspaces').Workspaces,
    Workspace  = require('./objects/workspace').Workspace,
    Screen     = require('./objects/screen').Screen,
    Window     = require('./objects/window').Window,
    Container  = require('./objects/container').Container;

// The workspaces currently available
var workspaces;

// The available key shortcuts that are known
var config = require("../config/config");
var programs = config.startup_applications
var keybindings = config.keybindings

var eventMask = {
	// node-x11/lib/eventmask.js
	// https://github.com/sidorares/node-x11/blob/master/lib/eventmask.js
	// Comment non-required events
	eventMask:  x11.eventMask.KeyPress             |
	            x11.eventMask.KeyRelease           |
	            x11.eventMask.ButtonPress          |
	            x11.eventMask.ButtonRelease        |
	            x11.eventMask.EnterWindow          |
	            x11.eventMask.LeaveWindow          |  // Event Type: 8
	            x11.eventMask.Exposure             |
	            x11.eventMask.StructureNotify      |
	            x11.eventMask.SubstructureNotify   |
	            x11.eventMask.SubstructureRedirect |
	            x11.eventMask.PointerMotion        |
	            x11.eventMask.PointerMotionHint    |
	            x11.eventMask.Button1Motion        |
	            x11.eventMask.Button2Motion        |
	            x11.eventMask.Button3Motion        |
	            x11.eventMask.Button4Motion        |
	            x11.eventMask.Button5Motion        |
	            x11.eventMask.ButtonMotion         |
	            x11.eventMask.KeymapState          | // Event Type: 11
	            x11.eventMask.VisibilityChange     |
	            x11.eventMask.ResizeRedirect       |
	            x11.eventMask.FocusChange          |
	            x11.eventMask.PropertyChange       |
	            x11.eventMask.ColormapChange       |
	            x11.eventMask.OwnerGrabButton
}

var changeWindowAttributeErrorHandler = function(err) {
	if( err.error === 10 ) {
		logger.error("Another Window Manager is already running, AirWM will now terminate.");
	}
	logger.error(err);
	process.exit(1);
}

var grabKeyBindings = function(ks2kc, display){
	logger.debug("Grabbing all the keybindings which are configured to have actions in the config.js file.");
	keybindings.forEach(function(keyConfiguration){
		var keyCode = ks2kc[keysym.fromName(keyConfiguration.key).keysym];
		keyConfiguration.mod = 0;
		for( var i in keyConfiguration.modifier ) {
			keyConfiguration.mod = ( keyConfiguration.mod | conversion.translateModifiers(keyConfiguration.modifier[i]) );
		}
		logger.debug("Grabbing key '%s'.", keyCode);
		// Grab the key with each combination of capslock(2), numlock(16) and scrollock (128)
		var combination = [0,2,16,18,128,130,144,146];
		for( var code in combination ) {
			if( (keyConfiguration.mod&combination[code]) !== 0 ) continue;
			global.X.GrabKey(
				display.screen[0].root,
				0, // Don't report events to the window
				keyConfiguration.mod | combination[code],
				keyCode,
				1, // async pointer mode
				1  // async keyboard mode
			);
		}
	});
}

var errorHandler = function(err){
	logger.error(err);
}

var closeWindowHandler = function(close_id) {
	logger.debug("Closing Window with window id: %s", close_id);
	workspaces.forEachWindow(function(window){
		if(window.window_id === close_id){
			window.destroy();
		}
	});
}

var commandHandler = function(command) {
	logger.info("Launching airwm-command: '%s'.", command);
	switch(command){
		case "Shutdown":
			process.exit(0);
			break;
		case "CloseWindow":
			closeWindowHandler(ev.child);
			break;
		case "SwitchTilingMode":
			if( global.focus_window !== null ) {
				global.focus_window.parent.switchTilingMode();
			}
			break;
		case "MoveWindowLeft":
			if( global.focus_window !== null ) {
				global.focus_window.moveLeft();
			}
			break;
		case "MoveWindowDown":
			if( global.focus_window !== null ) {
				global.focus_window.moveDown();
			}
			break;
		case "MoveWindowUp":
			if( global.focus_window !== null ) {
				global.focus_window.moveUp();
			}
			break;
		case "MoveWindowRight":
			if( global.focus_window !== null ) {
				global.focus_window.moveRight();
			}
			break;
		case "MoveFocusLeft":
			if( global.focus_window !== null ) {
				global.focus_window.moveFocusLeft();
			}
			break;
		case "MoveFocusDown":
			if( global.focus_window !== null ) {
				global.focus_window.moveFocusDown();
			}
			break;
		case "MoveFocusUp":
			if( global.focus_window !== null ) {
				global.focus_window.moveFocusUp();
			}
			break;
		case "MoveFocusRight":
			if( global.focus_window !== null ) {
				global.focus_window.moveFocusRight();
			}
			break;
		case "SwitchWorkspaceRight":
			workspaces.moveRight();
			break;
		case "SwitchWorkspaceLeft":
			workspaces.moveLeft();
			break;
		default:
			break;
	}
}

var execHandler = function(program) {
	logger.info("Launching external application: '%s'.", program);
	exec(program);
}

var keyPressHandler = function(ev){
	logger.debug("KeyPressHandler is going through all possible keybindings.");
	for(var i = 0; i < keybindings.length; ++i){
		var binding =  keybindings[i];
		// Check if this is the binding which we are seeking.
		if(ks2kc[keysym.fromName(binding.key).keysym] === ev.keycode){
			if( (binding.mod&ev.buttons) === binding.mod ){
				if(binding.hasOwnProperty("command")){
					commandHandler(binding.command);
				} else if(binding.hasOwnProperty("program")){
					execHandler(binding.program);
				}
			}
		}
	}
}

var destroyNotifyHandler = function(ev){
	logger.debug("DestroyNotifier got triggered, removing the window that got destroyed.");
	workspaces.forEachWindow(function(window) {
		if( window.window_id === ev.wid ) {
			window.remove();
			if( global.focus_window === window ) {
				global.focus_window = null;
				workspaces.forEachWindow(function(window) {
					global.focus_window = window;
				});
				if( global.focus_window !== null ) global.focus_window.redraw();
			}
		}
	});
}

var mapRequestHandler = function(ev){
	workspaces.getCurrentWorkspace().addWindow( ev.wid );
	if( global.focus_window === null ) {
		workspaces.forEachWindow(function(window){
			if(window.window_id === ev.wid){
				global.focus_window = window;
				window.redraw();
			}
		});
	}
}

var eventHandler = function(ev){
	//logger.debug("Received a %s event.", ev.name);
	if( ev.name === "MapRequest" ) {
		mapRequestHandler(ev);
	} else if ( ev.name === "DestroyNotify" ) {
		destroyNotifyHandler(ev);
	} else if ( ev.name === "KeyPress" ) {
		keyPressHandler(ev);
	} else if ( ev.name === "KeyRelease" ) {
	}
}

var airClientCreator = function(err, display) {
	logger.info("Initializing AirWM client.");
	// Set the connection to the X server in global namespace
	// as a hack since almost every file uses it
	global.X = display.client;

	// Set the focussed window to null
	global.focus_window = null;

	var min_keycode = display.min_keycode;
	var max_keycode = display.max_keycode;
	X.GetKeyboardMapping(min_keycode, max_keycode-min_keycode, function(err, key_list) {
		var ks2kc = conversion.buildKeyMap(key_list,min_keycode);

		// Grab all key combinations which are specified in the configuration file.
		grabKeyBindings(ks2kc,display);
	});

	// Create the workspaces object
	logger.debug("Creating workspaces.");
	workspaces = new Workspaces( display.screen );

	// By adding the substructure redirect you become the window manager.
	logger.info("Registering AirWM as the current Window Manager.");
	global.X.ChangeWindowAttributes(display.screen[0].root,eventMask,changeWindowAttributeErrorHandler);

	// Load the programs that should get started and start them
	logger.info("Launching startup applications.");
	programs.forEach(execHandler);
}

x11.createClient(airClientCreator).on('error', errorHandler).on('event', eventHandler);
