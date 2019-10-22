const crypto = require('crypto');

module.exports = function({ res, req, config, htmlBuilder, db, url }) {
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
		const iv = Buffer.from(password.split('@')[1], 'hex'), chiper = crypto.createCipheriv('aes-256-gcm', Buffer.from(config.encryptKey), iv), encrypted = `${Buffer.concat([ chiper.update(form.password), chiper.final() ]).toString('hex')}@${iv.toString('hex')}`;
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
}
