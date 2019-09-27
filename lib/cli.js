const program = require('commander');
const Fs = require('fs');
const { yamlParse, yamlDump } = require('yaml-cfn');
const path = require('path');
const winston = require('winston');
const LoggerClass = require('./winston-logger');
const MainClass = require('./main');

SETTINGS_FILE = path.resolve( process.cwd(), "settings.yml" );
var SETTINGS = null;
if ( Fs.existsSync( SETTINGS_FILE ) ) {
	SETTINGS = yamlParse( Fs.readFileSync( SETTINGS_FILE, {encoding: 'utf8'}) );
}

var logger = null;

exports = module.exports = {
		_run: function( pFunc, pParams ) {
			this._setThingsUp( pParams );
			var oResult = this.mMain.run( pFunc, pParams );
			if ( oResult && oResult['then'] ) {
				//PromiseAll( pPromise ).then( function( data ) { }, function( error ) { console.error( error ); } );
				oResult.then( function( data ) { }, function( error ) { console.error( error ); } );
			} else {
			}
		},
		_setThingsUp: function( pOptions ) {
			try {
				var oTransports = [
					new (winston.transports.File)({ filename: 'hpcc-cluster.log', handleExceptions: true, humanReadableUnhandledException: true }),
		            new winston.transports.Console()
		        ];
				var oLevel = 'info';
				
				if ( pOptions && pOptions.parent && pOptions.parent.logLevel ) {
					console.log('LogLevel=' + pOptions.parent.logLevel);
					oLevel = pOptions.parent.logLevel;
				}
				
				var loggerConfig = {
					level: oLevel,
					transports: oTransports
				};
				
				logger = new LoggerClass( loggerConfig );
				
				//console.log('logger config=');
				//console.dir( loggerConfig );
				this.mMain = new MainClass( logger );
			} catch(e) {
				console.error(e);
				throw e;
			}
		},
		init: function( args ) {
			var that = this;
			program
				.version('1.0.3')
				.description('For manual, use man hpcc-cluster')
				.option('-l, --logLevel <logLevel>', 'Specify log level', 'info')
				.option('-p, --profile <profile>', 'Specify AWS Configuration Profile to use.', 'hpcc-cluster')
				.option('-r, --region <region>', 'Specify AWS region to use', 'us-east-1');
			
			program
				.command('init')
				.description('Initialize cluster configuration.')
				.option("-f, --force", "Force initilization even if existing configuration exists.", false)
				.action(function(options){
					options.force = options.force || false;
					that._run( 'init', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.init, [ null, options ] );
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.init( CONFIG_FILE_PATH, options ) );
				});
			
			program
				.command('up')
				.alias('create')
				//.alias('update')
				.description('Create new cluster or Update existing cluster based on configuration.')
				.action(function(options){
					that._run( 'create', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.create, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.create( oClusterConfig, options ) );
				});
			
			program
				.command('create-spot')
				//.alias('update')
				.description('Create new cluster (spot fleet) or Update existing cluster based on configuration.')
				.action(function(options){
					that._run( 'create-spot', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.create, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.create( oClusterConfig, options ) );
				});
			
			program
				.command('validate')
				.description('Validate template using cluster configuration. This is mostly for debugging purposes when updating the cluster template/configuration.')
				.action(function(options){
					that._setThingsUp( options );
					that._closure( that.mMain.run( 'validate', options ) );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.validate, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.create( oClusterConfig, options ) );
				});
			
			program
				.command('resume')
				//.alias('start')
				.description('Resume cluster previously halted.')
				.action(function(options){
					that._run( 'resume', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.resume, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.resume( oClusterConfig, options ) );
				});
			
			program
				.command('halt')
				//.alias('stop')
				.description('Halt current cluster. Cluster can be resumed thereafter.')
				.action(function(options){
					that._run( 'halt', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.halt, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.halt( oClusterConfig, options ) );
				});
			
			program
				.command('destroy')
				.alias('terminate')
				.description('Destroy current cluster. Cluster CAN NOT be stopped nor resumed thereafter.')
				.action(function(options){
					that._run( 'destroy', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.destroy, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.destroy( oClusterConfig, options ) );
				});
			
			program
				.command('status')
				.description('Display status of current cluster.')
				.action(function(options){
					that._run( 'status', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.status, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.status( oClusterConfig, options ) );
				});
			
			program
				.command('help')
				.description('Display help.')
				.action(function(options){
					program.help();
				});
			
			/*
			program
				.command('list')
				.description('List resources of current cluster. (NOT IMPLEMENTED)')
				.action(function(options){
					that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.list, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.list( oClusterConfig, options ) );
				});
			*/
			
			program
				.command('push')
				.description('Push local file to cluster (NOT IMPLEMENTED)')
				.option("-s, --source <file>", "Local file to push to cluster node.")
				.option("-t, --target <path>", "Path to push local file to.")
				.option("--ip <ip_address>", "Ip address of node in cluster. If omitted, Master will be used.")
				.action(function(options){
					//winston.level = options.parent.debug;
					console.error('TODO!');
				});
			
			program
				.command('estimate')
				.description('Estimate the costs of your current configuration.')
				.action(function(options){
					that._run( 'estimate', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.estimate, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program
				.command('eclwatch')
				.description('Open ECL Watch page.')
				.action(function(options){
					that._run( 'eclwatch', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.ecl_watch, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program
				.command('run <target> <cmd>')
				.description('Run command in target(s). Example: run slave* "sudo resize2fs /dev/xvdf".')
				.option("--pty", "Allocate pty. Useful for use of nohup and &.")
				.action(function(target, cmd, options){
					options['target'] = target;
					options['cmd'] = cmd;
					options.pty = options['pty'] || false;
					that._run( 'run', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.run, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			
			program
				.command('hpcc-init <cmd> [ip_or_node]')
				.description('HPCC Cluster itself. Possible commands: start, stop, restart, status, stopAll (stops dafilesrv as well) and update which stops cluster, copy source/environment.xml file and push to all cluster.')
				//.option("--ip <ip_address>", "Public IP Address of master node.")
				.action(function(cmd, ip_or_node, options){
					options['cmd'] = cmd;
					options['target'] = ip_or_node;
					that._run( 'hpcc-init', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.hpcc_init, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program
				.command('configmgr [ip_or_node]')
				.description('Start/Stop HPCC Config Manager')
				//.option("--ip <ip_address>", "Public IP Address of master node.")
				.action(function(ip_or_node, options){
					options['target'] = ip_or_node;
					that._run( 'configmgr', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.configmgr, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program
				.command('ssh [ip_or_node]')
				.description('SSH into node of current cluster')
				//.option("--ip <ip_address>", "Public IP Address of node from current cluster.")
				.action(function(ip_or_node, options){
					options['target'] = ip_or_node;
					that._run( 'ssh', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.ssh, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program
				.command('scp <source> <target>')
				.description('SCP files from/to node. Just prefix remote with ":", like "scp local_file.txt @1.2.3.4:/tmp/remote_file.txt". User will be injected automatically.')
				//.option("--ip <ip_address>", "Public IP Address of node from current cluster.")
				.action(function(source, target, options){
					options['target'] = target;
					options['source'] = source;
					that._run( 'scp', options );
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.scp, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
				
			program
				.command('test')
				.description('Test')
				//.option("--ip <ip_address>", "Public IP Address of node from current cluster.")
				.action(function(options){
					//that._run_command( pHpccClusterClass, pHpccClusterClass.prototype.test, [ oClusterConfig, options ]);
					//winston.level = options.parent.debug;
					//closure( oHPCCCluster.ssh( oClusterConfig, options ) );
				});
			
			program.parse( process.argv );
			
			if (!program.args.length) {
				program.help();
				return;
			}
		}
}