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
const config = require('./config');
const gs = require('ghostscript4js');
const fs = require('fs');
const cwd = process.cwd();

require('net').createServer(async s => {
	const date = Date.now(), remoteAddr = s.remoteAddress.substring(7);
	let r;
	if(!config.allowAll) {
		r = await db.query('SELECT id, username, approved FROM user WHERE activeIp=(?);', remoteAddr);
		if(!r) {
			logger.info(`Dropped document from Not Registered IP ${remoteAddr}.`);
			return s.end('Not Registered.');
		}
		if(!r.approved) {
			logger.info(`Dropped document from Not Approvd Account ${r.id}(${remoteAddr}).`);
			return s.end('Not Approved.');
		}
	} else {
		r = { id: 0 };
	}
	let data = '';
	logger.info(`Saving temporary data file to "${r.id}_${date}"...`);
	s.pipe(fs.createWriteStream(`${cwd}/tmp/${r.id}_${date}`));
	s.on('data', d => data += d);
	s.on('end', () => {
		if(!data.startsWith('%-12345X')) {
			logger.error('This PJL not supported! Please use PS Printer Driver.');
			return;
		}
		if(config.passthru) {
			logger.info(`Saved tmp file from ${r.id}(${remoteAddr}) to "${cwd}/tmp/${r.id}_${date}". Printing...`);
			gs.execute(`-dPrinted -dBATCH -dNOPAUSE -dNOSAFER -dNumCopies=1 -sDEVICE=mswinpr2 -sOutputFile="%printer%${config.printerName}" "${cwd}/tmp/${r.id}_${date}"`).then(() => {
				if(!config.allowAll) db.query('UPDATE user SET printCount=printCount+1 WHERE id=(?);', data.id);
			}).catch(e => {
				logger.error(`Error while print file "${cwd}/tmp/${r.id}_${date}": ${e.stack}`);
			});
		} else {
			logger.info(`Saved tmp file from ${r.id}(${remoteAddr}) to "${cwd}/tmp/${r.id}_${date}". Saving to PDF File...`);
			gs.execute(`-psconv -q -dNOPAUSE -sDEVICE=pdfwrite -o "${cwd}/data/${r.id}_${date}.pdf" -f "${cwd}/tmp/${r.id}_${date}"`).then(() => {
				if(!config.allowAll) db.query('UPDATE user SET pdfCount=pdfCount+1 WHERE id=(?);', r.id);
				logger.info(`Saved document from ${r.id}(${remoteAddr}) to "${cwd}/data/${r.id}_${date}.pdf". Removing tmp file...`);
				fs.unlink(`${cwd}/tmp/${r.id}_${date}`, e => e ? logger.error(`Error while remove tmp file "${cwd}/tmp/${r.id}_${date}": ${e.stack}`) : logger.info(`Removed tmp file "${cwd}/tmp/${r.id}_${date}".`));
			}).catch(e => logger.error(e.stack));
		}
	});
}).listen(9100);
