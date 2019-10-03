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
const gs = require('ghostscript4js');
const fs = require('fs');
const cwd = process.cwd();

const URL = require('url');
const crypto = require('crypto');
const style = {
	table: `table { border-collapse: collapse; width: 100% } td, th { border: 1px solid #DDD; text-align: left; padding: 8px } tr:nth-child(even) { background-color: #DDD }`
};

require('http').createServer(async (req, res) => {
	if(config.passthru) {
		res.statusCode = 410;
		return res.end(htmlBuilder.build('Notice', 'Passthru mode enabled on this server.'));
	} else {
		const url = URL.parse(req.url, true);
		const cookies = {};
		const remoteAddr = (req.connection.remoteAddress.substring(7).startsWith('127') && req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'].split(':')[0] : req.connection.remoteAddress.substring(7);
		for(let i = 0, cookieArr = req.headers.cookie ? req.headers.cookie.split('; ') : []; i < cookieArr.length; i++) cookies[cookieArr[i].split('=')[0]] = cookieArr[i].split('=')[1];
		switch(url.pathname.substring(1)) {
			case '': {
				if(!config.allowAll) {
					if(cookies.auth) {
						const auth = {};
						for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
						const r = await db.query('SELECT id FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
						if(r) {
							res.statusCode = 302;
							res.setHeader('Location', '/list');
							return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
						}
					}
					return res.end(htmlBuilder.build(`Cocoa's Printer Server`, `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> or <a href="/register?return=${Buffer.from(url.pathname).toString('base64')}">register</a> to continue.`));
				} else {
					res.statusCode = 302;
					res.setHeader('Location', '/list');
					return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
				}
			} break;
			case 'login': {
				if(config.allowAll) {
					res.statusCode = 302;
					res.setHeader('Location', '/list');
					return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
				}
				switch(req.method) {
					case 'GET': {
						return res.end(htmlBuilder.build('Login',
							`<form method="POST">
							Username:<br>
							<input id="username" name="username" type="username"><br>
							Password:<br>
							<input id="password" name="password" type="password"><br><br>
							<button type="submit">Login!</button>`
						));
					} break;
					case 'POST': {
						let data = '';
						req.on('data', d => data += d);
						req.on('end', async () => {
							const form = {};
							for(let i = 0, formArr = data ? data.split('&') : []; i < formArr.length; i++) form[formArr[i].split('=')[0]] = formArr[i].split('=')[1];
							if(Object.keys(form).length !== Object.values(form).length || Object.keys(form).length !== 2 || !form.username || !form.password) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Error!', 'Invalid POST Body!'));
							}
							const password = await db.query('SELECT password FROM user WHERE username=(?);', form.username);
							if(!password) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('No such user!', 'No such user! Please check username that you entered.<br>Or <a href="/register">register</a>?'));
							}
							const iv = Buffer.from(password.split('@')[1], 'hex');
							const chiper = crypto.createCipheriv('aes-256-gcm', Buffer.from(config.encryptKey), iv), encrypted = `${Buffer.concat([ chiper.update(form.password), chiper.final() ]).toString('hex')}@${iv.toString('hex')}`;
							if(await db.query('SELECT id FROM user WHERE username=(?) AND password=(?);', form.username, encrypted)) {
								res.setHeader('Set-Cookie', `auth=${Buffer.from(`username=${form.username};password=${encrypted}`).toString('base64')}; HttpOnly`);
								res.setHeader('Location', url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list');
								res.statusCode = 302;
								return res.end(htmlBuilder.build('Redirecting...', `Redirecting to <a href="${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}">${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}</a>...`));
							} else {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Incorrect password!', 'Incorrect password! Please check password that you entered.'));
							}
						});
					} break;
					default: {
						res.statusCode = 404;
						return res.end();
					}
				}
			} break;
			case 'register': {
				if(config.allowAll) {
					res.statusCode = 302;
					res.setHeader('Location', '/list');
					return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
				}
				switch(req.method) {
					case 'GET': {
						return res.end(htmlBuilder.build('Register', `
							<form method="POST">
							Email:<br>
							<input id="email" name="email" type="email"><br>
							Username:<br>
							<input id="username" name="username" type="username"><br>
							Password:<br>
							<input id="password" name="password" type="password"><br><br>
							<button type="submit">Register!</button>
						`));
					} break;
					case 'POST': {
						let data = '';
						req.on('data', d => data += d);
						req.on('end', async () => {
							const form = {};
							for(let i = 0, formArr = data ? data.split('&') : []; i < formArr.length; i++) form[formArr[i].split('=')[0]] = formArr[i].split('=')[1];
							if(Object.keys(form).length !== Object.values(form).length || Object.keys(form).length !== 3 || !form.email || !form.username || !form.password) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Error!', 'Invalid POST Body!'));
							}
							const iv = crypto.randomBytes(16), chiper = crypto.createCipheriv('aes-256-gcm', Buffer.from(config.encryptKey), iv), encrypted = `${Buffer.concat([ chiper.update(form.password), chiper.final() ]).toString('hex')}@${iv.toString('hex')}`;
							db.query('INSERT INTO user(createdAt, email, username, password, activeIp) VALUES((?), (?), (?), (?), (?));', Date.now(), form.email, form.username, encrypted, remoteAddr).then(() => {
								res.setHeader('Set-Cookie', `auth=${Buffer.from(`username=${form.username};password=${encrypted}`).toString('base64')}; HttpOnly`);
								res.setHeader('Location', url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list');
								res.statusCode = 302;
								return res.end(htmlBuilder.build('Redirecting...', `Redirecting to <a href="${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}">${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}</a>...`));
							}).then(async () => {
								const insertId = await db.query('SELECT last_insert_rowid();');
								if(insertId === 1) db.query('UPDATE user SET approved=1 AND admin=1 WHERE id=1;').catch(e => {
									logger.error(`Error while make admin for first user(${req.connection.remoteAddress}): ${e.stack}`);
									res.statusCode = 500;
									return res.end(htmlBuilder.build('Error!', `Error while database query: ${e.message}`));
								})
							}).catch(e => {
								logger.error(`Error while ${req.connection.remoteAddress} registering: ${e.stack}`);
								res.statusCode = 500;
								return res.end(htmlBuilder.build('Error!', `Error while database query: ${e.message}`));
							});
						});
					} break;
					default: {
						res.statusCode = 404;
						return res.end();
					}
				}
			} break;
			case 'updateIp': {
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					const r = await db.query('SELECT id FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!r) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					db.query('UPDATE user SET activeIp=(?) WHERE id=(?)', remoteAddr, r).then(() => {
						res.setHeader('Location', url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list');
						res.statusCode = 302;
						return res.end(htmlBuilder.build('Redirecting...', `Redirecting to <a href="${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}">${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}</a>...`));
					});
				} else {
					res.setHeader('Location', url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list');
					res.statusCode = 302;
					return res.end(htmlBuilder.build('Redirecting...', `Redirecting to <a href="${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}">${url.query.return ? Buffer.from(url.query.return, 'base64').toString() === '/' ? '/list' : Buffer.from(url.query.return, 'base64').toString() : '/list'}</a>...`));
				}
			} break;
			case 'list': {
				let data;
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					data = await db.query('SELECT id, approved, admin, activeIp FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!data.id) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					if(!+data.id) {
						res.statusCode = 400;
						return res.end(htmlBuilder.build('Invalid User ID!', `Please contact to administrator with this error code: E_ID${data.id}`));
					}
				} else {
					data = { id: 0, approved: 1, activeIp: remoteAddr };
				}
				fs.readdir(`${cwd}/data/`, (e, r) => {
					if(e) {
						logger.error(`Error while read user data directory of ${data.id}: ${e.stack}`);
						res.statusCode = 500;
						return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (File_IO)`));
					};
					let filesHtml = [];
					r.forEach(f => {
						f.startsWith(`${data.id}_`) && filesHtml.push(`<tr><td>${new Date(+f.substring(2, f.length - 4)).toISOString()}</td><td><a href="/view?f=${f.substring(0, f.length - 4)}">${f}</a></td><td><a href="/save?f=${f.substring(0, f.length - 4)}&type=pdf">Download</a> | <a href="/print?f=${f.substring(0, f.length - 4)}">Print</a></td>`);
					});
					if(!filesHtml.length) filesHtml.push('<tr><td colspan="3" style="text-align: center">No Files!</td></tr>');
					return res.end(htmlBuilder.build('Listing Files', `
						<table>
						<tr><th style="width: 15%">Date</th><th style="width: 65%">Filename</th><th style="width: 20%">Menu</th>
						${filesHtml.join('')}
						</table>
						<i>Current Timezone: UTC</i><br>
						<i>Account Status: ${data.admin ? 'Admin User (<a href="/admin">Control Panel</a>)' : data.approved ? 'Normal User' : 'Pending Approval'}</i><br>
						<i>Your connection IP: ${remoteAddr}, Allowed Connection IP: ${data.activeIp ? data.activeIp : 'Unconfigured'} ${((req.connection.remoteAddress.substring(7).startsWith('127') && req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'].split(':')[0]  : req.connection.remoteAddress.substring(7)) === data.activeIp ? '(Match)' : '(<a href="/updateIp">Update IP</a>)'}</i><br>
						<i>Made by Hoto-Cocoa. Copyright (C) 2019 Hoto-Cocoa, All Rights Reserved.</i><br>
						<i>This application's code under AGPLv3.0, Full license terms on <a href="https://www.gnu.org/licenses/agpl-3.0.en.html">GNU Site</a>.</i><br>
						<i><a href="/open-source-licenses">Open Source Licenses</a></i>
					`, style.table));
				})
			} break;
			case 'view': {
				const query = url.query;
				let data;
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					data = await db.query('SELECT id, admin FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!data) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					if(!+query.f.split('_')[0] || !+query.f.split('_')[1]) {
						res.statusCode = 400;
						return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: f'));
					}
					if((data.id !== +query.f.split('_')[0]) && !data.admin) {
						res.statusCode = 403;
						return res.end(htmlBuilder.build('Error!', `You hasn't permission to access to file: ${query.f}`));
					}
				} else {
					data = { id: 0, approved: 1, activeIp: remoteAddr };
				}
				fs.exists(`${cwd}/data/${query.f}.pdf`, r => {
					if(r) {
						fs.readFile(`${cwd}/data/${query.f}.pdf`, (e, c) => {
							if(e) {
								logger.error(`Error while read file to "${cwd}/data/${query.f}.pdf" serve content: ${e.stack}`);
								return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (Serve_V)`));
							}
							res.writeHead(200, {
								'Content-Length': Buffer.byteLength(c),
								'Content-Type': 'application/pdf',
							});
							return res.end(c);
						});
					} else {
						res.statusCode = 404;
						return res.end(htmlBuilder.build('Error!', 'No such file!'));
					}
				});
			} break;
			case 'save': {
				const query = url.query;
				let data;
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					data = await db.query('SELECT id, admin FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!data) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					if(query.type !== 'pdf') {
						res.statusCode = 400;
						return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: type'));
					}
					if(!+query.f.split('_')[0] || !+query.f.split('_')[1]) {
						res.statusCode = 400;
						return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: f'));
					}
					if((data.id !== +query.f.split('_')[0]) && !data.admin) {
						res.statusCode = 403;
						return res.end(htmlBuilder.build('Error!', `You hasn't permission to access to file: ${query.f}`));
					}
				}
				fs.exists(`${cwd}/data/${query.f}.pdf`, r => {
					if(r) {
						fs.readFile(`${cwd}/data/${query.f}.pdf`, (e, c) => {
							if(e) {
								logger.error(`Error while read file "${cwd}/data/${query.f}.pdf" to serve content: ${e.stack}`);
								return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (File_IO)`));
							}
							res.writeHead(200, {
								'Content-Length': Buffer.byteLength(c),
								'Content-Type': 'application/pdf',
								'Content-Disposition': `attachment; filename="${query.f}.pdf"`
							});
							return res.end(c);
						});
					} else {
						res.statusCode = 404;
						return res.end(htmlBuilder.build('Error!', 'No such file!'));
					}
				});
			} break;
			case 'print': {
				const query = url.query;
				let data;
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					data = await db.query('SELECT id, admin, approved FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!data) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					if(!+query.f.split('_')[0] || !+query.f.split('_')[1]) {
						res.statusCode = 400;
						return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: f'));
					}
					if(!data.approved) {
						res.statusCode = 403;
						return res.end(htmlBuilder.build('Error!', `You hasn't permission to print to file: ${query.f}`));
					}
					if((data.id !== +query.f.split('_')[0]) && !data.admin) {
						res.statusCode = 403;
						return res.end(htmlBuilder.build('Error!', `You hasn't permission to access to file: ${query.f}`));
					}
				} else {
					data = { id: 0 };
				}
				fs.exists(`${cwd}/data/${query.f}.pdf`, r => {
					if(r) {
						gs.execute(`-dPrinted -dBATCH -dNOPAUSE -dNOSAFER -dNumCopies=1 -sDEVICE=mswinpr2 -sPAPERSIZE=a4 -sOutputFile="%printer%${config.printerName}" "${cwd}/data/${query.f}.pdf"`).then(() => {
							logger.info(`${data.id}(${remoteAddr}) Printed ${query.f}.`);
							if(!config.allowAll) db.query('UPDATE user SET printCount=printCount+1 WHERE id=(?);', data.id);
							return res.end(htmlBuilder.build('Result', `<script>alert('Printed.'); document.location.href='../list';</script>`));
						}).catch(e => {
							logger.error(`Error while print file "${cwd}/data/${query.f}.pdf": ${e.stack}`);
							res.statusCode = 500;
							return res.end(htmlBuilder.build('Error!', `Please contact to administrator with this error code: ${e.code} (GS_Print)`));
						});
					} else {
						res.statusCode = 404;
						return res.end(htmlBuilder.build('Error!', 'No such file!'));
					}
				});
			} break;
			case 'open-source-licenses': {
				return res.end(htmlBuilder.build('Open Source Licenses', `
					<h2>Open Source Licenses List of Cocoa-Printer-Server</h2>
					<p><a href="https://www.ghostscript.com/license.html">Ghostscript - License under AGPL v3.0</a></p>
				`));
			} break;
			case 'admin': {
				if(!config.allowAll) {
					if(!cookies.auth) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					const auth = {};
					for(let i = 0, authArr = cookies.auth ? Buffer.from(cookies.auth, 'base64').toString().split(';') : []; i < authArr.length; i++) auth[authArr[i].split('=')[0]] = authArr[i].split('=')[1];
					const data = await db.query('SELECT id, username, approved, admin FROM user WHERE username=(?) AND password=(?);', auth.username, auth.password);
					if(!data) {
						res.statusCode = 401;
						return res.end(htmlBuilder.build('Need login!', `Please <a href="/login?return=${Buffer.from(url.pathname).toString('base64')}">login</a> to continue.`));
					}
					if(!data.admin || !data.approved) {
						res.statusCode = 403;
						return res.end(htmlBuilder.build('Need permission!', 'Administrator permission needed to access this page.'));
					}
					switch(url.query.action ? url.query.action : '') {
						case '': {
							const userList = await db.queryRaw('SELECT * FROM user;');
							fs.readdir(`${cwd}/data/`, (e, r) => {
								if(e) {
									logger.error(`Error while read user data directory of ${data.id}: ${e.stack}`);
									res.statusCode = 500;
									return res.end(htmlBuilder.build('Error!', `Error code: ${e.code} (File_IO)`));
								};
								let filesHtml = [];
								r.forEach(f => {
									filesHtml.push(`<tr><td>${new Date(+f.substring(2, f.length - 4)).toISOString()}</td><td><a href="/view?f=${f.substring(0, f.length - 4)}">${f}</a></td><td><a href="/save?f=${f.substring(0, f.length - 4)}&type=pdf">Download</a> | <a href="/print?f=${f.substring(0, f.length - 4)}">Print</a></td>`);
								});
								if(!filesHtml.length) filesHtml.push('<tr><td colspan="3" style="text-align: center">No Files!</td></tr>');
								return res.end(htmlBuilder.build(`Cocoa's Printer Server Control Panel`, `
									<h2>Welcome to Cocoa's Printer Server Control Panel!</h2>
									<a href="../list">Return to List</a>
									<table>
										<caption>User List<caption>
										<tr>
											<th>ID</th>
											<th>Date</th>
											<th>Email</th>
											<th>Username</th>
											<th>Approved</th>
											<th>Admin</th>
											<th>Active IP</th>
											<th>PDF Count</th>
											<th>Print Count</th>
										</tr>
										${userList.map(e =>
											`<tr>
												<td>${e.id}</td>
												<td>${new Date(e.createdAt).toISOString()}</td>
												<td>${decodeURIComponent(e.email)}</td>
												<td>${e.username}</td>
												<td>${!!e.approved}${data.id === e.id ? '' : ` (<a href="/admin?action=toggleUserApproved&u=${e.id}">Toggle</a>)`}</td>
												<td>${!!e.admin}${data.id === e.id ? '' : ` (<a href="/admin?action=toggleUserAdmin&u=${e.id}">Toggle</a>)`}</td>
												<td>${e.activeIp}</td>
												<td>${e.pdfCount}</td>
												<td>${e.printCount}</td>
											</tr>`
										).join('')}
									</table>
									<br>
									<table>
										<caption>File List<caption>
										<tr><th style="width: 15%">Date</th><th style="width: 65%">Filename</th><th style="width: 20%">Menu</th>
										${filesHtml.join('')}
									</table>
								`, style.table));
							});
						} break;
						case 'toggleUserApproved': {
							if(!+url.query.u) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: u'));
							}
							if(data.id === +url.query.u) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Result', `<script>alert('You can't change your approved status!'); document.location.href='../admin';</script>`));
							}
							db.query('UPDATE user SET approved = NOT approved WHERE id=(?);', url.query.u).then(() => {
								logger.info(`Admin ${data.username} toggled approved status of ${url.query.u}.`);
								return res.end(htmlBuilder.build('Result', `<script>document.location.href='../admin';</script>`));
							}).catch((e) => {
								logger.error(`Error while toggle user approved status of ${url.query.u}: ${e.stack}`);
								res.statusCode = 500;
								return res.end(htmlBuilder.build('Error!', `Error code: ${e.code} (DB_UPDATE)`));
							});
						} break;
						case 'toggleUserAdmin': {
							if(!+url.query.u) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Error!', 'The needed argument was invalid: u'));
							}
							if(data.id === +url.query.u) {
								res.statusCode = 400;
								return res.end(htmlBuilder.build('Result', `<script>alert('You can't change your admin status!'); document.location.href='../admin';</script>`));
							}
							db.query('UPDATE user SET admin = NOT admin WHERE id=(?);', url.query.u).then(() => {
								logger.info(`Admin ${data.username} toggled admin status of ${url.query.u}.`);
								return res.end(htmlBuilder.build('Result', `<script>document.location.href='../admin';</script>`));
							}).catch((e) => {
								logger.error(`Error while toggle user admin status of ${url.query.u}: ${e.stack}`);
								res.statusCode = 500;
								return res.end(htmlBuilder.build('Error!', `Error code: ${e.code} (DB_UPDATE)`));
							});
						} break;
						default: {
							res.statusCode = 404;
							return res.end();
						}
					}
				} else {
					res.setHeader('Location', '/list');
					res.statusCode = 302;
					return res.end(htmlBuilder.build('Redirecting...', 'Redirecting to <a href="/list">/list</a>...'));
				}
			} break;
			default: {
				res.statusCode = 404;
				return res.end();
			}
		}
	}
}).listen(8080);
