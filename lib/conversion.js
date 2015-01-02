var logger = require('./logger').logger;

module.exports.buildKeyMap = function(list, min){
	logger.debug("Building KeySymbol to KeyCode Map.");
	ks2kc = {};
	for(var k in list){
		for(var m in list[k]){
			ks2kc[list[k][m]] = parseInt(k)+min;
		}
	}
	return ks2kc;
}

module.exports.translateModifiers = function(sModifier){
	logger.debug("Translating modifier string, '%s', to int.", sModifier);
	switch(sModifier){
		case "super":
			return 64;
		default:
			return 0;
	}
}

