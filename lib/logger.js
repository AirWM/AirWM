// Logging
var winston = require('winston');
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({
				timestamp : true,
				colorize : true,
				level : 'info'
			}),
		new (winston.transports.File)({ 
				filename: './logs/airwm.log' 
			})
	]
});

module.exports.logger = logger;
