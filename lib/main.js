const Fs = require('fs');
const path = require('path');
const util = require('util');
const AWS = require('aws-sdk');

const { yamlParse } = require('yaml-cfn');

const HandlerClass = require('@lpezet/hpcc-cluster/lib/handler');
const HandlerChainClass = require('@lpezet/hpcc-cluster/lib/handlerChain');
const HPCCClusterUtilsClass = require('@lpezet/hpcc-cluster/lib/utils');
const HPCCClusterUtils = new HPCCClusterUtilsClass();
const SSHClientClass = require('@lpezet/hpcc-cluster/lib/ssh-client');
const SSHClient = new SSHClientClass();
const CloudClientClass = require('@lpezet/hpcc-cluster/lib/cloud');

const CONFIG_FILE_PATH = process.cwd();
const CLUSTER_CONFIG_FILE = path.resolve( CONFIG_FILE_PATH, "cluster.config");
const MY_CONFIG_FILE = path.resolve( CONFIG_FILE_PATH, "my.config");
const WORK_DIR = path.resolve( process.cwd(), ".hpcc-cluster/");

var mClusterConfig = null;
if ( Fs.existsSync( CLUSTER_CONFIG_FILE ) ) {
	mClusterConfig = yamlParse( Fs.readFileSync( CLUSTER_CONFIG_FILE, {encoding: 'utf8'}) );
}
if ( mClusterConfig && Fs.existsSync( MY_CONFIG_FILE ) ) {
	var oMyConfig = yamlParse( Fs.readFileSync( MY_CONFIG_FILE, {encoding: 'utf8'}) );
	for (i in oMyConfig ) {
		mClusterConfig[i] = oMyConfig[i];
	}
}

class AWSErrorHandler extends HandlerClass {
	doHandle( pError, pPromise, pHandlerChain ) {
		//console.log('AWSErrorHandler!!!');
		if ( pError && pError["code"] ) {
			this.doHandleAWSError( pError, pPromise, pHandlerChain );
		}
		pHandlerChain.doHandle( pError, pPromise );
	};
	
	
	doHandleAWSError( pError, pPromise, pHandlerChain ) {
		switch (pError["code"]) {
			case "ExpiredToken":
				console.error( "AWS session token expired. Please generate new session token before trying again.");
				break;
			case "AccessDeniedException":
				console.error( "Current user may not be authorized to perfrom certain operations. Check log file for more details.");
				break;
			default:
				console.error( pError );
			break;
		}
	}
};

class DefaultErrorHandler extends HandlerClass {
	doHandle( pError, pPromise, pHandlerChain ) {
		console.log('DefaultErrorHandler!!!');
		console.log( pError );
		//winston.log('error', pError);
		if ( pPromise ) pPromise.reject( pError );
		// Assumption is this is the last error handler.
	}
}

const HPCCClusterClass = require('@lpezet/hpcc-cluster/lib/hpcc-cluster');
/*
var register_mod = function( pETL, pMod, pSettings) {
	var Class = require( pMod );
	var Factory = Class.bind.apply(Class, [ null, pETL, pSettings ] );
	return new Factory();
}
*/

var loadConfig = function() {
	const CONFIG_FILE_PATH = process.cwd();
	const CLUSTER_CONFIG_FILE = path.resolve( CONFIG_FILE_PATH, "cluster.config");
	const MY_CONFIG_FILE = path.resolve( CONFIG_FILE_PATH, "my.config");


	var oClusterConfig = null;
	if ( Fs.existsSync( CLUSTER_CONFIG_FILE ) ) {
		oClusterConfig = yamlParse( Fs.readFileSync( CLUSTER_CONFIG_FILE, {encoding: 'utf8'}) );
	}
	if ( oClusterConfig && Fs.existsSync( MY_CONFIG_FILE ) ) {
		oMyConfig = yamlParse( Fs.readFileSync( MY_CONFIG_FILE, {encoding: 'utf8'}) );
		for (i in oMyConfig ) {
			oClusterConfig[i] = oMyConfig[i];
		}
	}
	
	return oClusterConfig;
}



var logger = null;

MainClass = function( pLogger, pSettings ) {
	logger = pLogger;
	var oErrorHandler = new HandlerChainClass( [ new AWSErrorHandler(), new DefaultErrorHandler() ] );
	this.mHPCCCluster = new HPCCClusterClass( pLogger, oErrorHandler);
	this.mSettings = pSettings;
	this.setup();
};


MainClass.prototype._createAWSClients = function( pConfig, pOptions ) {
	try {
		var oCredsConfig = {};
		if ( pConfig && pConfig['AWS'] && pConfig['AWS']['Profile'] ) {
			oCredsConfig = { profile: pConfig['AWS']['Profile'] };
			logger.debug('Using profile from configuration: [%s]', oCredsConfig.profile);
		} else if ( pOptions && pOptions.parent && pOptions.parent.profile ) {
			oCredsConfig = { profile: pOptions.parent.profile };
			logger.debug('Using profile from options: [%s]', oCredsConfig.profile);
		}
		var oUpdate = {};
		if ( pConfig && pConfig['AWS'] && pConfig['AWS']['Region'] ) {
			oUpdate = { region: pConfig['AWS']['Region'] };
			logger.debug('Using region from configuration: [%s]', oUpdate.region);
		} else if ( pOptions && pOptions.parent && pOptions.parent.region ) {
			oUpdate = { region: pOptions.parent.region };
			logger.debug('Using region from configuration: [%s]', oUpdate.region);
		}
		var oCredentials = new AWS.SharedIniFileCredentials( oCredsConfig );
		AWS.config.update( oUpdate );
		AWS.config.credentials = oCredentials;

		var CF = new AWS.CloudFormation();
		var S3 = new AWS.S3();
		var EC2 = new AWS.EC2();
		var IAM = new AWS.IAM();
		var SSM = new AWS.SSM();
		
		return {
			ec2: EC2,
			s3: S3,
			iam: IAM,
			ssm: SSM,
			cf: CF
		};
	} catch ( e ) {
		logger.error( e );
	}
};

MainClass.prototype.setup = function() {
	// CloudClient and all base on pSettings
	//....
	var oConfig = loadConfig();
	const oAWSClients = this._createAWSClients( oConfig );
	const oCloudClient = new CloudClientClass( logger, oAWSClients );

	new (require('@lpezet/hpcc-cluster/lib/mods/configmgr'))( this.mHPCCCluster, logger, HPCCClusterUtils, SSHClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/create'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/destroy'))( this.mHPCCCluster, logger );
	new (require('@lpezet/hpcc-cluster/lib/mods/ecl_watch'))( this.mHPCCCluster, logger, HPCCClusterUtils );
	new (require('@lpezet/hpcc-cluster/lib/mods/halt'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/hpcc_init'))( this.mHPCCCluster, logger, HPCCClusterUtils, SSHClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/init'))( this.mHPCCCluster, logger );
	new (require('@lpezet/hpcc-cluster/lib/mods/resume'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/run'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient, SSHClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/scp'))( this.mHPCCCluster, logger, HPCCClusterUtils, SSHClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/ssh'))( this.mHPCCCluster, logger, HPCCClusterUtils, SSHClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/status'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	new (require('@lpezet/hpcc-cluster/lib/mods/validate'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	
	new (require('@lpezet/hpcc-cluster/lib/mods/create_spot'))( this.mHPCCCluster, logger, HPCCClusterUtils, oCloudClient );
	//new (require('@lpezet/hpcc-cluster/lib/mods/etl'))( this.mHPCCCluster, logger, HPCCClusterUtils );
	
}

MainClass.prototype.mod = function( pKey, pSource, pFn ) {
	this.mHPCCCluster.mod( pKey, pSource, pFn );
	//this[ pKey ] = mHPCCCluster[ pKey ];
}

MainClass.prototype._handle_error = function( pError, pReject ) {
	logger.error('Unexpected error.', pError );
	if ( pReject ) pReject( pError );
}

MainClass.prototype.run = function( pFn, pParameters ) {
	//console.log('Parameters=');
	//console.dir(pParameters);
	//return this.mHPCCCluster[pFn].apply( this.mHPCCCluster, mClusterConfig, pParameters);
	return this.mHPCCCluster[pFn](mClusterConfig, pParameters);
}
/*
MainClass.prototype._create_file = function( pOutputFilename, pTemplateFilename, pResolve, pReject ) {
	try {
		var oResolvedTemplateFilename = path.resolve(__dirname, pTemplateFilename);
		var oResolvedOutputFilename = path.resolve(process.cwd(), pOutputFilename);
		Fs.readFile( oResolvedTemplateFilename, {encoding: 'utf8'}, function( err, data) {
			if ( err ) {
				this._handle_error( err, pReject );
			} else {
				try {
					Fs.writeFile( oResolvedOutputFilename, data, {encoding: 'utf8'}, function( err2 ) {
						if ( err2 ) {
							that._handle_error( err2, pReject );
						} else {
							logger.info('File %s created.', oResolvedOutputFilename);
							//console.log('Settings file created.');
							pResolve();
						}
					});
				} catch (e) {
					this._handle_error( e, pReject );
				}
				
				
			}
		});
	} catch ( e ) {
		this._handle_error( e, pReject );
	}
};

MainClass.prototype.init = function( pParameters ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oSettintgsFile = path.resolve( process.cwd(), 'settings.yml');
		if ( Fs.existsSync( oSettintgsFile ) && ! pParameters.force ) {
			var oErrorMsg = ['File %s already exists. Use argument -f to force initialization (and file will be overwritten).', oSettintgsFile ];
			console.error( util.format.apply(null, oErrorMsg ) )
			logger.error(oErrorMsg );
			reject( oErrorMsg );
		} else {
			var generate_settings_file = function() {
				return new Promise( function( resolve, reject ) {		
					that._create_file( 'settings.yml', 'templates/settings.yml', resolve, reject );
				});
			};
			
			var generate_sample_etl_file = function() {
				return new Promise( function( resolve, reject ) {		
					that._create_file( 'etl.yml', 'templates/etl.sample.yml', resolve, reject );
				});
			};
			
			generate_settings_file().then(function() {
				return generate_sample_etl_file();
			}).then(function() {
				resolve();
			}, function( pError ) {
				reject( pError );
			})
		}
	});
};

MainClass.prototype._validate_settings = function( pSettings ) {
	if ( ! pSettings || !pSettings['etl'] || !pSettings['etl']['executor'] ) {
		logger.error('Settings must be specified. Edit settings.yml and configure at least etl.executor and run command again.');
		process.exit();
	}
	if ( !pSettings['executors'] || ! pSettings['executors'][ pSettings['etl']['executor'] ]  ) {
		logger.error('Executor configuration missing. Please provide "executors:" configuration in settings.yml.');
		process.exit();
	}
}

MainClass.prototype.run = function( pSettings, pETLActivities, pParameters ) {
	this._validate_settings( pSettings );
	var oExecutor = null;
	
	var oExecutorName = pSettings.etl.executor;
	var oExecutorSettings = pSettings.executors[ oExecutorName ];
	switch ( oExecutorSettings.type ) {
		case "local":
			oExecutor = new LocalExecutorClass( oExecutorSettings );
			break;
		case "remote":
			oExecutor = new RemoteExecutorClass( oExecutorSettings );
			break;
		default:
			logger.error('Executor type [%s] not supported.');
			process.exit();
			break;
	}
	var oETL = new ETLClass( oExecutor, pSettings, logger );
	
	register_mod( oETL, '@lpezet/etl-js/lib/commands');
	register_mod( oETL, '@lpezet/etl-js/lib/ecls');
	register_mod( oETL, '@lpezet/etl-js/lib/files');
	register_mod( oETL, '@lpezet/etl-js/lib/mysqlimports');
	register_mod( oETL, '@lpezet/etl-js/lib/mysqls');
	register_mod( oETL, '@lpezet/etl-js/lib/sprays');
	register_mod( oETL, '@lpezet/etl-js/lib/image-charts');
	
	var oETLActivities = pETLActivities;

	if ( pParameters['activities'] ) {
		var oActivitiesMap = {};
		for (var i in pParameters['activities']) {
			var oActivity = pParameters['activities'][i];
			oActivitiesMap[ oActivity ] = true;
		}
		oETLActivities['etl'] = pParameters['activities'];
		logger.warn('Will only run following activities: %s', pParameters['activities']);
	}
	
	logger.info('Running ETL...');
	oETL.process( oETLActivities ).then( function( pResults ) {
		logger.info('Done running ETL.');
		if ( ! pParameters['silent'] ) console.dir( pResults, { depth: null } ); 
	}, function( pError ) {
		logger.error('Error running ETL.', pError);
	});
}
*/
exports = module.exports = MainClass;