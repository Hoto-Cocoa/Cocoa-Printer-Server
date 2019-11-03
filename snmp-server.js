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

const snmp = require('snmpjs');
const agent = snmp.createAgent({ log: Object.assign(logger, { trace: (data, msg) => logger.debug(msg) })});

agent.request({ oid: '1.3.6.1.4.1.2699.1.2', handler: function (prq) {
	prq._oid = prq._node._oid = '1.3.6.1.4.1.2699.1.2.1.1.1.0';
	prq._addr = prq._node._addr = prq._oid.split('.');
	let val = snmp.data.createData({ type: 'OctetString', value: 'en-US' });
	snmp.provider.readOnlyScalar(prq, val);
}});

agent.request({ oid: '1.3.6.1.2.1.1.1.0', handler: function (prq) {
	let val = snmp.data.createData({ type: 'OctetString', value: 'Microsoft PS Class Driver' });
	snmp.provider.readOnlyScalar(prq, val);
}});

agent.bind({ family: 'udp4', port: 161 });
