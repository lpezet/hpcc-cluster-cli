const winston = require('winston');

function Logger( pConfig ) {
	winston.configure( pConfig );
	var log = function( pLevel, pMessage, pValues) {
		var args = [];
		args.push( pLevel ) ;
		args.push( pMessage );
		if ( pValues && pValues.length >= 0 ) {
			args = args.concat( pValues );
			//args.push( pValues );
		}
		winston.log.apply( winston, args );
	}
	return {
		error: function( pMessage, ...pValues) {
			log( 'error', pMessage, pValues );
		},
		warn: function( pMessage, ...pValues) {
			log( 'warn', pMessage, pValues );
		},
		info: function( pMessage, ...pValues) {
			log( 'info', pMessage, pValues );
			//winston.log( 'info', pMessage, pValues );
		},
		debug: function( pMessage, ...pValues) {
			log( 'debug', pMessage, pValues );
		},
		trace: function( pMethod, pRequestUrl, pBody, pResponseBody, pResponseStatus ) {
		},
		close: function() {
		}
	}
	
}

exports = module.exports = Logger;