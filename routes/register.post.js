const crypto = require('crypto');

module.exports = function({ res, req, config, htmlBuilder, db, remoteAddr, url }) {
	let data = '';
	req.on('data', d => data += d);
	req.on('end', async () => {
		const form = {};
		for(let i = 0, formArr = data ? data.split('&') : []; i < formArr.length; i++) form[formArr[i].split('=')[0]] = formArr[i].split('=')[1];
		if(Object.keys(form).length !== Object.values(form).length || Object.keys(form).length !== 3 || !form.username || !form.password || !form.email) {
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
		});
	});
}
