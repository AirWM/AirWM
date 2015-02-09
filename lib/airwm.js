// External libraries
var fs     = require("fs");
var x11    = require('x11');
var exec   = require('child_process').exec;
var keysym = require('keysym');

// Custom libraries
var conversion = require('./conversion');
var logger     = require('./logger').logger;
// Load the objects
var Workspaces = require('./objects/workspaces').Workspaces,
    Workspace  = require('./objects/workspace').Workspace,
    Screen     = require('./objects/screen').Screen,
    Window     = require('./objects/window').Window,
    Container  = require('./objects/container').Container;

// The workspaces currently available
var workspaces;

// The available key shortcuts that are known
var config      = require("../config/config");
var programs    = config.startup_applications
var keybindings = config.keybindings

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

var closeAllWindows = function(close_id) {
	logger.info("Closing all windows.");
	var screens = workspaces.getCurrentWorkspace().screens;
	for(var i in screens){
		screens[i].closeAllWindows();
	}
}


// when all windows have been closed, set the focus to the root window
var setFocusToRootIfNecessary = function(){
	var screen = workspaces.getCurrentWorkspace().screens[0];
	if(screen.window_tree.children.length === 0){
		logger.info("Setting focus to the root window");
		global.X.SetInputFocus(screen.root_window_id);
	}
}

var commandHandler = function(command) {
	logger.info("Launching airwm-command: '%s'.", command);
	switch(command){
		case "Shutdown":
			closeAllWindows();
			process.exit(0);
			break;
		case "CloseWindow":
			if( global.focus_window !== null ) {
				global.focus_window.destroy();
				var w = null;
				workspaces.forEachWindow(function(window) {
					w = window;
				});
				if( w !== null ) w.focus();
				
				setFocusToRootIfNecessary();
			}
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
			if( (ev.buttons&(~146)) === binding.mod ){
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
				var w = null;
				workspaces.forEachWindow(function(window) {
					w = window;
				});
				if( w !== null ) w.focus();
			}
		}
	});
	setFocusToRootIfNecessary();
}

var mapRequestHandler = function(ev){
	global.X.GetWindowAttributes(ev.wid, function(err, attributes) {
		// Don't manage a window when a redirect-override flag is set.
		// (don't create windows for small popups e.g. firefox search history)
		if (attributes[8])
		{
			global.X.MapWindow(ev.wid);
			return;
		}
	});
	global.X.ChangeWindowAttributes(
		ev.wid,
		{ eventMask: x11.eventMask.EnterWindow }
	);
	workspaces.getCurrentWorkspace().addWindow( ev.wid );
	if( global.focus_window === null ) {
		workspaces.forEachWindow(function(window){
			if(window.window_id === ev.wid){
				window.focus();
			}
		});
	}
}

var eventHandler = function(ev){
	logger.debug("Received a %s event.", ev.name);
	switch( ev.name ) {
	case "ConfigureRequest":
		// Allow requested resize for optimization. Window gets resized
		// automatically by AirWM again anyway.
		X.ResizeWindow(ev.wid, ev.width, ev.height);
		break
	case "MapRequest":
		mapRequestHandler(ev);
		break;
	case "DestroyNotify":
		destroyNotifyHandler(ev);
		break;
	case "EnterNotify":
		workspaces.forEachWindow(function(window) {
			if( window.window_id === ev.wid ) {
				window.focus();
			}
		});
		break;
	case "KeyPress":
		keyPressHandler(ev);
		break;
	}
}

//creates the logDir directory when it doesn't exist (otherwise Winston fails)
var initLogger = function (logDir){
	if(!fs.existsSync(logDir))
		fs.mkdirSync(logDir);
}

var airClientCreator = function(err, display) {
	initLogger('logs');
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

	var eventMask = {
		eventMask: x11.eventMask.SubstructureNotify   |
		           x11.eventMask.SubstructureRedirect |
		           x11.eventMask.ResizeRedirect
	}

	// By adding the substructure redirect you become the window manager.
	logger.info("Registering AirWM as the current Window Manager.");
	global.X.ChangeWindowAttributes(display.screen[0].root,eventMask,changeWindowAttributeErrorHandler);

	// Load the programs that should get started and start them
	logger.info("Launching startup applications.");
	programs.forEach(execHandler);
}

x11.createClient(airClientCreator).on('error', errorHandler).on('event', eventHandler);
