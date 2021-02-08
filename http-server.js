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
const Database = require('./Database'), db = new Database('data.sqlite3', logger);
const HTMLBuilder = require('./HTMLBuilder'), htmlBuilder = new HTMLBuilder('* { font-family: futura-pt, sans-serif; }', '<link rel="stylesheet" href="https://use.typekit.net/mkg6rly.css">');
const config = require('./config');
const fs = require('fs');
const cwd = __dirname;

const URL = require('url');
const style = {
	table: `table { border-collapse: collapse; width: 100% } td, th { border: 1px solid #DDD; text-align: left; padding: 8px } tr:nth-child(even) { background-color: #DDD }`
};

if(!config.passthru) require('http').createServer(async (req, res) => {
	const url = URL.parse(req.url, true);
	const cookies = {};
	const remoteAddr = ((req.connection.remoteAddress.substring(7).startsWith('127') || req.connection.remoteAddress === '::1') && req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'].split(':')[0] : (req.connection.remoteAddress === '::1') ? '127.0.0.1' :  req.connection.remoteAddress.substring(7);
	for(let i = 0, cookieArr = req.headers.cookie ? req.headers.cookie.split('; ') : []; i < cookieArr.length; i++) cookies[cookieArr[i].split('=')[0]] = cookieArr[i].split('=')[1];
	let data = {};
	if(cookies.auth) {
		const auth = {};
		for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
		data.auth = await db.query('SELECT id, approved, admin, activeIp, username FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
	}
	for(let i = 0; i < url.pathname.substring(1).split('/').length; i++) if(url.pathname.substring(1).split('/')[i].startsWith('.')) return (res.statusCode = 400) & res.end('Bad Request');
	if(url.pathname.substring(1).split('/')[0] === 'api') {
		if(!url.pathname.substring(1).split('/')[1]) {
			res.statusCode = 400;
			res.end('Bad Request');
		}
		fs.exists(`${cwd}/api/${url.pathname.substring(1).split('/')[1]}.${req.method.toLowerCase()}.js`, r => {
			res.setHeader('Content-Type', 'application/json');
			if(r) return require(`${cwd}/api/${url.pathname.substring(1).split('/')[1]}.${req.method.toLowerCase()}.js`)({ req, res, data, config, htmlBuilder, db, style, remoteAddr, url, logger });
			else {
				res.statusCode = 404;
				res.end();
			}
		});
	} else {
		fs.exists(`${cwd}/routes/${url.pathname.substring(1) === '' ? 'index' : url.pathname.substring(1)}.${req.method.toLowerCase()}.js`, r => {
			res.setHeader('Content-Type', 'text/html');
			if(r) return require(`${cwd}/routes/${url.pathname.substring(1) === '' ? 'index' : url.pathname.substring(1)}.${req.method.toLowerCase()}.js`)({ req, res, data, config, htmlBuilder, db, style, remoteAddr, url, logger });
			else {
				res.statusCode = 404;
				res.end();
			}
		});
	}
}).listen(config.httpPort ? config.httpPort : 8080);
