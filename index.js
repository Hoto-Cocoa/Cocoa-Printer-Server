const fs = require('fs');
const cwd = process.cwd();
const Logger = require('winston'), logger = Logger.createLogger({
	format: Logger.format.combine(
		Logger.format.splat(),
		Logger.format.simple(),
		Logger.format.timestamp(),
		Logger.format.printf(info => { return `[${info.timestamp}] [${info.level}] ${info.message}`; })
	),
	levels: Logger.config.syslog.levels,
	transports: [
		new Logger.transports.Console({ level: 'debug' }),
		new Logger.transports.File({ filename: 'debug.log', level: 'debug' }),
		new Logger.transports.File({ filename: 'info.log', level: 'info' }),
		new Logger.transports.File({ filename: 'error.log', level: 'error' })
	]
});

fs.exists(`${cwd}/data`, r => r || fs.mkdir(`${cwd}/data`, e => e ? logger.error(`Failed to create data directory.\nStack: ${e.stack}`) : logger.notice('Created data directory.')));
fs.exists(`${cwd}/tmp`, r => r || fs.mkdir(`${cwd}/tmp`, e => e ? logger.error(`Failed to create tmp directory.\nStack: ${e.stack}`) : logger.notice('Created tmp directory.')));

require('./ipp-server');
require('./http-server');
require('./snmp-server');
